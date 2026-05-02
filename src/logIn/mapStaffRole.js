/**
 * Map staff record `role` from API/UI to app role for routing.
 * @param {unknown} roleLabel
 * @returns {'guest'|'admin'|'frontdesk'|'housekeeping'|'cashier'}
 */
export function mapStaffRoleToAppRole(roleLabel) {
  const r = String(roleLabel ?? '')
    .trim()
    .toLowerCase()
  if (!r) return 'frontdesk'
  if (r === 'admin' || r.includes('administrator')) return 'admin'
  if (r.includes('front') || r.includes('reception')) return 'frontdesk'
  if (r.includes('housekeep') || r === 'hk' || r.includes('room attendant')) return 'housekeeping'
  if (r.includes('cashier') || r.includes('pos')) return 'cashier'
  if (r.includes('guest')) return 'guest'
  return 'frontdesk'
}
