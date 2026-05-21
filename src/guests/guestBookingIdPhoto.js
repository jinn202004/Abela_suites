/**

 * Names stored when the real image lives in `*PhotoData` (data URL) — not a file path.

 * Without this, `"uploaded"` becomes `/uploaded` and the ID preview breaks.

 */

const PLACEHOLDER_ID_NAMES = new Set([
  "",
  "uploaded",
  "uploaded.png",
  "none",
  "n/a",
  "na",
  "default.png",
  "pending",
]);

function isPlaceholderIdName(name) {
  if (name == null) return true;
  const s = String(name).trim().toLowerCase();
  return PLACEHOLDER_ID_NAMES.has(s);
}

function isHttpImageUrl(value) {
  const s = String(value || "").trim();
  return /^https?:\/\//i.test(s);
}

/**
 * Government ID image URL for a booking from GET /api/bookings.
 * Uses per-reservation `governmentIdUrl` / `validIdPhotoUrl`, then linked guest S3 URL.
 * Does not resolve local filenames, room images, or placeholder names.
 * @param {object} row
 * @returns {string | null}
 */
export function resolveGovernmentIdUrl(row) {
  if (!row || typeof row !== "object") return null;

  const bookingUrl = String(
    row.governmentIdUrl ?? row.validIdPhotoUrl ?? "",
  ).trim();
  if (isHttpImageUrl(bookingUrl)) return bookingUrl;

  const rawData =
    row.guest?.validIdPhotoData ??
    row.guestIdPhotoData ??
    row.validIdPhotoData ??
    row.guest?.guestIdPhotoData ??
    "";

  if (typeof rawData === "string") {
    const data = rawData.trim();
    if (data.startsWith("data:image")) return data;
    if (isHttpImageUrl(data)) return data;
  }

  const rawName =
    row.guest?.validIdPhotoName ?? row.guestIdPhotoName ?? row.guest?.guestIdPhotoName ?? "";

  if (typeof rawName === "string") {
    const name = rawName.trim();
    if (isHttpImageUrl(name)) return name;
    if (isPlaceholderIdName(name)) return null;
  }

  return null;
}

/** @deprecated Use resolveGovernmentIdUrl */
export const resolveGuestIdImageSrc = resolveGovernmentIdUrl;
