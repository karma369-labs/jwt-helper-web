/**
 * Article bodies are lazy chunks so they never weigh on the tool pages. Both the prerender
 * (entry-server) and the client (main.tsx) call `preloadArticle` for the current URL before
 * rendering, so server markup and the first client render agree without a Suspense boundary
 * — renderToString cannot resolve one. `getArticle` is the synchronous read
 * components use; after client-side navigation it returns undefined until the chunk lands.
 */
import { articles } from 'virtual:content-index';
import type { Article, ArticleMeta } from './types';

const modules = import.meta.glob<{ meta: ArticleMeta; html: string }>('/content/**/*.md');

const cache = new Map<string, Article>();

function keyFor(path: string): string {
  return `/content${path}.md`;
}

export function isArticlePath(path: string): boolean {
  return keyFor(path) in modules;
}

export async function preloadArticle(path: string): Promise<Article | undefined> {
  const cached = cache.get(path);
  if (cached) return cached;
  const loader = modules[keyFor(path)];
  if (!loader) return undefined;
  const mod = await loader();
  const article = { meta: mod.meta, html: mod.html };
  cache.set(path, article);
  return article;
}

export function getArticle(path: string): Article | undefined {
  return cache.get(path);
}

export function articleMeta(path: string): ArticleMeta | undefined {
  return articles.find((a) => a.path === path);
}

export function articlesIn(section: string): ArticleMeta[] {
  return articles.filter((a) => a.section === section);
}

/** Articles that name `toolPath` in `relatedTools`, newest first. */
export function articlesForTool(toolPath: string, limit = 4): ArticleMeta[] {
  return articles.filter((a) => a.relatedTools.includes(toolPath)).slice(0, limit);
}

export { articles };
