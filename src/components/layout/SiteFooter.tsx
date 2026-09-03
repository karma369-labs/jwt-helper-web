import { Link } from 'react-router-dom';
import { routes } from '../../seo/site';

// Related external tools. Real <a> with rel="noopener" — followable so the link is
// crawlable, but no window.opener handle handed to the target.
const relatedTools: { href: string; label: string }[] = [
  { href: 'https://jsonspace.io', label: 'JSON formatter' },
];

// Every route linked from every page: keeps crawl depth at one hop and gives each
// page an internal link, which is how link equity reaches the newer tool pages.
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__grid">
        <div className="site-footer__brand">
          <span className="site-footer__wordmark">JWT Debugger</span>
          <p className="site-footer__tagline">
            Decode, verify, and generate JSON Web Tokens entirely in your browser.
            Tokens, keys, and JSON never leave your machine.
          </p>
        </div>

        <nav className="site-footer__col" aria-label="All tools">
          <h2 className="site-footer__heading">Tools</h2>
          {routes.map((route) => (
            <Link key={route.path} to={route.path} className="site-footer__link">
              {route.h1.split('—')[0].trim()}
            </Link>
          ))}
        </nav>

        <nav className="site-footer__col" aria-label="Related tools">
          <h2 className="site-footer__heading">Related</h2>
          {relatedTools.map((tool) => (
            <a
              key={tool.href}
              href={tool.href}
              className="site-footer__link"
              rel="noopener"
            >
              {tool.label}
            </a>
          ))}
        </nav>
      </div>

      <div className="site-footer__bar">
        <span>No backend. Signing and verification run on WebCrypto in your browser.</span>
      </div>
    </footer>
  );
}
