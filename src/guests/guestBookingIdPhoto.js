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



/**

 * Image src for the government ID on a booking from GET /api/bookings.

 * Prefer linked Guest profile (`guest.validIdPhotoData`) — same upload as frontdesk sees.

 * @param {object} row

 * @returns {string | null}

 */

export function resolveGuestIdImageSrc(row) {

  if (!row || typeof row !== "object") return null;



  const rawData =

    row.guest?.validIdPhotoData ??

    row.guestIdPhotoData ??

    row.validIdPhotoData ??

    row.guest?.guestIdPhotoData ??

    "";



  if (typeof rawData === "string") {

    const data = rawData.trim();

    if (data.startsWith("data:image")) return data;

    if (data.startsWith("http://") || data.startsWith("https://")) return data;

  }



  const rawName =

    row.guest?.validIdPhotoName ?? row.guestIdPhotoName ?? row.guest?.guestIdPhotoName ?? "";



  if (typeof rawName !== "string") return null;

  const name = rawName.trim();

  if (name.startsWith("data:image")) return name;

  if (isPlaceholderIdName(name)) return null;



  if (name.startsWith("http://") || name.startsWith("https://")) return name;

  if (name.startsWith("/")) return name;

  if (name.includes("/")) return name;

  if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) return `/${name.replace(/^\/+/, "")}`;



  return null;

}


