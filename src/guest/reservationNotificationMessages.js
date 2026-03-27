/**
 * @param {{ customerName?: string, roomTitle?: string, checkIn?: string, checkOut?: string }} p
 */
export function buildGuestSubmittedMessage(p) {
  const room = (p.roomTitle && String(p.roomTitle).trim()) || 'your room'
  const ci = p.checkIn != null ? String(p.checkIn).slice(0, 10) : ''
  const co = p.checkOut != null ? String(p.checkOut).slice(0, 10) : ''
  const stay = ci && co ? ` (${ci} → ${co})` : ''
  return `Your reservation for ${room}${stay} was submitted and is pending review.`
}

/**
 * @param {{ customerName?: string, roomTitle?: string, checkIn?: string, checkOut?: string }} p
 */
export function buildStaffNewReservationMessage(p) {
  const name = (p.customerName && String(p.customerName).trim()) || 'Guest'
  const room = (p.roomTitle && String(p.roomTitle).trim()) || 'Room'
  const ci = p.checkIn != null ? String(p.checkIn).slice(0, 10) : '—'
  const co = p.checkOut != null ? String(p.checkOut).slice(0, 10) : '—'
  return `New reservation from ${name}: ${room}, check-in ${ci}, check-out ${co}.`
}

export function buildGuestApprovedMessage(customerName) {
  const n = typeof customerName === 'string' ? customerName.trim() : ''
  return n ? `Hi ${n}, your reservation was approved.` : 'Your reservation was approved.'
}

/**
 * @param {string | undefined} customerName
 * @param {string | undefined} declineReason — shown to the guest when provided
 */
export function buildGuestDeclinedMessage(customerName, declineReason) {
  const n = typeof customerName === 'string' ? customerName.trim() : ''
  const base = n ? `Hi ${n}, your reservation was declined.` : 'Your reservation was declined.'
  const r = typeof declineReason === 'string' ? declineReason.trim() : ''
  if (r) return `${base} Reason: ${r}`
  return base
}

/**
 * @param {{ customerName?: string, roomTitle?: string }} r
 * @param {'approved' | 'declined'} outcome
 * @param {string | undefined} [declineReason] — staff/guest context for declined
 */
export function buildStaffReservationOutcomeMessage(r, outcome, declineReason) {
  const name = (r.customerName && String(r.customerName).trim()) || 'Guest'
  const room = (r.roomTitle && String(r.roomTitle).trim()) || 'Room'
  if (outcome === 'approved') return `Reservation approved: ${name} — ${room}.`
  const base = `Reservation declined: ${name} — ${room}.`
  const rr = typeof declineReason === 'string' ? declineReason.trim() : ''
  return rr ? `${base} Reason: ${rr}` : base
}

/**
 * @param {{ venueName?: string, eventDate?: string, eventTitle?: string }} p
 */
export function buildGuestEventSubmittedMessage(p) {
  const venue = (p.venueName && String(p.venueName).trim()) || 'your venue'
  const ed = p.eventDate != null ? String(p.eventDate).slice(0, 10) : ''
  return ed
    ? `Your event booking at ${venue} on ${ed} was submitted and is pending review.`
    : `Your event booking at ${venue} was submitted and is pending review.`
}

/**
 * @param {{ customerName?: string, venueName?: string, eventDate?: string }} p
 */
export function buildStaffNewEventMessage(p) {
  const name = (p.customerName && String(p.customerName).trim()) || 'Guest'
  const venue = (p.venueName && String(p.venueName).trim()) || 'Venue'
  const ed = p.eventDate != null ? String(p.eventDate).slice(0, 10) : '—'
  return `New event booking from ${name}: ${venue}, date ${ed}.`
}

export function buildGuestEventApprovedMessage(customerName) {
  const n = typeof customerName === 'string' ? customerName.trim() : ''
  return n ? `Hi ${n}, your event booking was approved.` : 'Your event booking was approved.'
}

/**
 * @param {string | undefined} customerName
 * @param {string | undefined} declineReason
 */
export function buildGuestEventDeclinedMessage(customerName, declineReason) {
  const n = typeof customerName === 'string' ? customerName.trim() : ''
  const base = n ? `Hi ${n}, your event booking was declined.` : 'Your event booking was declined.'
  const r = typeof declineReason === 'string' ? declineReason.trim() : ''
  if (r) return `${base} Reason: ${r}`
  return base
}

/**
 * @param {{ customerName?: string, venueName?: string }} r
 * @param {'approved' | 'declined'} outcome
 * @param {string | undefined} [declineReason]
 */
export function buildStaffEventOutcomeMessage(r, outcome, declineReason) {
  const name = (r.customerName && String(r.customerName).trim()) || 'Guest'
  const venue = (r.venueName && String(r.venueName).trim()) || 'Event'
  if (outcome === 'approved') return `Event booking approved: ${name} — ${venue}.`
  const base = `Event booking declined: ${name} — ${venue}.`
  const rr = typeof declineReason === 'string' ? declineReason.trim() : ''
  return rr ? `${base} Reason: ${rr}` : base
}
