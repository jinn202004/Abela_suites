import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Shared by `vite` and `vite preview` so `/api` works the same in dev and after `npm run build`.
const proxy = {
  // Express (Mongo auth, JWT): `be/abela-be` — default port 5000
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /** Ensures Chart.js is pre-bundled in dev (avoids flaky resolve if deps were just installed). */
  optimizeDeps: {
    include: ['chart.js'],
  },
  server: {
    proxy,
  },
  preview: {
    proxy,
  },
})
