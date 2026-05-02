import { tryBackendLogin } from '../api/authApi'
import { CASHIER_DEMO_AUTH } from '../cashier/cashierDemoAuth'
import { FRONTDESKS_DEMO_AUTH } from '../frontdesks/frontdesksDemoAuth'
import { HOUSEKEEPING_DEMO_AUTH } from '../housekeeping/housekeepingDemoAuth'
import { ADMINS_DEMO_AUTH } from './adminsDemoAuth'
import { GUESTS_DEMO_AUTH } from './guestsDemoAuth'
/** Merged demo map — admin/guest: `logIn/adminsDemoAuth.js`, `logIn/guestsDemoAuth.js`; others under role folders */
const DEMO_AUTH_LIST = [
  ADMINS_DEMO_AUTH, // admin
  FRONTDESKS_DEMO_AUTH,
  GUESTS_DEMO_AUTH,
  HOUSEKEEPING_DEMO_AUTH,
  CASHIER_DEMO_AUTH,
]

export const DEMO_ACCOUNTS = Object.fromEntries(
  DEMO_AUTH_LIST.map(({ role, username, password }) => [role, { username, password }]),
)

/**
 * @param {string} emailOrUsername
 * @param {string} password
 * @returns {Promise<{ ok: true, role: string } | { ok: false, reason?: 'network' }>}
 */
export async function tryCredentials(emailOrUsername, password) {
  const u = emailOrUsername.trim().toLowerCase()
  const p = typeof password === 'string' ? password.trim() : password

  // Real API login first for emails — stores JWT in sessionStorage (`abela_auth_token`).
  // Demo accounts used to run before this, so "admin@abela.demo" never hit the API and room CRUD failed.
  if (u.includes('@')) {
    const backend = await tryBackendLogin(u, p)
    if (backend.ok) return backend
    if (backend.reason === 'network') return { ok: false, reason: 'network' }
    if (backend.reason === 'server') {
      return { ok: false, reason: 'server', message: backend.message }
    }
    // API rejected credentials (or other client error) — do not fall through to demo accounts for @ emails.
    return { ok: false, reason: 'auth', message: backend.message }
  }

  for (const { role, username, password: demoPass } of DEMO_AUTH_LIST) {
    if (u === username.toLowerCase() && p === demoPass) {
      return { ok: true, role }
    }
  }

  return { ok: false, reason: 'auth', message: 'Invalid username or password.' }
}
