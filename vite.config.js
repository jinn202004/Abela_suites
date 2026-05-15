import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  /**
   * Dev proxy target for `/api/*`.
   * Default `127.0.0.1` avoids Windows/macOS cases where `localhost` resolves to IPv6 `::1` but Node is only on IPv4.
   * Match `PORT` in `be/abela-be/.env` when it is not 5000 (set `VITE_DEV_API_PROXY` in `.env.local` here).
   */
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const raw = String(env.VITE_DEV_API_PROXY || 'http://127.0.0.1:5000').trim()
  const target = raw.replace(/\/$/, '')

  const proxy = {
    '/api': {
      target,
      changeOrigin: true,
      /** Avoid hanging proxy upgrades when the API is down */
      ws: false,
    },
  }

  return {
    plugins: [react()],
    /** Ensures Chart.js is pre-bundled in dev (avoids flaky resolve if deps were just installed). */
    optimizeDeps: {
      include: ['chart.js'],
    },
    server: {
      port: 5173,
      /** Fail if 5173 is busy so we never silently jump to 5174 (avoids bookmark / proxy confusion). */
      strictPort: true,
      proxy,
    },
    preview: {
      proxy,
    },
  }
})
