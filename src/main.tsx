import { StrictMode } from 'react'
import { createRoot, hydrateRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
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

// `bun run build` prerenders every route to static HTML, so in production the container
// already holds markup and must be hydrated rather than overwritten. The dev server
// serves an empty shell, hence the fallback.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree)
} else {
  createRoot(container).render(tree)
}
