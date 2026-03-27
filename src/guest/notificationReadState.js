const STORAGE_KEYS = {
  guest: 'joanah-notif-read-ids-guest',
  staff: 'joanah-notif-read-ids-staff',
}

/**
 * @param {'guest' | 'staff'} audience
 */
function loadReadSet(audience) {
  const key = STORAGE_KEYS[audience]
  if (!key) return new Set()
  try {
    const raw = localStorage.getItem(key)
    const arr = raw ? JSON.parse(raw) : []
    return new Set(Array.isArray(arr) ? arr.map(String) : [])
  } catch {
    return new Set()
  }
}

/**
 * @param {'guest' | 'staff'} audience
 * @param {Set<string>} set
 */
function saveReadSet(audience, set) {
  const key = STORAGE_KEYS[audience]
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify([...set]))
  } catch {
    /* quota / private mode */
  }
}

/**
 * @param {'guest' | 'staff'} audience
 * @param {(string | number)[]} ids
 */
export function markNotificationIdsAsRead(audience, ids) {
  if (!ids?.length) return
  const set = loadReadSet(audience)
  ids.forEach((id) => set.add(String(id)))
  saveReadSet(audience, set)
}

/**
 * @param {'guest' | 'staff'} audience
 * @param {unknown[]} notifications
 */
export function countUnreadNotifications(audience, notifications) {
  const read = loadReadSet(audience)
  if (!Array.isArray(notifications)) return 0
  return notifications.filter((n) => n != null && !read.has(String(n.id))).length
}
