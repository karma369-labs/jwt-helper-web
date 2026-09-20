/**
 * The full route list: hand-written entries from ./site.ts plus one RouteSeo per markdown
 * file under content/. Everything that needs "every page" — prerender, sitemap, footer,
 * route resolution — reads from here rather than from `routes` directly.
 */
import { articles } from '../content/loader';
import type { ArticleMeta } from '../content/types';
import { normalisePath, routes, type RouteSeo } from './site';

export interface ArticleRoute extends RouteSeo {
  kind: 'article' | 'page';
  article: ArticleMeta;
}

function toRoute(article: ArticleMeta): ArticleRoute {
  return {
    path: article.path,
    // Top-level markdown files (/about) are standalone pages; nested ones are section articles.
    kind: article.section === '' ? 'page' : 'article',
    title: article.title,
    description: article.description,
    h1: article.h1,
    intro: article.intro,
    faqs: article.faqs,
    lastmod: article.lastmod,
    article,
  };
}

const articleRoutes: ArticleRoute[] = articles.map(toRoute);

const all: RouteSeo[] = [...routes, ...articleRoutes];

export function allRoutes(): RouteSeo[] {
  return all;
}

export function toolRoutes(): RouteSeo[] {
  return routes.filter((r) => r.kind === 'tool');
}

export function sectionRoutes(): RouteSeo[] {
  return routes.filter((r) => r.kind === 'section');
}

export function isArticleRoute(route: RouteSeo): route is ArticleRoute {
  return 'article' in route;
}

/** Resolves a URL to its route; unknown paths return undefined so the caller can 404. */
export function findRoute(path: string): RouteSeo | undefined {
  const normalised = normalisePath(path);
  return all.find((r) => r.path === normalised);
}

/** The section index (`/guides`) an article belongs to, if any. */
export function sectionFor(route: RouteSeo): RouteSeo | undefined {
  if (!isArticleRoute(route) || route.article.section === '') return undefined;
  return routes.find((r) => r.kind === 'section' && r.path === `/${route.article.section}`);
}

/**
 * Rendered to dist/404.html for the host's ErrorDocument (see public/.htaccess) and used
 * in-app for unknown paths. Not in `allRoutes()`, so it stays out of the sitemap.
 */
export const notFoundRoute: RouteSeo = {
  path: '/404',
  kind: 'page',
  title: 'Page not found — JWT Debugger',
  description: 'That page does not exist. Decode, verify, or generate a JSON Web Token instead.',
  h1: 'Page not found',
  intro: 'Nothing lives at this address. The tools below are where most people are headed.',
  faqs: [],
  lastmod: '2026-09-20',
};
