import { useEffect } from 'react';
import { canonicalFor, type RouteSeo } from './site';

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/**
 * Syncs <head> on client-side navigation only. Cold loads are already correct — the
 * prerenderer baked each route's tags into its own HTML file.
 */
export function Seo({ route }: { route: RouteSeo }) {
  useEffect(() => {
    const canonical = canonicalFor(route.path);

    document.title = route.title;
    setMeta('name', 'description', route.description);

    setMeta('property', 'og:title', route.title);
    setMeta('property', 'og:description', route.description);
    setMeta('property', 'og:url', canonical);

    setMeta('name', 'twitter:title', route.title);
    setMeta('name', 'twitter:description', route.description);

    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [route]);

  return null;
}
