import { getApiBase } from './config'

async function request(path, options = {}) {
  const base = getApiBase()
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`
  const headers = {
    Accept: 'application/json',
    ...options.headers,
  }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    throw err
  }
  if (res.status === 204) return null
  return res.json()
}

export function fetchRooms() {
  return request('/rooms')
}

/** POST body without `id`; json-server assigns the next id. */
export function createRoom(room) {
  return request('/rooms', {
    method: 'POST',
    body: JSON.stringify(room),
  })
}

/** @param {string | number} id */
export function updateRoom(id, room) {
  return request(`/rooms/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...room, id }),
  })
}

export function deleteRoom(id) {
  return request(`/rooms/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function fetchNotifications() {
  return request('/notifications')
}

/**
 * @param {{ message: string, date?: string, audience?: 'guest' | 'staff' }} data
 */
export function createNotification(data) {
  return request('/notifications', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function fetchReservations() {
  return request('/reservations')
}

/**
 * @param {Record<string, unknown>} data — reservation fields (JSON-serializable)
 */
export function createReservation(data) {
  return request('/reservations', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** @param {string | number} id */
export function updateReservation(id, data) {
  return request(`/reservations/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, id }),
  })
}

export function fetchEventVenues() {
  return request('/eventVenues')
}

export function createEventVenue(venue) {
  return request('/eventVenues', {
    method: 'POST',
    body: JSON.stringify(venue),
  })
}

/** @param {string | number} id */
export function updateEventVenue(id, venue) {
  return request(`/eventVenues/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...venue, id }),
  })
}

/** @param {string | number} id */
export function deleteEventVenue(id) {
  return request(`/eventVenues/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export function fetchEventBookings() {
  return request('/eventBookings')
}

/**
 * @param {Record<string, unknown>} data — event booking fields (JSON-serializable)
 */
export function createEventBooking(data) {
  return request('/eventBookings', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** @param {string | number} id */
export function updateEventBooking(id, data) {
  return request(`/eventBookings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, id }),
  })
}

export function fetchStaff() {
  return request('/staff')
}

/** @param {Record<string, unknown>} data */
export function createStaff(data) {
  return request('/staff', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/** @param {string | number} id */
export function updateStaff(id, data) {
  return request(`/staff/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({ ...data, id }),
  })
}

/** @param {string | number} id */
export function deleteStaff(id) {
  return request(`/staff/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}
