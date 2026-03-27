/** Room reservation workflow — stored lowercase in API. */
export const ROOM_RESERVATION_STATUSES = ['pending', 'approved', 'declined']

/**
 * @param {unknown} raw — `reservation.status` from API
 * @returns {'pending' | 'approved' | 'declined'}
 */
export function normalizeRoomReservationStatus(raw) {
  if (raw == null || raw === '') return 'pending'
  const s = String(raw).trim().toLowerCase()
  if (s === 'approved' || s === 'confirmed') return 'approved'
  if (s === 'declined' || s === 'rejected' || s === 'cancelled') return 'declined'
  if (s === 'pending') return 'pending'
  return 'pending'
}

/**
 * @param {unknown} raw
 * @returns {string} Title case for UI
 */
export function formatRoomReservationStatusLabel(raw) {
  const key = normalizeRoomReservationStatus(raw)
  const labels = {
    pending: 'Pending',
    approved: 'Approved',
    declined: 'Declined',
  }
  return labels[key]
}

/**
 * @param {unknown} raw
 * @returns {string} guest-bookings__status-pill--*
 */
export function guestRoomReservationPillClass(raw) {
  const key = normalizeRoomReservationStatus(raw)
  if (key === 'pending') return 'guest-bookings__status-pill--pending'
  if (key === 'approved') return 'guest-bookings__status-pill--ok'
  return 'guest-bookings__status-pill--declined'
}

/**
 * @param {unknown} raw
 * @returns {string} fd-room-res__pill--*
 */
export function frontDeskRoomReservationPillClass(raw) {
  const key = normalizeRoomReservationStatus(raw)
  if (key === 'pending') return 'fd-room-res__pill fd-room-res__pill--pending'
  if (key === 'approved') return 'fd-room-res__pill fd-room-res__pill--ok'
  return 'fd-room-res__pill fd-room-res__pill--declined'
}
