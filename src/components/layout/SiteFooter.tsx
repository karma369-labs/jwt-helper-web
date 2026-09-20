import { Link } from 'react-router-dom';
import { sectionRoutes, toolRoutes } from '../../seo/routes';

// Related external tools. Real <a> with rel="noopener" — followable so the link is
// crawlable, but no window.opener handle handed to the target.
const relatedTools: { href: string; label: string }[] = [
  { href: 'https://jsonspace.io', label: 'JSON formatter' },
];

// Every tool and every content section linked from every page: keeps crawl depth at one
// hop and gives each page an internal link, which is how link equity reaches the newer
// pages. Articles are two hops away via their section index.
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
          {toolRoutes().map((route) => (
            <Link key={route.path} to={route.path} className="site-footer__link">
              {route.h1.split('—')[0].trim()}
            </Link>
          ))}
        </nav>

        <nav className="site-footer__col" aria-label="Learn">
          <h2 className="site-footer__heading">Learn</h2>
          {sectionRoutes().map((route) => (
            <Link key={route.path} to={route.path} className="site-footer__link">
              {route.h1.replace(/^JWT /, '')}
            </Link>
          ))}
          <Link to="/about" className="site-footer__link">
            About
          </Link>
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
