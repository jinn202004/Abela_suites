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

/** Add n calendar days in local time (n may be negative). */
export function addLocalDays(ymd, n) {
  const d = parseLocalYmd(ymd);
  if (!d) return "";
  d.setDate(d.getDate() + n);
  return formatLocalYmd(d);
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
