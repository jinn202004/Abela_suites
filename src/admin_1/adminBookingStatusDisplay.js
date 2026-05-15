/**
 * Admin tables: normalize booking status from API payloads (legacy keys included).
 * @param {Record<string, unknown>} b
 */
export function resolveBookingRawStatus(b) {
  if (!b || typeof b !== "object") return "pending";
  const keys = ["status", "bookingStatus", "reservationStatus", "state"];
  for (const k of keys) {
    const s = String(b[k] ?? "")
      .trim()
      .toLowerCase();
    if (s) return s;
  }
  return "pending";
}

/**
 * Human-readable label aligned with Booking Management (`statusToBadgeLabel`).
 * @param {string} raw — lowercase snake from `resolveBookingRawStatus`
 */
export function formatAdminBookingStatusLabel(raw) {
  const k = String(raw || "")
    .trim()
    .toLowerCase();
  if (k === "approved" || k === "confirmed") return "Approved";
  if (k === "pending") return "Pending approval";
  if (k === "rejected" || k === "declined") return "Rejected";
  if (k === "cancelled") return "Cancelled";
  if (k === "completed") return "Completed";
  if (k === "occupied") return "Occupied";
  if (!k) return "Pending approval";
  return k
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** CSS modifier for `className="rm-badge …"` (see room-management.css / event-management.css). */
export function adminBookingStatusBadgeClass(raw) {
  const k = String(raw || "")
    .trim()
    .toLowerCase();
  if (k === "approved" || k === "confirmed" || k === "completed") return "badge-approved";
  if (k === "pending") return "badge-pending";
  if (k === "rejected" || k === "declined") return "badge-rejected";
  if (k === "cancelled") return "badge-cancelled";
  if (k === "occupied") return "badge-occupied";
  return "badge-neutral";
}

/** CSS modifier for event venue catalog rows (`className="rm-badge …"`). */
export function adminVenueOpsBadgeClass(raw) {
  const k = String(raw || "")
    .trim()
    .toLowerCase();
  if (!k || k === "available") return "badge-approved";
  if (k === "ready") return "badge-approved";
  if (k === "occupied") return "badge-occupied";
  if (k === "needs_cleaning") return "badge-rejected";
  if (k === "cleaning_in_progress") return "badge-pending";
  return "badge-neutral";
}
