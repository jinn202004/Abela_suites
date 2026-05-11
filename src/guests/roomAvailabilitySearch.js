import { isRoomAvailableForDates } from "./guestAvailability";

function fmtRangeLabel(checkIn, checkOut) {
  const a = new Date(`${checkIn}T12:00:00`);
  const b = new Date(`${checkOut}T12:00:00`);
  const o = { month: "short", day: "numeric", year: "numeric" };
  return `${a.toLocaleDateString("en-PH", o)} – ${b.toLocaleDateString("en-PH", o)}`;
}

/**
 * Per-room availability for guest search (dates + PAX vs catalog `maxGuests`).
 * @param {Array<{ id: string, maxGuests: number, name?: string }>} rooms
 * @param {{ bookedRanges: Array<{ roomId: string, checkIn: string, checkOut: string }>, operationallyUnavailableRoomIds?: string[] }} serverWindow
 * @param {string} checkIn YYYY-MM-DD
 * @param {string} checkOut YYYY-MM-DD
 * @param {number|string} pax
 * @returns {{ statuses: Record<string, object>, guests: number, matchingCount: number }}
 */
export function computeRoomAvailabilitySearch(rooms, serverWindow, checkIn, checkOut, pax) {
  const guests = Math.max(1, parseInt(String(pax), 10) || 1);
  const booked = Array.isArray(serverWindow?.bookedRanges) ? serverWindow.bookedRanges : [];
  const ops = new Set((serverWindow?.operationallyUnavailableRoomIds || []).map(String));
  const list = Array.isArray(rooms) ? rooms : [];

  const statuses = {};
  let matchingCount = 0;
  const rangeLabel = fmtRangeLabel(checkIn, checkOut);

  for (const r of list) {
    const rid = String(r.id ?? "").trim();
    const maxG = Math.max(1, Number(r.maxGuests) || 1);
    const guestOk = guests <= maxG;
    const dateOk = isRoomAvailableForDates(rid, checkIn, checkOut, booked) && !ops.has(rid);
    const ok = guestOk && dateOk;
    if (ok) matchingCount += 1;

    let label = "Available";
    if (!guestOk) label = `Max ${maxG} guest${maxG > 1 ? "s" : ""}`;
    else if (ops.has(rid)) label = "Unavailable";
    else if (!dateOk) label = "Booked";

    statuses[rid] = {
      ok,
      label,
      dateLabel: rangeLabel,
      guestOk,
      dateOk,
      paxRequested: guests,
      maxGuests: maxG,
      opsBlocked: ops.has(rid),
    };
  }

  return { statuses, guests, matchingCount };
}
