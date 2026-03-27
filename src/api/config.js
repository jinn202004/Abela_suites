/**
 * JSON Server (dev): run `npm run api` — Vite proxies `/api` → http://localhost:3001
 * Override: `VITE_API_URL=http://localhost:3001` (no proxy needed if CORS ok)
 */
export function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv) {
    return String(fromEnv).replace(/\/$/, '')
  }
  if (import.meta.env.DEV) {
    return '/api'
  }
  return 'http://localhost:3001'
}
