/** Dispatched after reservation-related notifications are created or updated. */
export const NOTIFICATIONS_REFRESH_EVENT = 'app-notifications-refresh'

export function dispatchNotificationsRefresh() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT))
  }
}

export function formatNotificationDate(d = new Date()) {
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

/**
 * @param {unknown[]} list
 * @param {'guest' | 'staff'} audience
 */
export function filterNotificationsForAudience(list, audience) {
  if (!Array.isArray(list)) return []
  return list.filter((n) => {
    const a = n?.audience
    if (audience === 'guest') return a == null || a === 'guest'
    if (audience === 'staff') return a === 'staff'
    return true
  })
}

function parseNotifTime(dateStr) {
  if (dateStr == null) return 0
  const t = Date.parse(String(dateStr))
  if (Number.isFinite(t)) return t
  const d = new Date(String(dateStr))
  const x = d.getTime()
  return Number.isFinite(x) ? x : 0
}

/** Newest first (by `date` string). */
export function sortNotificationsNewestFirst(list) {
  return [...list].sort((a, b) => parseNotifTime(b?.date) - parseNotifTime(a?.date))
}
