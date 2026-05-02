/** App role keys → first screen after login (paths must exist in `routes/*.jsx`) */
export const HOME_PATH_BY_ROLE = {
  /** Legacy guest app: `guests/home.jsx` at `/home` (not `/guest` shell) */
  guest: '/home',
  /** Legacy admin home (`admin_1/admin-dashboard`), not the `/admin` layout index alone */
  admin: '/admin-dashboard',
  /** Front desk shell: `FrontDeskLayout` at `/frontdesk` */
  frontdesk: '/frontdesk',
  housekeeping: '/housekeeping',
  cashier: '/cashier-billing',
}

/**
 * @param {string} role
 * @returns {string}
 */
export function getHomePathForRole(role) {
  return HOME_PATH_BY_ROLE[role] ?? '/home'
}
