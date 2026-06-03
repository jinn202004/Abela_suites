import { backendUrl } from './config'
import { getStoredAuthToken } from './authApi'

/** Fired to refresh guest notification bell (e.g. after booking list load or staff decision). */
export const GUEST_NOTIFICATIONS_REFRESH_EVENT = 'abela:guest-notifications-refresh'

/** Fired after guest saves hotel profile (PATCH /api/guests/me) so topbar/testimonials can refetch. */
export const GUEST_PROFILE_UPDATED_EVENT = 'abela-guest-profile-updated'

export function dispatchGuestProfileUpdated() {
  try {
    window.dispatchEvent(new Event(GUEST_PROFILE_UPDATED_EVENT))
  } catch {
    /* ignore */
  }
}

/** Guest bell in other tabs picks this up via `storage` when front desk approves/rejects. */
export const GUEST_NOTIFS_STORAGE_PING_KEY = 'abela_guest_notifs_ping'

export function dispatchGuestNotificationsRefresh() {
  try {
    window.dispatchEvent(new Event(GUEST_NOTIFICATIONS_REFRESH_EVENT))
    localStorage.setItem(GUEST_NOTIFS_STORAGE_PING_KEY, String(Date.now()))
  } catch {
    try {
      window.dispatchEvent(new Event(GUEST_NOTIFICATIONS_REFRESH_EVENT))
    } catch {
      /* ignore */
    }
  }
}

/** Fired after a guest submits a booking so front desk can refresh pending + staff notifications immediately. */
export const FRONTDESK_NOTIFICATIONS_REFRESH_EVENT = 'abela:frontdesk-notifications-refresh'

/** Same-origin tabs: housekeeping completing a clean task bumps this so open front desk pages refetch staff notifications. */
export const FRONTDESK_NOTIFICATIONS_STORAGE_PING_KEY = 'abela_frontdesk_staff_notifs_ping'

export function dispatchFrontdeskNotificationsRefresh() {
  try {
    window.dispatchEvent(new Event(FRONTDESK_NOTIFICATIONS_REFRESH_EVENT))
    try {
      localStorage.setItem(FRONTDESK_NOTIFICATIONS_STORAGE_PING_KEY, String(Date.now()))
    } catch {
      /* private mode / quota */
    }
  } catch {
    /* ignore */
  }
}

/** Fired when a booking is approved (new cleaning task) or housekeeping task status changes — refresh HK bells. */
export const HOUSEKEEPING_TASKS_REFRESH_EVENT = 'abela:housekeeping-tasks-refresh'

/** Other browser tabs receive `storage` when this key changes (same-origin). Same-tab uses the event above. */
export const HOUSEKEEPING_TASKS_STORAGE_PING_KEY = 'abela_hk_tasks_ping'

/** Guest booking history can listen so "Approved" shows without manual refresh after staff approves in another tab. */
export const GUEST_BOOKINGS_STORAGE_PING_KEY = 'abela_guest_bookings_ping'

export function dispatchHousekeepingTasksRefresh() {
  try {
    window.dispatchEvent(new Event(HOUSEKEEPING_TASKS_REFRESH_EVENT))
    try {
      localStorage.setItem(HOUSEKEEPING_TASKS_STORAGE_PING_KEY, String(Date.now()))
    } catch {
      /* private mode / quota */
    }
  } catch {
    /* ignore */
  }
}

/** Optional: housekeeping inbox (new-task alerts) refreshed in other tabs. */
export const HOUSEKEEPING_INBOX_REFRESH_EVENT = 'abela:housekeeping-inbox-refresh'

export function dispatchHousekeepingInboxRefresh() {
  try {
    window.dispatchEvent(new Event(HOUSEKEEPING_INBOX_REFRESH_EVENT))
  } catch {
    /* ignore */
  }
}

/** GET /api/housekeeping/notifications — Bearer; housekeeping or admin */
export async function fetchHousekeepingNotificationsBackend() {
  const res = await fetch(backendUrl('/api/housekeeping/notifications'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** PATCH /api/housekeeping/notifications/read-all */
export async function markAllHousekeepingNotificationsReadBackend() {
  const res = await fetch(backendUrl('/api/housekeeping/notifications/read-all'), {
    method: 'PATCH',
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** Call after front desk approves/rejects so guest tabs refetch bookings + notification bell + housekeeping bells. */
export function dispatchGuestBookingsRefreshPing() {
  try {
    const t = String(Date.now())
    localStorage.setItem(GUEST_BOOKINGS_STORAGE_PING_KEY, t)
    localStorage.setItem(GUEST_NOTIFS_STORAGE_PING_KEY, t)
    /** Belt-and-suspenders: housekeeping tabs only listen to this key for cross-tab sync. */
    localStorage.setItem(HOUSEKEEPING_TASKS_STORAGE_PING_KEY, t)
  } catch {
    /* ignore */
  }
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("abela-guest-bookings-ping"));
      window.dispatchEvent(new Event(GUEST_NOTIFICATIONS_REFRESH_EVENT));
    }
  } catch {
    /* ignore */
  }
}

/**
 * Express API: `GET /api/rooms` — public catalog (`be/abela-be/README.md`).
 * @returns {Promise<Array<{ id: string, roomNumber: string, package: string, image?: string, price: number, guests: number, description?: string, features?: string[] }>>}
 */
export async function fetchRoomsCatalog() {
  const res = await fetch(backendUrl('/api/rooms'), { headers: { Accept: 'application/json' } })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  const data = await res.json()
  return Array.isArray(data.rooms) ? data.rooms : []
}

/**
 * GET /api/event-venues/catalog — public; bookable event venues (same source as guest/cashier catalogs).
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchPublicEventVenuesCatalog() {
  const res = await fetch(backendUrl('/api/event-venues/catalog'), { headers: { Accept: 'application/json' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.eventVenues) ? data.eventVenues : []
}

/**
 * GET /api/menu/catalog — public; available dishes (same filter as cashier POS).
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchPublicMenuCatalog() {
  const res = await fetch(backendUrl('/api/menu/catalog'), { headers: { Accept: 'application/json' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.menu) ? data.menu : []
}

/**
 * GET /api/rooms/availability?checkIn=&checkOut= — public; overlapping room bookings + ops-occupied ids.
 * @returns {Promise<{ checkIn: string, checkOut: string, bookedRanges: { roomId: string, checkIn: string, checkOut: string }[], operationallyUnavailableRoomIds: string[] }>}
 */
export async function fetchRoomAvailabilityWindow(checkIn, checkOut) {
  const params = new URLSearchParams({
    checkIn: String(checkIn || '').trim(),
    checkOut: String(checkOut || '').trim(),
  })
  const res = await fetch(backendUrl(`/api/rooms/availability?${params.toString()}`), {
    headers: { Accept: 'application/json' },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    checkIn: typeof data.checkIn === 'string' ? data.checkIn : String(checkIn),
    checkOut: typeof data.checkOut === 'string' ? data.checkOut : String(checkOut),
    bookedRanges: Array.isArray(data.bookedRanges) ? data.bookedRanges : [],
    operationallyUnavailableRoomIds: Array.isArray(data.operationallyUnavailableRoomIds)
      ? data.operationallyUnavailableRoomIds.map((x) => String(x))
      : [],
  }
}

/**
 * GET /api/rooms/:roomId/guest-occupancy?from=&to= — public; blocking stays for one room (no PII).
 * Each range may include `stayTone`: `"occupied"` | `"approved"` | `"pending"`.
 * @returns {Promise<{ roomId: string, bookedRanges: { checkIn: string, checkOut: string, stayTone?: string }[] }>}
 */
export async function fetchRoomGuestOccupancy(roomId, from, to) {
  const id = String(roomId || '').trim()
  const params = new URLSearchParams()
  if (from) params.set('from', String(from).trim())
  if (to) params.set('to', String(to).trim())
  const q = params.toString()
  const res = await fetch(
    backendUrl(`/api/rooms/${encodeURIComponent(id)}/guest-occupancy${q ? `?${q}` : ''}`),
    { headers: { Accept: 'application/json' } },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    roomId: typeof data.roomId === 'string' ? data.roomId : id,
    bookedRanges: Array.isArray(data.bookedRanges) ? data.bookedRanges : [],
  }
}

function authJsonHeaders() {
  const token = getStoredAuthToken()
  if (!token) {
    const err = new Error('Not signed in')
    err.code = 'NO_TOKEN'
    throw err
  }
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Approve/reject and similar staff actions: Vite dev often surfaces a dead API as HTTP 502 from the proxy.
 */
function bookingStaffActionErrorMessage(status, dataError) {
  const fromApi = dataError != null && String(dataError).trim() ? String(dataError).trim() : ''
  if (fromApi) return fromApi
  if (status === 502 || status === 503 || status === 504) {
    const hasCustomBase = Boolean(String(import.meta.env.VITE_API_BASE_URL || '').trim())
    if (hasCustomBase) {
      return `The API returned ${status}. Check VITE_API_BASE_URL and that the backend process is running and reachable.`
    }
    return (
      `The hotel API could not be reached (${status}). ` +
      `For local development: in a separate terminal run “cd be/abela-be && npm run dev” so the server listens on port 5000 ` +
      `(the Vite dev server proxies /api to http://localhost:5000).`
    )
  }
  return `Request failed (${status}).`
}

/**
 * GET /api/event-venues — Bearer + frontdesk, housekeeping, or admin (`be/abela-be`).
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
export async function fetchEventVenuesBackend() {
  const res = await fetch(backendUrl('/api/event-venues'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.eventVenues) ? data.eventVenues : []
}

/**
 * POST /api/rooms — Bearer + admin (`be/abela-be/README.md`).
 * @param {{ roomNumber: string, package: string, price: number, guests: number, image?: string, description?: string, features?: string[] }} body
 */
export async function createRoomBackend(body) {
  const res = await fetch(backendUrl('/api/rooms'), {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.room
}

export { uploadRoomImageDirectBackend } from './imageUploadApi'

/**
 * PATCH /api/rooms/:id
 * @param {string} id
 * @param {Record<string, unknown>} body — partial room fields
 */
export async function updateRoomBackend(id, body) {
  const res = await fetch(backendUrl(`/api/rooms/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.room
}

/**
 * PATCH /api/rooms/:id/housekeeping-status — front desk or admin only.
 * @param {string} roomId
 * @param {'needs_cleaning'|'ready'|'available'} status
 */
export async function patchRoomHousekeepingStatusBackend(roomId, status) {
  const res = await fetch(
    backendUrl(`/api/rooms/${encodeURIComponent(roomId)}/housekeeping-status`),
    {
      method: 'PATCH',
      headers: authJsonHeaders(),
      body: JSON.stringify({ status }),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.room
}

/**
 * PATCH /api/event-venues/:id/housekeeping-status — front desk or admin only.
 * @param {string} venueId
 * @param {'needs_cleaning'|'ready'|'available'} status
 */
export async function patchEventVenueHousekeepingStatusBackend(venueId, status) {
  const res = await fetch(
    backendUrl(`/api/event-venues/${encodeURIComponent(venueId)}/housekeeping-status`),
    {
      method: 'PATCH',
      headers: authJsonHeaders(),
      body: JSON.stringify({ status }),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.eventVenue
}

/** DELETE /api/rooms/:id */
export async function deleteRoomBackend(id) {
  const res = await fetch(backendUrl(`/api/rooms/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/**
 * GET /api/bookings/event-calendar — public; all blocking event bookings for venue date pickers.
 * (Guest GET /api/bookings is scoped to the signed-in user only, so calendars must use this.)
 */
export async function fetchGuestEventCalendarBookings() {
  const res = await fetch(backendUrl('/api/bookings/event-calendar'))
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.bookings) ? data.bookings : []
}

/**
 * GET /api/bookings — Bearer; guests see own rows, staff see all (`be/abela-be/README.md`).
 */
export async function fetchBookingsBackend() {
  const res = await fetch(backendUrl('/api/bookings'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.bookings) ? data.bookings : []
}

/** GET /api/bookings/:id — Bearer; guest sees own row, staff sees any (`booking.service` getById). */
export async function fetchBookingByIdBackend(id) {
  const res = await fetch(backendUrl(`/api/bookings/${encodeURIComponent(id)}`), {
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.booking ?? null
}

/**
 * POST /api/bookings — requires JWT; `userId` set server-side from token.
 * @param {Record<string, unknown>} body — must include `type` `room` | `event` and required fields per type
 */
export async function createBookingBackend(body) {
  /** Must run outside the fetch `try` so `NO_TOKEN` is never mislabeled as a network failure. */
  let headers
  try {
    headers = authJsonHeaders()
  } catch (e) {
    throw e
  }

  let res
  try {
    res = await fetch(backendUrl('/api/bookings'), {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
  } catch (e) {
    const err = new Error(
      e && typeof e.message === 'string' && e.message
        ? e.message
        : 'Network error',
    )
    err.code = 'NETWORK'
    throw err
  }

  let data = {}
  try {
    const text = await res.text()
    if (text) data = JSON.parse(text)
  } catch {
    data = {}
  }
  if (!res.ok) {
    const backendMsg =
      (typeof data.error === 'string' && data.error.trim()) ||
      (typeof data.message === 'string' && data.message.trim()) ||
      ''
    const err = new Error(backendMsg || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.booking
}

/**
 * Message for alert() when POST /api/bookings fails (room or event form).
 * @param {unknown} err
 */
export function bookingSaveAlertMessage(err) {
  if (err && typeof err === 'object' && err.code === 'NO_TOKEN') {
    return 'You are not signed in. Open Login, sign in with your guest email and password, then return to Rooms and submit again.'
  }
  if (err && typeof err === 'object' && err.code === 'NETWORK') {
    return 'Cannot reach the server. Start the API on port 5000 (in folder be/abela-be run npm run dev), keep the frontend on npm run dev so /api proxies to port 5000, then try again.'
  }
  const msg = err && typeof err.message === 'string' ? err.message : ''
  const name = err && typeof err === 'object' && err.name != null ? String(err.name) : ''
  if (
    name === 'TypeError' ||
    /failed to fetch/i.test(msg) ||
    /networkerror/i.test(msg) ||
    /load failed/i.test(msg)
  ) {
    return 'Cannot reach the server. Start the API on port 5000 (in folder be/abela-be run npm run dev), keep the frontend on npm run dev so /api proxies to port 5000, then try again.'
  }
  const status =
    err && typeof err === 'object' && err.status != null && Number.isFinite(Number(err.status))
      ? Number(err.status)
      : NaN
  if (status === 401) {
    return 'Your session expired or is invalid. Open Login, sign in again as a guest, then return to Rooms and submit your reservation.'
  }
  if (status === 403) {
    return 'This account is not allowed to create that booking. Sign in with a guest account or contact the hotel.'
  }
  /** Vite dev proxy returns 502 when nothing answers on localhost:5000. */
  if (status === 502 || status === 503) {
    return (
      'Could not reach the hotel API (bad gateway). The frontend proxies /api to port 5000. ' +
      'In a separate terminal, go to folder be/abela-be and run: npm run dev ' +
      '(leave it running). Or from fe/abela-fe run: npm run dev:with-api to start API + Vite together. ' +
      'Then submit your reservation again.'
    )
  }
  if (status >= 500) {
    const genericHttp = /^HTTP \d{3}$/i.test(String(msg || '').trim())
    if (msg && msg.trim() && msg !== 'Internal server error' && !genericHttp) {
      return msg
    }
    return 'The server had an error saving your booking. Check the backend terminal and MongoDB connection, then try again.'
  }
  if (msg && !/^HTTP \d+$/.test(msg.trim())) {
    return msg
  }
  if (Number.isFinite(status)) {
    return `Booking could not be saved (HTTP ${status}). Sign in on Login if you have not, confirm the backend is running on port 5000, then try again.`
  }
  return 'Could not save your booking. Sign in on Login with a guest account, ensure the backend is running on port 5000, then try again.'
}

/** GET /api/bookings/pending — Bearer + frontdesk or admin */
export async function fetchPendingBookingsBackend() {
  const res = await fetch(backendUrl('/api/bookings/pending'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.bookings) ? data.bookings : []
}

/** GET /api/bookings/history — approved / rejected / legacy declined (Bearer + frontdesk or admin) */
export async function fetchBookingApprovalHistoryBackend() {
  const res = await fetch(backendUrl('/api/bookings/history'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.bookings) ? data.bookings : []
}

/** GET /api/staff-notifications — persisted alerts when a guest submits a booking (Bearer + frontdesk or admin) */
export async function fetchStaffNotificationsBackend() {
  const res = await fetch(backendUrl('/api/staff-notifications'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** PATCH /api/staff-notifications/read-all */
export async function markAllStaffNotificationsReadBackend() {
  const res = await fetch(backendUrl('/api/staff-notifications/read-all'), {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** GET /api/notifications — role-aware unified notifications feed (guest + frontdesk/admin). */
export async function fetchNotificationsBackend() {
  const res = await fetch(backendUrl('/api/notifications'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** PUT /api/notifications/:id/read */
export async function markNotificationReadBackend(id) {
  const res = await fetch(backendUrl(`/api/notifications/${encodeURIComponent(id)}/read`), {
    method: 'PUT',
    headers: authJsonHeaders(),
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.notification || null
}

/** PUT /api/notifications/read-all */
export async function markAllNotificationsReadBackend() {
  const res = await fetch(backendUrl('/api/notifications/read-all'), {
    method: 'PUT',
    headers: authJsonHeaders(),
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** PUT /api/bookings/:id/approve — Bearer + frontdesk or admin */
export async function approveBookingBackend(id) {
  const url = backendUrl(`/api/bookings/${encodeURIComponent(id)}/approve`)
  let res
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: authJsonHeaders(),
      body: JSON.stringify({}),
    })
  } catch (e) {
    const err = new Error(
      'Network error: could not reach the hotel API. In local dev, start the backend with “cd be/abela-be && npm run dev” (default port 5000).',
    )
    err.status = 0
    err.cause = e
    throw err
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(bookingStaffActionErrorMessage(res.status, data.error))
    err.status = res.status
    throw err
  }
  return data.booking
}

/** PUT /api/bookings/:id/reject — optional body `{ reason }` */
export async function rejectBookingBackend(id, reason) {
  const url = backendUrl(`/api/bookings/${encodeURIComponent(id)}/reject`)
  let res
  try {
    res = await fetch(url, {
      method: 'PUT',
      headers: authJsonHeaders(),
      body: JSON.stringify(reason != null && reason !== '' ? { reason: String(reason) } : {}),
    })
  } catch (e) {
    const err = new Error(
      'Network error: could not reach the hotel API. In local dev, start the backend with “cd be/abela-be && npm run dev” (default port 5000).',
    )
    err.status = 0
    err.cause = e
    throw err
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(bookingStaffActionErrorMessage(res.status, data.error))
    err.status = res.status
    throw err
  }
  return data.booking
}

/** GET /api/users/me — Bearer; full profile for topbar (name, email, phone, role). */
export async function fetchCurrentUserMeBackend() {
  const res = await fetch(backendUrl('/api/users/me'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** GET /api/users/me/notifications — Bearer; booking approve/reject alerts for the signed-in guest */
export async function fetchGuestNotificationsBackend() {
  const res = await fetch(backendUrl('/api/users/me/notifications'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    notifications: Array.isArray(data.notifications) ? data.notifications : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  }
}

/** PATCH /api/users/me/notifications/read-all */
export async function markAllGuestNotificationsReadBackend() {
  const res = await fetch(backendUrl('/api/users/me/notifications/read-all'), {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** PATCH /api/bookings/:id */
export async function patchBookingBackend(id, body) {
  const res = await fetch(backendUrl(`/api/bookings/${encodeURIComponent(id)}`), {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(bookingStaffActionErrorMessage(res.status, data.error))
    err.status = res.status
    throw err
  }
  return data.booking
}

/** DELETE /api/bookings/:id — staff (admin/frontdesk) or owning guest */
export async function deleteBookingBackend(id) {
  const res = await fetch(backendUrl(`/api/bookings/${encodeURIComponent(id)}`), {
    method: 'DELETE',
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** GET /api/housekeeping/tasks — Bearer; housekeeping or admin */
export async function fetchHousekeepingTasksBackend(includeCompleted = false) {
  const q = includeCompleted ? '?includeCompleted=1' : ''
  const res = await fetch(backendUrl(`/api/housekeeping/tasks${q}`), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.tasks) ? data.tasks : []
}

/** GET /api/housekeeping/team — active housekeeping staff names (Bearer; HK / FD / admin). */
export async function fetchHousekeepingTeamBackend() {
  const res = await fetch(backendUrl('/api/housekeeping/team'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.members) ? data.members : []
}

/**
 * GET /api/housekeeping/recent-cleaning — Bearer; frontdesk, housekeeping, or admin.
 * Rooms/events with status needs_cleaning, newest updatedAt first.
 * @param {number} [limit=10]
 */
export async function fetchHousekeepingRecentCleaningBackend(limit = 10) {
  const q = Number.isFinite(Number(limit)) && Number(limit) > 0 ? `?limit=${encodeURIComponent(String(limit))}` : ''
  const res = await fetch(backendUrl(`/api/housekeeping/recent-cleaning${q}`), {
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.recentCleaning) ? data.recentCleaning : []
}

/** POST /api/housekeeping/reconcile-missing — backfill tasks for approved bookings missing a row */
export async function postHousekeepingReconcileMissingBackend() {
  const res = await fetch(backendUrl("/api/housekeeping/reconcile-missing"), {
    method: "POST",
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/**
 * PUT /api/housekeeping/:id/status — body `{ status: 'in_progress' | 'completed' }`
 * @param {string} taskId
 * @param {'in_progress' | 'completed'} status
 */
export async function putHousekeepingTaskStatusBackend(taskId, status) {
  const res = await fetch(backendUrl(`/api/housekeeping/${encodeURIComponent(taskId)}/status`), {
    method: 'PUT',
    headers: authJsonHeaders(),
    body: JSON.stringify({ status }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  dispatchHousekeepingTasksRefresh()
  if (String(status).toLowerCase() === 'completed') {
    dispatchFrontdeskNotificationsRefresh()
  }
  return data.task
}

/**
 * DELETE /api/housekeeping/tasks/:id — Bearer; housekeeping or admin
 */
export async function deleteHousekeepingTaskBackend(taskId) {
  const res = await fetch(backendUrl(`/api/housekeeping/tasks/${encodeURIComponent(taskId)}`), {
    method: 'DELETE',
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  dispatchHousekeepingTasksRefresh()
  return data
}

/** GET /api/guests/me — Bearer; hotel guest profile linked to the user */
export async function fetchGuestMeBackend() {
  const res = await fetch(backendUrl('/api/guests/me'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** PATCH /api/guests/me — Bearer; partial update { displayName?, email?, phone?, address?, profilePhotoData? } */
export async function patchGuestMeBackend(body) {
  const res = await fetch(backendUrl('/api/guests/me'), {
    method: 'PATCH',
    headers: authJsonHeaders(),
    body: JSON.stringify(body || {}),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** GET /api/billing/my — Bearer + guest role */
export async function fetchMyBillingRecordsBackend() {
  const res = await fetch(backendUrl('/api/billing/my'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.records) ? data.records : []
}

/** GET /api/billing — Bearer + cashier, frontdesk, or admin */
export async function fetchAllBillingRecordsBackend() {
  const res = await fetch(backendUrl('/api/billing'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.records) ? data.records : []
}

/** GET /api/billing/:id — Bearer; owner guest or staff */
export async function fetchBillingRecordByIdBackend(id) {
  const res = await fetch(backendUrl(`/api/billing/${encodeURIComponent(id)}`), {
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** PUT /api/billing/:id/payment — Bearer + cashier or admin; body `{ amountPaid: number }` */
export async function updateBillingPaymentBackend(id, body) {
  const res = await fetch(backendUrl(`/api/billing/${encodeURIComponent(id)}/payment`), {
    method: 'PUT',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** GET /api/frontdesk/summary — Bearer + frontdesk/admin; DB-aligned dashboard metrics */
export async function fetchFrontdeskDashboardSummaryBackend() {
  const res = await fetch(backendUrl('/api/frontdesk/summary'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return {
    reservationsToday: typeof data.reservationsToday === 'number' ? data.reservationsToday : 0,
    checkOutsToday: typeof data.checkOutsToday === 'number' ? data.checkOutsToday : 0,
    totalRevenue: typeof data.totalRevenue === 'number' ? data.totalRevenue : 0,
    outstandingBalances: typeof data.outstandingBalances === 'number' ? data.outstandingBalances : 0,
  }
}

/**
 * GET /api/frontdesk/dashboard-bundle — Bearer + frontdesk/admin; one optimized payload for the admin dashboard.
 * @returns {Promise<{ summary: { reservationsToday: number, checkOutsToday: number, totalRevenue: number, outstandingBalances: number } | null, availableRoomsCount: number, bookingsLite: object[] }>}
 */
export async function fetchFrontdeskDashboardBundleBackend() {
  const res = await fetch(backendUrl('/api/frontdesk/dashboard-bundle'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  const s = data.summary && typeof data.summary === 'object' ? data.summary : null
  return {
    summary: s
      ? {
          reservationsToday: typeof s.reservationsToday === 'number' ? s.reservationsToday : 0,
          checkOutsToday: typeof s.checkOutsToday === 'number' ? s.checkOutsToday : 0,
          totalRevenue: typeof s.totalRevenue === 'number' ? s.totalRevenue : 0,
          outstandingBalances: typeof s.outstandingBalances === 'number' ? s.outstandingBalances : 0,
        }
      : null,
    availableRoomsCount: typeof data.availableRoomsCount === 'number' ? data.availableRoomsCount : 0,
    bookingsLite: Array.isArray(data.bookingsLite) ? data.bookingsLite : [],
  }
}

/** GET /api/frontdesk/bookings/:id — Bearer + frontdesk/admin; unified guest/booking/billing/housekeeping. */
export async function fetchFrontdeskBookingDetailsBackend(id) {
  const res = await fetch(backendUrl(`/api/frontdesk/bookings/${encodeURIComponent(id)}`), {
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data
}

/** GET /api/testimonials — public; approved reviews for landing page */
export async function fetchTestimonialsPublic() {
  const res = await fetch(backendUrl('/api/testimonials'), { headers: { Accept: 'application/json' } })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.testimonials) ? data.testimonials : []
}

/** POST /api/reviews — Bearer + guest; body { bookingId, rating, comment } */
export async function submitGuestReviewBackend(body) {
  const res = await fetch(backendUrl('/api/reviews'), {
    method: 'POST',
    headers: authJsonHeaders(),
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.review
}

/** GET /api/reviews/me — Bearer + guest */
export async function fetchMyReviewsBackend() {
  const res = await fetch(backendUrl('/api/reviews/me'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.reviews) ? data.reviews : []
}

/** GET /api/reviews — Bearer + frontdesk/admin */
export async function fetchAllReviewsStaffBackend() {
  const res = await fetch(backendUrl('/api/reviews'), { headers: authJsonHeaders() })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return Array.isArray(data.reviews) ? data.reviews : []
}

/** PUT /api/reviews/:id/approve — Bearer + frontdesk/admin */
export async function approveReviewStaffBackend(reviewId) {
  const res = await fetch(backendUrl(`/api/reviews/${encodeURIComponent(reviewId)}/approve`), {
    method: 'PUT',
    headers: authJsonHeaders(),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  return data.review
}
