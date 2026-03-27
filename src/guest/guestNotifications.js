/**
 * Fallback when JSON Server is offline — empty so the bell shows no fake items.
 * Live data: `GET /notifications` (see `db.json`).
 */
export const GUEST_NOTIFICATIONS = []

/** When API is offline — staff bell shows no placeholder rows. */
export const STAFF_NOTIFICATIONS_FALLBACK = []
