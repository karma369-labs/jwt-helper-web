import { canonicalFor, SITE_ORIGIN, type RouteSeo } from './site';

/**
 * Structured data for a route's <head>. Emitted at build time rather than by React so it
 * is in the raw HTML — JS-injected JSON-LD only lands on Google's deferred render pass.
 */
export function jsonLdForRoute(route: RouteSeo): object[] {
  const canonical = canonicalFor(route.path);
  const blocks: object[] = [];

  // The tool itself. Declared on every page so any entry point identifies the app.
  blocks.push({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'JWT Debugger',
    url: canonical,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any (runs in browser)',
    description: route.description,
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  });

  if (route.faqs.length > 0) {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: route.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: { '@type': 'Answer', text: faq.answer },
      })),
    });
  }

  // Breadcrumbs only make sense below the root.
  if (route.path !== '/') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'JWT Debugger', item: `${SITE_ORIGIN}/` },
        { '@type': 'ListItem', position: 2, name: route.h1, item: canonical },
      ],
    });
  }

  return blocks;
}
