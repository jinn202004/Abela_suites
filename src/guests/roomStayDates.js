/**
 * Local YYYY-MM-DD helpers for guest stay pickers (avoid UTC off-by-one).
 */

export function parseLocalYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s ?? "").trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatLocalYmd(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${day}`;
}

/** Today's date in the user's local timezone (YYYY-MM-DD). Prefer over `toISOString().slice(0,10)` for pickers. */
export function formatLocalTodayYmd() {
  return formatLocalYmd(new Date());
}

/** Add n calendar days in local time (n may be negative). */
export function addLocalDays(ymd, n) {
  const d = parseLocalYmd(ymd);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return formatLocalYmd(d);
}

/**
 * Nights for hotel billing: [checkIn, checkOut) — checkout morning does not count as a billable night.
 * @returns {number} 0 if dates invalid or check-out is not after check-in
 */
export function countStayNights(checkIn, checkOut) {
  const ci = parseLocalYmd(checkIn);
  const co = parseLocalYmd(checkOut);
  if (!ci || !co || co <= ci) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((co.getTime() - ci.getTime()) / msPerDay);
}

/**
 * Calendar dates that cannot be used as check-in: each night in [checkIn, checkOut).
 * Matches hotel rule: checkout morning frees that calendar day for a new 2pm check-in.
 * @param {Array<{ checkIn: string, checkOut: string }>} ranges
 * @returns {Set<string>}
 */
export function blockedCheckInSetFromRanges(ranges) {
  const set = new Set();
  if (!Array.isArray(ranges)) return set;
  for (const b of ranges) {
    const ci = String(b?.checkIn ?? "").trim();
    const co = String(b?.checkOut ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ci) || !/^\d{4}-\d{2}-\d{2}$/.test(co) || co <= ci) continue;
    let cur = parseLocalYmd(ci);
    const end = parseLocalYmd(co);
    if (!cur || !end) continue;
    while (cur < end) {
      set.add(formatLocalYmd(cur));
      const next = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 12, 0, 0, 0);
      cur = next;
    }
  }
  return set;
}

/** Map API / booking status to calendar cell tone (occupied | approved | pending). */
export function stayToneFromStatus(statusRaw) {
  const st = String(statusRaw ?? "").trim().toLowerCase();
  if (st === "occupied" || st === "completed") return "occupied";
  if (st === "approved" || st === "confirmed" || st === "reserved") return "approved";
  if (st === "pending") return "pending";
  return "pending";
}

/**
 * Split booked nights for calendar styling: occupied (red), approved (green), pending (gold).
 * Overlap priority: occupied > approved > pending.
 * @param {Array<{ checkIn: string, checkOut: string, stayTone?: string, calendarTone?: string }>} ranges
 * @returns {{ occupiedNightSet: Set<string>, approvedNightSet: Set<string>, pendingNightSet: Set<string> }}
 */
export function splitGuestStayNightsByTone(ranges) {
  const occupiedNightSet = new Set();
  const approvedNightSet = new Set();
  const pendingNightSet = new Set();
  if (!Array.isArray(ranges)) return { occupiedNightSet, approvedNightSet, pendingNightSet };
  for (const b of ranges) {
    if (!b) continue;
    const tone = stayToneFromStatus(b?.stayTone ?? b?.calendarTone ?? "pending");
    const nights = blockedCheckInSetFromRanges([b]);
    if (tone === "occupied") {
      nights.forEach((d) => {
        occupiedNightSet.add(d);
        approvedNightSet.delete(d);
        pendingNightSet.delete(d);
      });
    } else if (tone === "approved") {
      nights.forEach((d) => {
        if (!occupiedNightSet.has(d)) {
          approvedNightSet.add(d);
          pendingNightSet.delete(d);
        }
      });
    } else {
      nights.forEach((d) => {
        if (!occupiedNightSet.has(d) && !approvedNightSet.has(d)) pendingNightSet.add(d);
      });
    }
  }
  return { occupiedNightSet, approvedNightSet, pendingNightSet };
}
