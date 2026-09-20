/**
 * Markdown content pipeline.
 *
 * Two jobs, both at build/dev time so nothing markdown-related ships to the browser:
 *
 * 1. `virtual:content-index` — every article's frontmatter (no bodies), sorted newest first.
 *    Small enough to live in the main bundle; drives section index pages, footer links,
 *    sitemap, and route resolution.
 * 2. `content/**\/*.md` imports become `{ meta, html }` modules. Each is its own lazy chunk,
 *    so article bodies never weigh on the tool pages.
 *
 * URL = file path under `content/` minus `.md`: `content/guides/nodejs.md` -> `/guides/nodejs`.
 * Frontmatter problems throw with the file path so a bad article fails the build instead of
 * shipping an empty page.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import matter from 'gray-matter';
import { Marked, type Tokens } from 'marked';
import { codeToHtml, bundledLanguages } from 'shiki';
import type { Plugin } from 'vite';

const VIRTUAL_ID = 'virtual:content-index';
const RESOLVED_VIRTUAL_ID = '\0' + VIRTUAL_ID;
const CODE_THEME = 'github-dark-default';

export interface Faq {
  question: string;
  answer: string;
}

export interface ArticleMeta {
  /** Route path, e.g. `/guides/nodejs`. */
  path: string;
  /** First path segment: `blog`, `guides`, `use-cases`; empty string for top-level pages like `/about`. */
  section: string;
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  lastmod: string;
  tags: string[];
  /** Tool routes this article links to; also drives "Further reading" on those tools. */
  relatedTools: string[];
  faqs: Faq[];
  readingMinutes: number;
}

interface Parsed {
  meta: ArticleMeta;
  body: string;
  draft: boolean;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function fail(file: string, msg: string): never {
  throw new Error(`[content] ${file}: ${msg}`);
}

function requireString(file: string, data: Record<string, unknown>, key: string): string {
  const value = data[key];
  if (typeof value !== 'string' || value.trim() === '') fail(file, `frontmatter "${key}" is required`);
  return value.trim();
}

function optionalString(file: string, data: Record<string, unknown>, key: string): string | undefined {
  const value = data[key];
  if (value === undefined) return undefined;
  if (typeof value !== 'string') fail(file, `frontmatter "${key}" must be a string`);
  return value.trim();
}

/** YAML parses an unquoted `2026-09-20` as a Date; accept either form and normalise to ISO. */
function dateField(file: string, data: Record<string, unknown>, key: string, fallback?: string): string {
  const value = data[key];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    fail(file, `frontmatter "${key}" is required`);
  }
  const iso = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
  if (!ISO_DATE.test(iso)) fail(file, `"${key}" must be YYYY-MM-DD, got "${iso}"`);
  return iso;
}

function stringList(file: string, data: Record<string, unknown>, key: string): string[] {
  const value = data[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    fail(file, `frontmatter "${key}" must be a list of strings`);
  }
  return value as string[];
}

function faqList(file: string, data: Record<string, unknown>): Faq[] {
  const value = data.faqs;
  if (value === undefined) return [];
  if (!Array.isArray(value)) fail(file, 'frontmatter "faqs" must be a list');
  return value.map((item, i) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      typeof (item as Faq).question !== 'string' ||
      typeof (item as Faq).answer !== 'string'
    ) {
      fail(file, `faqs[${i}] needs "question" and "answer" strings`);
    }
    return { question: (item as Faq).question.trim(), answer: (item as Faq).answer.trim() };
  });
}

function toPath(contentDir: string, file: string): string {
  const rel = relative(contentDir, file).split(sep).join('/');
  return '/' + rel.replace(/\.md$/, '');
}

function parse(contentDir: string, file: string, raw: string): Parsed {
  const { data, content } = matter(raw);
  const path = toPath(contentDir, file);
  const segments = path.slice(1).split('/');
  const slug = segments[segments.length - 1];
  const section = segments.length > 1 ? segments.slice(0, -1).join('/') : '';

  if (!/^[a-z0-9-]+$/.test(slug)) fail(file, `file name must be a kebab-case slug, got "${slug}"`);

  const title = requireString(file, data, 'title');
  const date = dateField(file, data, 'date');
  const lastmod = dateField(file, data, 'lastmod', date);

  const words = content.split(/\s+/).filter(Boolean).length;

  return {
    draft: data.draft === true,
    body: content,
    meta: {
      path,
      section,
      slug,
      title,
      description: requireString(file, data, 'description'),
      h1: optionalString(file, data, 'h1') ?? title,
      intro: requireString(file, data, 'intro'),
      date,
      lastmod,
      tags: stringList(file, data, 'tags'),
      relatedTools: stringList(file, data, 'relatedTools'),
      faqs: faqList(file, data),
      readingMinutes: Math.max(1, Math.round(words / 220)),
    },
  };
}

async function listMarkdown(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await listMarkdown(full)));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(full);
  }
  return files;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * Shiki runs in `walkTokens` (async) and stashes the result on the token; the renderer
 * then reads it back synchronously. Unknown languages fall back to plain escaped text
 * rather than failing the build over a typo in a fence.
 */
function createRenderer(): Marked {
  const md = new Marked({ async: true, gfm: true });

  md.use({
    async walkTokens(token) {
      if (token.type !== 'code') return;
      const code = token as Tokens.Code & { highlighted?: string };
      const lang = (code.lang ?? '').trim().split(/\s+/)[0];
      if (lang && lang in bundledLanguages) {
        code.highlighted = await codeToHtml(code.text, { lang, theme: CODE_THEME });
      }
    },
    renderer: {
      code(token) {
        const code = token as Tokens.Code & { highlighted?: string };
        if (code.highlighted) return code.highlighted;
        return `<pre class="shiki"><code>${escapeHtml(code.text)}</code></pre>\n`;
      },
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        const id = slugify(inner);
        return `<h${depth} id="${id}">${inner}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const inner = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        const attrs = [`href="${escapeHtml(href)}"`];
        if (title) attrs.push(`title="${escapeHtml(title)}"`);
        if (external) attrs.push('rel="noopener"');
        return `<a ${attrs.join(' ')}>${inner}</a>`;
      },
    },
  });

  return md;
}

export interface ContentPluginOptions {
  /** Directory holding the markdown files. Default: `<root>/content`. */
  dir?: string;
}

export function contentPlugin(options: ContentPluginOptions = {}): Plugin {
  let contentDir = '';
  const md = createRenderer();

  const isContentFile = (id: string) => id.endsWith('.md') && resolve(id).startsWith(contentDir);

  return {
    name: 'jwtdev-content',

    configResolved(config) {
      contentDir = resolve(options.dir ?? join(config.root, 'content'));
    },

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_VIRTUAL_ID;
      return null;
    },

    async load(id) {
      if (id !== RESOLVED_VIRTUAL_ID) return null;

      const files = await listMarkdown(contentDir);
      const articles: ArticleMeta[] = [];
      for (const file of files) {
        this.addWatchFile(file);
        const parsed = parse(contentDir, file, await readFile(file, 'utf8'));
        if (!parsed.draft) articles.push(parsed.meta);
      }
      articles.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.path.localeCompare(b.path)));

      const seen = new Set<string>();
      for (const a of articles) {
        if (seen.has(a.path)) fail(a.path, 'two content files resolve to the same URL');
        seen.add(a.path);
      }

      return `export const articles = ${JSON.stringify(articles)};\n`;
    },

    async transform(code, id) {
      if (!isContentFile(id)) return null;
      const parsed = parse(contentDir, id, code);
      const html = await md.parse(parsed.body);
      return {
        code: `export const meta = ${JSON.stringify(parsed.meta)};\nexport const html = ${JSON.stringify(html)};\n`,
        map: null,
      };
    },

    handleHotUpdate({ file, server }) {
      if (!isContentFile(file)) return;
      const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_ID);
      if (mod) server.moduleGraph.invalidateModule(mod);
    },
  };
}
