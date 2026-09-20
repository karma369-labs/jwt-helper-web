import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { contentPlugin } from './scripts/vite-plugin-content.ts'

/**
 * Makes `vite preview` behave like the production host (public/.htaccess):
 * `/guides` is served from `dist/guides/index.html`, and unknown paths get the
 * prerendered `dist/404.html` with a 404 status.
 *
 * Vite's preview server would otherwise 404 every extensionless URL, so preview could not
 * exercise the URLs in the sitemap and canonical tags, which is how an earlier hydration
 * mismatch went unnoticed.
 */
function cleanUrlsInPreview(): Plugin {
  let outDir = 'dist';
  return {
    name: 'clean-urls-in-preview',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const [path, query] = (req.url ?? '/').split('?');
        const isPage = path !== '/' && !path.split('/').pop()?.includes('.');
        if (!isPage) return next();

        const clean = path.replace(/\/$/, '');
        if (existsSync(join(outDir, clean, 'index.html'))) {
          req.url = `${clean}/index.html${query ? `?${query}` : ''}`;
          return next();
        }

        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(readFileSync(join(outDir, '404.html')));
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ isPreview }) => ({
  plugins: [react(), contentPlugin(), cleanUrlsInPreview()],

  // `bun run build` prerenders each route to its own file (dist/guides/index.html, ...),
  // so the preview server must serve those directly. Left as the default 'spa', its history
  // fallback returns the home page's HTML for every path, and the client then hydrates a
  // different route than the server rendered.
  //
  // The dev server keeps the SPA fallback: nothing is prerendered there, so /guides has to
  // fall through to index.html for the router to pick it up.
  //
  // Production hosting must behave like preview does here — serve directory index files and
  // do NOT add a catch-all rewrite to /index.html, or it reintroduces exactly this bug.
  appType: isPreview ? 'mpa' : 'spa',

  build: {
    modulePreload: {
      // CodeMirror is deliberately lazy-loaded (see LazyJsonPane), but Vite still emitted a
      // <link rel="modulepreload"> for its 428KB chunk, so the browser fetched it at high
      // priority during initial load where it competed with render-critical work.
      // Dropping it from the preload list restores the point of the split: the editor chunk
      // is fetched when the pane actually mounts.
      resolveDependencies: (_url, deps) => deps.filter((dep) => !dep.includes('codemirror')),
    },
    rollupOptions: {
      output: {
        // Split heavy, independently-cacheable deps out of the app chunk —
        // CodeMirror and jose dominate bundle size and change far less often than app code.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('codemirror')) return 'codemirror';
            if (id.includes('/jose/')) return 'jose';
          }
        },
      },
    },
  },
}))
