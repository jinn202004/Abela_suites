import { useLayoutEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { applyMarketingShellHtmlClass } from './utils/marketingShellPath'

/**
 * Keeps `html.homedashboard-route` in sync on client-side navigations.
 * Initial path is set in `main.jsx` before render.
 */
export default function MarketingShellClassSync() {
  const { pathname } = useLocation()
  useLayoutEffect(() => {
    applyMarketingShellHtmlClass(pathname)
  }, [pathname])
  return null
}
