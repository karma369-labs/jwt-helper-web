import { Link } from 'react-router-dom';
import { routes } from '../../seo/site';

// Every route linked from every page: keeps crawl depth at one hop and gives each
// page an internal link, which is how link equity reaches the newer tool pages.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer__links" aria-label="All tools">
        {routes.map((route) => (
          <Link key={route.path} to={route.path} className="site-footer__link">
            {route.h1.split('—')[0].trim()}
          </Link>
        ))}
      </nav>
      <p className="site-footer__note">
        Every tool here runs entirely in your browser. Tokens, keys, and JSON are never uploaded.
      </p>
    </footer>
  );
}
