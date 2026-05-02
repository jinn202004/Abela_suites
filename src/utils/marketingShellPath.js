/**
 * `pathname` the way React Router reports it (relative to BrowserRouter `basename`)
 * for the current `window` URL.
 */
export function getRouterStylePathname() {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '') || ''
  let path = window.location.pathname
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  if (!path) path = '/'
  if (!base) return path
  if (path === base) return '/'
  if (path.startsWith(base + '/')) {
    const rest = path.slice(base.length) || '/'
    return rest.startsWith('/') ? rest : `/${rest}`
  }
  return path
}

export function isMarketingShellPath(pathname) {
  const p = (pathname || '/').replace(/\/$/, '') || '/'
  return p === '/' || p === '/contact'
}

/**
 * Toggles `html.homedashboard-route` (see guests/homedashboard.css) so global
 * dashboard #root/body rules do not run before React paints the landing / contact UIs.
 */
export function applyMarketingShellHtmlClass(pathname) {
  const on = isMarketingShellPath(pathname)
  if (on) {
    document.documentElement.classList.add('homedashboard-route')
  } else {
    /* Always clear when not on marketing routes (front desk, admin, etc. need default #root / body). */
    document.documentElement.classList.remove('homedashboard-route')
  }
}
