import { BrowserRouter } from 'react-router-dom'
import './App.css'
import { AuthRoleProvider } from './context/AuthRoleContext'
import { AdminShellProvider } from './admin_1/AdminShellContext'
import { FrontdeskShellProvider } from './frontdesks/FrontdeskShellContext'
import AppRoutes from './routes/AppRoutes'
import MarketingShellClassSync from './MarketingShellClassSync'
import './styles/roleSidebarSpacing.css'

/** Avoid throwing if BASE_URL is missing; RR accepts omitting basename when served at `/`. */
const rawBase = import.meta.env.BASE_URL ?? '/'
const trimmed = String(rawBase).replace(/\/$/, '')
const routerBasename = trimmed === '' ? undefined : trimmed

export default function App() {
  return (
    <BrowserRouter basename={routerBasename}>
      <MarketingShellClassSync />
      <AuthRoleProvider>
        <AdminShellProvider>
          <FrontdeskShellProvider>
            <AppRoutes />
          </FrontdeskShellProvider>
        </AdminShellProvider>
      </AuthRoleProvider>
    </BrowserRouter>
  )
}
