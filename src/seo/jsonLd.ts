import { canonicalFor, SITE_ORIGIN, type RouteSeo } from './site';
import { isArticleRoute, sectionFor } from './routes';

const SITE_NAME = 'JWT Debugger';

const publisher = {
  '@type': 'Organization',
  name: SITE_NAME,
  url: `${SITE_ORIGIN}/`,
  logo: { '@type': 'ImageObject', url: `${SITE_ORIGIN}/og-image.png` },
};

/**
 * Structured data for a route's <head>. Emitted at build time rather than by React so it
 * is in the raw HTML — JS-injected JSON-LD only lands on Google's deferred render pass.
 */
export function jsonLdForRoute(route: RouteSeo): object[] {
  const canonical = canonicalFor(route.path);
  const blocks: object[] = [];

  // The tool itself, on the tool pages only. Articles describe themselves instead.
  if (route.kind === 'tool') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: canonical,
      applicationCategory: 'DeveloperApplication',
      operatingSystem: 'Any (runs in browser)',
      description: route.description,
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    });
  }

  if (route.kind === 'section') {
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: route.title,
      url: canonical,
      description: route.description,
      isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${SITE_ORIGIN}/` },
    });
  }

  if (isArticleRoute(route) && route.kind === 'article') {
    const { article } = route;
    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'TechArticle',
      headline: article.title,
      description: article.description,
      url: canonical,
      mainEntityOfPage: canonical,
      datePublished: article.date,
      dateModified: article.lastmod,
      author: publisher,
      publisher,
      image: `${SITE_ORIGIN}/og-image.png`,
      ...(article.tags.length > 0 ? { keywords: article.tags.join(', ') } : {}),
    });
  }

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

  // Breadcrumbs only make sense below the root. Articles get Home > Section > Article.
  if (route.path !== '/') {
    const trail = [{ name: SITE_NAME, item: `${SITE_ORIGIN}/` }];
    const section = sectionFor(route);
    if (section) trail.push({ name: section.h1, item: canonicalFor(section.path) });
    trail.push({ name: route.h1, item: canonical });

    blocks.push({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: trail.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: crumb.item,
      })),
    });
  }

  return blocks;
}
