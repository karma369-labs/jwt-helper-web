import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import App from './App';

export { canonicalFor } from './seo/site';
export { allRoutes, notFoundRoute } from './seo/routes';
export { jsonLdForRoute } from './seo/jsonLd';
export { preloadArticle } from './content/loader';

/**
 * Build-time entry point. `scripts/prerender.mjs` imports this from the SSR bundle and
 * calls `render` once per route, writing the result into that route's static HTML. For
 * article routes it must `await preloadArticle(path)` first so the body is in the cache;
 * renderToString cannot wait for it.
 *
 * Lazy components (the CodeMirror-backed JSON panes) resolve to their Suspense fallback
 * here, which is intended — the editors are interactive chrome, not indexable content,
 * and the client hydrates them in on load.
 */
export function render(url: string): string {
  return renderToString(
    <StaticRouter location={url}>
      <App />
    </StaticRouter>
  );
}
