/**
 * Express API (Mongo, JWT) — base URL for deployment.
 * Set in `.env`: `VITE_API_BASE_URL=https://api.example.com` or `http://localhost:5000` (no trailing slash).
 * Leave unset for same-origin requests to `/api/...` (Vite dev proxy to port 5000, or nginx in production).
 */
export function getBackendBaseURL() {
  const raw = import.meta.env.VITE_API_BASE_URL
  if (raw == null) return ''
  const s = String(raw).trim()
  if (!s) return ''
  return s.replace(/\/$/, '')
}

/**
 * Full URL for backend routes (path must start with `/`, e.g. `/api/rooms`).
 */
export function backendUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = getBackendBaseURL()
  if (!base) return p
  return `${base}${p}`
}
