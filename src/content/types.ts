/**
 * Shapes produced by scripts/vite-plugin-content.ts. The plugin owns the parsing; this file
 * only declares what the virtual index and `.md` modules export so the app can import them.
 */
import type { Faq } from '../seo/site';

export type Section = 'blog' | 'guides' | 'use-cases';

export interface ArticleMeta {
  /** Route path, e.g. `/guides/nodejs`. */
  path: string;
  /** First path segment (`blog`, `guides`, `use-cases`); empty string for top-level pages like `/about`. */
  section: string;
  slug: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** YYYY-MM-DD */
  date: string;
  lastmod: string;
  tags: string[];
  /** Tool routes this article links to; also drives "Further reading" on those tools. */
  relatedTools: string[];
  faqs: Faq[];
  readingMinutes: number;
}

export interface Article {
  meta: ArticleMeta;
  /** Rendered body. Built from our own repo at build time, never from user input. */
  html: string;
}
