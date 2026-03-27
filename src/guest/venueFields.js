/**
 * Normalize event venue fields from JSON (handles casing quirks and string arrays).
 * @param {Record<string, unknown> | null | undefined} venue
 */

export function venueLocationText(venue) {
  if (!venue || typeof venue !== 'object') return ''
  const raw = venue.location ?? venue.Location ?? venue.address ?? venue.Address
  if (raw == null) return ''
  return String(raw).trim()
}

export function venueDescriptionText(venue) {
  if (!venue || typeof venue !== 'object') return ''
  const raw = venue.description ?? venue.Description ?? venue.desc
  if (raw == null) return ''
  return String(raw).trim()
}

export function venueAmenitiesList(venue) {
  if (!venue || typeof venue !== 'object') return []
  const a = venue.amenities ?? venue.Amenities
  if (Array.isArray(a)) return a.map((x) => String(x).trim()).filter(Boolean)
  if (typeof a === 'string' && a.trim() !== '') {
    return a
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export function venuePriceRaw(venue) {
  if (!venue || typeof venue !== 'object') return ''
  const raw = venue.price ?? venue.Price ?? venue.rate
  if (raw == null) return ''
  return String(raw).trim()
}
