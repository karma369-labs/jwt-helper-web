import { Link } from 'react-router-dom';
import { sectionRoutes, toolRoutes } from '../seo/routes';

/** Rendered for unknown paths in-app and prerendered to dist/404.html for the host. */
export function NotFoundPage() {
  return (
    <div className="page page--not-found">
      <div className="not-found">
        <h2 className="not-found__heading">Tools</h2>
        <ul className="not-found__list">
          {toolRoutes().map((tool) => (
            <li key={tool.path}>
              <Link to={tool.path} className="not-found__link">
                {tool.h1.split('—')[0].trim()}
              </Link>
            </li>
          ))}
        </ul>
        <h2 className="not-found__heading">Learn</h2>
        <ul className="not-found__list">
          {sectionRoutes().map((section) => (
            <li key={section.path}>
              <Link to={section.path} className="not-found__link">
                {section.h1}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
