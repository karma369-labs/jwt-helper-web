import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
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
})
