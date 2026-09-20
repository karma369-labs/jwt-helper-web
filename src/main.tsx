import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { preloadArticle } from './content/loader'
import { installErrorTracking, trackAppLoaded } from './core/analytics'

installErrorTracking()
trackAppLoaded()

const container = document.getElementById('root')!

const tree = (
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)

// Article bodies are lazy chunks. On an article URL the prerendered HTML already contains
// the body, so the chunk has to be in the cache before hydration or the first client render
// would be the "Loading…" placeholder and React would bail on the mismatch. Non-article
// paths resolve immediately.
preloadArticle(window.location.pathname.replace(/\/$/, '') || '/').then(() => {
  // `bun run build` prerenders every route to static HTML, so in production the container
  // already holds markup and must be hydrated rather than overwritten. The dev server
  // serves an empty shell, hence the fallback.
  if (container.hasChildNodes()) {
    hydrateRoot(container, tree)
  } else {
    createRoot(container).render(tree)
  }
})
