import { memo } from 'react';
import { NavLink } from 'react-router-dom';

// Real <a href> links, not buttons: crawlers need followable hrefs to discover the
// other routes, and users get working middle-click / open-in-new-tab.
//
// /jwt-decrypter is deliberately NOT here. It targets the "jwt decrypter" search intent,
// but to someone already on the site it is indistinguishable from the Decoder — the two
// render the same tool. Showing both in the primary nav asks the user to guess at a
// difference that does not exist. It stays linked from the footer, which is enough for
// crawlers to reach and index it on a site this small.
const links: { to: string; label: string }[] = [
  { to: '/', label: 'Decoder' },
  { to: '/encoder', label: 'Encoder' },
];

function SiteNavImpl() {
  return (
    <nav className="tabs" aria-label="Tools">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) => `tabs__item ${isActive ? 'tabs__item--active' : ''}`}
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}

export const SiteNav = memo(SiteNavImpl);
