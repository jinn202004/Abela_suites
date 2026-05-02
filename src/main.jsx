import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/dashboardMainScroll.css'
import { applyMarketingShellHtmlClass, getRouterStylePathname } from './utils/marketingShellPath'
import App from './App.jsx'

// Before first paint: other CSS in the bundle targets #root/body (e.g. frontdesk-housekeeping.css).
// html.homedashboard-route must be set immediately for `/` and `/contact`.
applyMarketingShellHtmlClass(getRouterStylePathname())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
