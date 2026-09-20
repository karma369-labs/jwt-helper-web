import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getArticle, preloadArticle } from '../content/loader';
import { formatDate } from '../content/format';
import { sectionFor, toolRoutes, type ArticleRoute } from '../seo/routes';
import type { Article } from '../content/types';

/**
 * One markdown article. The body is a lazy chunk: on a cold load it is already cached
 * (main.tsx / entry-server preload it before render), so the first render is complete and
 * hydration matches. After client-side navigation the cache is cold, so we show a
 * placeholder and fill it in once the chunk arrives — deliberately not Suspense, which the
 * prerender cannot resolve.
 */
export function ArticlePage({ route }: { route: ArticleRoute }) {
  const { article: meta } = route;
  const [article, setArticle] = useState<Article | undefined>(() => getArticle(meta.path));

  // App keys this component by path, so a navigation remounts it and the initializer
  // above re-reads the cache; this effect only has to fill a miss.
  useEffect(() => {
    if (article) return;
    let cancelled = false;
    preloadArticle(meta.path).then((loaded) => {
      if (!cancelled) setArticle(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [article, meta.path]);

  const section = sectionFor(route);
  const related = toolRoutes().filter((tool) => meta.relatedTools.includes(tool.path));

  return (
    <div className="page page--article">
      {section && (
        <nav className="crumbs" aria-label="Breadcrumb">
          <Link to="/" className="crumbs__link">
            Home
          </Link>
          <span className="crumbs__sep" aria-hidden="true">
            /
          </span>
          <Link to={section.path} className="crumbs__link">
            {section.h1}
          </Link>
        </nav>
      )}

      <p className="article-meta">
        <time dateTime={meta.date}>{formatDate(meta.date)}</time>
        {meta.lastmod !== meta.date && (
          <>
            <span className="article-meta__sep" aria-hidden="true">
              ·
            </span>
            <span>
              Updated <time dateTime={meta.lastmod}>{formatDate(meta.lastmod)}</time>
            </span>
          </>
        )}
        <span className="article-meta__sep" aria-hidden="true">
          ·
        </span>
        <span>{meta.readingMinutes} min read</span>
      </p>

      {article ? (
        // Build-time HTML from our own markdown under content/, never user input.
        <article className="prose prose--article" dangerouslySetInnerHTML={{ __html: article.html }} />
      ) : (
        <article className="prose prose--article prose--loading" aria-busy="true">
          <p>Loading…</p>
        </article>
      )}

      {related.length > 0 && (
        <aside className="tool-callout" aria-labelledby="tool-callout-heading">
          <h2 id="tool-callout-heading" className="tool-callout__heading">
            Try it in the browser
          </h2>
          <div className="tool-callout__links">
            {related.map((tool) => (
              <Link key={tool.path} to={tool.path} className="tool-callout__link">
                {tool.h1.split('—')[0].trim()}
                <span className="tool-callout__arrow" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
          <p className="tool-callout__note">Tokens and keys never leave your machine.</p>
        </aside>
      )}
    </div>
  );
}
