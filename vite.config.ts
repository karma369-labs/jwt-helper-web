import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Serves `/encoder` from `dist/encoder/index.html` in `vite preview`.
 *
 * Static hosts (Vercel, Netlify, Cloudflare Pages) resolve extensionless URLs to the
 * directory's index.html as standard behaviour, but Vite's preview server returns 404.
 * Without this, preview cannot exercise the same URLs that are in the sitemap and the
 * canonical tags, which is how the earlier hydration mismatch went unnoticed.
 */
function cleanUrlsInPreview(): Plugin {
  return {
    name: 'clean-urls-in-preview',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const [path, query] = (req.url ?? '/').split('?');
        if (path !== '/' && !path.endsWith('/') && !path.split('/').pop()?.includes('.')) {
          req.url = `${path}/index.html${query ? `?${query}` : ''}`;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ isPreview }) => ({
  plugins: [react(), cleanUrlsInPreview()],

  // `bun run build` prerenders each route to its own file (dist/encoder/index.html, ...),
  // so the preview server must serve those directly. Left as the default 'spa', its history
  // fallback returns the home page's HTML for every path, and the client then hydrates a
  // different route than the server rendered.
  //
  // The dev server keeps the SPA fallback: nothing is prerendered there, so /encoder has to
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
