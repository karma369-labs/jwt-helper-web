import { Link } from 'react-router-dom';
import { articlesIn } from '../content/loader';
import { formatDate } from '../content/format';
import type { RouteSeo } from '../seo/site';

/** Index page for /blog, /guides, /use-cases: every non-draft article in the section, newest first. */
export function SectionIndexPage({ route }: { route: RouteSeo }) {
  const section = route.path.slice(1);
  const items = articlesIn(section);

  return (
    <div className="page page--section">
      {items.length === 0 ? (
        <p className="section-list__empty">Articles are on the way.</p>
      ) : (
        <ul className="section-list">
          {items.map((item) => (
            <li key={item.path} className="section-list__item">
              <Link to={item.path} className="section-list__link">
                <h2 className="section-list__title">{item.title}</h2>
                <p className="section-list__desc">{item.description}</p>
                <p className="section-list__meta">
                  <time dateTime={item.date}>{formatDate(item.date)}</time>
                  <span aria-hidden="true"> · </span>
                  <span>{item.readingMinutes} min read</span>
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
