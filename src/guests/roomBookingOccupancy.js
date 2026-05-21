import { fetchRoomAvailabilityWindow, fetchRoomGuestOccupancy } from "../api/guestApi";
import { addLocalDays, stayToneFromStatus } from "./roomStayDates";

export function stayRangeKey(checkIn, checkOut) {
  return `${String(checkIn ?? "").trim()}|${String(checkOut ?? "").trim()}`;
}

/**
 * Merge per-room ranges: `primary` from guest-occupancy (includes stayTone); `secondary` from
 * availability API (blocking overlaps, no tone). Primary wins on overlapping keys.
 */
export function mergeRoomBookedRanges(primary, secondary) {
  const m = new Map();
  for (const r of secondary || []) {
    const ci = String(r?.checkIn ?? "").trim();
    const co = String(r?.checkOut ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ci) || !/^\d{4}-\d{2}-\d{2}$/.test(co) || co <= ci) continue;
    const k = stayRangeKey(ci, co);
    if (!m.has(k)) m.set(k, { checkIn: ci, checkOut: co, stayTone: "pending" });
  }
  for (const r of primary || []) {
    const ci = String(r?.checkIn ?? "").trim();
    const co = String(r?.checkOut ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ci) || !/^\d{4}-\d{2}-\d{2}$/.test(co) || co <= ci) continue;
    const k = stayRangeKey(ci, co);
    m.set(k, { checkIn: ci, checkOut: co, stayTone: stayToneFromStatus(r?.stayTone ?? "pending") });
  }
  return [...m.values()].sort((a, b) =>
    a.checkIn !== b.checkIn ? a.checkIn.localeCompare(b.checkIn) : a.checkOut.localeCompare(b.checkOut),
  );
}

/**
 * Load blocking stays for one room: guest-occupancy merged with availability for the same window.
 * @returns {Promise<{ ranges: Array<{ checkIn: string, checkOut: string, stayTone?: string }>, primaryErr: string | null }>}
 */
export async function fetchRoomBookedRangesMerged(roomId, fromYmd, toYmd) {
  const id = String(roomId || "").trim();
  let primary = [];
  let primaryErr = null;
  try {
    const data = await fetchRoomGuestOccupancy(id, fromYmd, toYmd);
    primary = Array.isArray(data.bookedRanges) ? data.bookedRanges : [];
  } catch (e) {
    primaryErr = e?.message || String(e);
  }
  let secondary = [];
  try {
    const winEnd = addLocalDays(toYmd, 1);
    const av = await fetchRoomAvailabilityWindow(fromYmd, winEnd);
    secondary = (Array.isArray(av.bookedRanges) ? av.bookedRanges : [])
      .filter((b) => String(b?.roomId ?? "").trim() === id)
      .map((b) => ({
        checkIn: String(b.checkIn ?? "").trim(),
        checkOut: String(b.checkOut ?? "").trim(),
      }));
  } catch {
    /* ignore */
  }
  const ranges = mergeRoomBookedRanges(primary, secondary);
  return { ranges, primaryErr };
}

export function formatStayYmdLong(ymd) {
  const d = parseLocalYmd(String(ymd || "").trim());
  if (!d) return String(ymd || "").trim() || "—";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
