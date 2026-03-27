/** Parse YYYY-MM-DD or ISO; noon local for date-only to avoid TZ edge cases. */
export function parseBookingDateMs(value) {
  if (value == null || String(value).trim() === '') return 0
  const raw = String(value).trim()
  const d = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`)
  const t = d.getTime()
  return Number.isFinite(t) ? t : 0
}

function compareCreatedDesc(a, b) {
  const ta = new Date(a.createdAt ?? 0).getTime()
  const tb = new Date(b.createdAt ?? 0).getTime()
  return tb - ta
}

/** Newest stay first: check-in desc, then check-out, then created. */
export function sortReservationsByStayDateDesc(list) {
  return [...list].sort((a, b) => {
    const ca = parseBookingDateMs(a.checkIn)
    const cb = parseBookingDateMs(b.checkIn)
    if (cb !== ca) return cb - ca
    const oa = parseBookingDateMs(a.checkOut)
    const ob = parseBookingDateMs(b.checkOut)
    if (ob !== oa) return ob - oa
    return compareCreatedDesc(a, b)
  })
}

/** Newest event first: event start desc, then end, then created. */
export function sortEventBookingsByEventDateDesc(list) {
  return [...list].sort((a, b) => {
    const ca = parseBookingDateMs(a.eventDate)
    const cb = parseBookingDateMs(b.eventDate)
    if (cb !== ca) return cb - ca
    const oa = parseBookingDateMs(a.eventEndDate)
    const ob = parseBookingDateMs(b.eventEndDate)
    if (ob !== oa) return ob - oa
    return compareCreatedDesc(a, b)
  })
}
