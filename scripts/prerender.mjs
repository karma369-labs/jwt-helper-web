/**
 * Renders each route in src/seo/site.ts to its own static HTML file with that route's head
 * baked in, so page content exists without executing JS. Runs after the client + SSR builds.
 */
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');
const ssrDir = join(root, 'dist-ssr');

const SEO_BLOCK = /<!--seo-->[\s\S]*?<!--\/seo-->/;
const ROOT_DIV = '<div id="root"></div>';

/** Escape for use inside a double-quoted HTML attribute. */
const attr = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/** Escape for use as HTML text content. */
const text = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * `</script>` inside JSON-LD would terminate the enclosing script element, so the
 * forward slash is escaped. `<` is valid JSON and parses back to '<'.
 */
const jsonLdSafe = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

function seoBlock(route, canonical, jsonLdBlocks) {
  const ld = jsonLdBlocks
    .map((block) => `    <script type="application/ld+json">${jsonLdSafe(block)}</script>`)
    .join('\n');

  return `<!--seo-->
    <title>${text(route.title)}</title>
    <meta name="description" content="${attr(route.description)}" />
    <link rel="canonical" href="${attr(canonical)}" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="JWT Debugger" />
    <meta property="og:url" content="${attr(canonical)}" />
    <meta property="og:title" content="${attr(route.title)}" />
    <meta property="og:description" content="${attr(route.description)}" />
    <meta property="og:image" content="https://jwtdev.com/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="JWT Debugger — decode, verify and generate JSON Web Tokens in your browser" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${attr(route.title)}" />
    <meta name="twitter:description" content="${attr(route.description)}" />
    <meta name="twitter:image" content="https://jwtdev.com/og-image.png" />
${ld}
    <!--/seo-->`;
}

function sitemap(routes, canonicalFor) {
  const urls = routes
    .map(
      (route) => `  <url>
    <loc>${attr(canonicalFor(route.path))}</loc>
    <lastmod>${route.lastmod}</lastmod>
  </url>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

async function main() {
  const template = await readFile(join(distDir, 'index.html'), 'utf8');

  if (!SEO_BLOCK.test(template) || !template.includes(ROOT_DIV)) {
    throw new Error(
      'dist/index.html is missing the <!--seo--> markers or the empty #root div — ' +
        'index.html changed shape and prerender.mjs needs updating to match.'
    );
  }

  const server = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href);
  const { render, routes, canonicalFor, jsonLdForRoute } = server;

  for (const route of routes) {
    const canonical = canonicalFor(route.path);
    const appHtml = render(route.path);

    // Replacer *functions*, not strings: in a replacement string `$&`, `$\``, `$'` and `$1`
    // are substitution patterns, so any '$' in a title, FAQ answer, or the rendered markup
    // would silently corrupt the output. A function receives the text verbatim.
    const html = template
      .replace(SEO_BLOCK, () => seoBlock(route, canonical, jsonLdForRoute(route)))
      .replace(ROOT_DIV, () => `<div id="root">${appHtml}</div>`);

    // '/' lands on dist/index.html; '/encoder' on dist/encoder/index.html, which static
    // hosts serve for the extensionless URL without needing a rewrite rule.
    const outFile =
      route.path === '/'
        ? join(distDir, 'index.html')
        : join(distDir, route.path.replace(/^\//, ''), 'index.html');

    await mkdir(dirname(outFile), { recursive: true });
    await writeFile(outFile, html, 'utf8');
    console.log(`  prerendered ${route.path.padEnd(16)} -> ${outFile.replace(root, '.')}`);
  }

  await writeFile(join(distDir, 'sitemap.xml'), sitemap(routes, canonicalFor), 'utf8');
  console.log(`  sitemap.xml  ${routes.length} urls`);

  await rm(ssrDir, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('\nprerender failed:\n', err);
  process.exit(1);
});
