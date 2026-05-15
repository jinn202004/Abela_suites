/**
 * Shared event venue time math (guest + front desk). Uses same wall-clock HH:MM and 2h buffer as the API.
 */

export const EVENT_CLEANING_BUFFER_HOURS = 2;
export const EVENT_CLEANING_BUFFER_MINUTES = EVENT_CLEANING_BUFFER_HOURS * 60;
export const EVENT_BASE_INCLUDED_HOURS = 3;
export const EVENT_EXTRA_HOUR_FLAT_RATE = 1000;

const HHMM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/** @returns {{ startMin: number, endMin: number } | null} */
export function parseEventStartEndMinutes(startTime, endTime) {
  const st = String(startTime || "").trim();
  const et = String(endTime || "").trim();
  const ms = HHMM_RE.exec(st);
  const me = HHMM_RE.exec(et);
  if (!ms || !me) return null;
  const a = Number(ms[1]) * 60 + Number(ms[2]);
  const b = Number(me[1]) * 60 + Number(me[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return null;
  return { startMin: a, endMin: b };
}

/** Decimal hours between same-day start/end (for billing). */
export function durationHoursDecimalFromTimes(startTime, endTime) {
  const p = parseEventStartEndMinutes(startTime, endTime);
  if (!p) return 0;
  return (p.endMin - p.startMin) / 60;
}

export function ymdLocalMidnightMs(ymd) {
  const parts = String(ymd || "")
    .trim()
    .split("-")
    .map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return NaN;
  const [y, mo, d] = parts;
  return new Date(y, mo - 1, d, 0, 0, 0, 0).getTime();
}

/**
 * @returns {{ eventStartMs: number, blockedEndMs: number } | null}
 * @param {string} calendarDayYmd
 * @param {{ eventDate?: string, eventEndDate?: string, startTime?: string, endTime?: string }} row
 */
export function eventBlockingWindowOnCalendarDay(row, calendarDayYmd) {
  const norm = (v) => {
    if (v == null || v === "") return "";
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    if (s.includes("T")) return s.slice(0, 10);
    return s.length >= 10 ? s.slice(0, 10) : "";
  };
  const d0 = norm(row.eventDate);
  const d1 = norm(row.eventEndDate || row.eventDate) || d0;
  if (!calendarDayYmd || calendarDayYmd < d0 || calendarDayYmd > d1) return null;
  const dayMs = ymdLocalMidnightMs(calendarDayYmd);
  if (Number.isNaN(dayMs)) return null;
  const parsed = parseEventStartEndMinutes(row.startTime, row.endTime);
  if (parsed && d0 === d1 && calendarDayYmd === d0) {
    const eventStartMs = dayMs + parsed.startMin * 60 * 1000;
    const eventEndMs = dayMs + parsed.endMin * 60 * 1000;
    const blockedEndMs = eventEndMs + EVENT_CLEANING_BUFFER_MINUTES * 60 * 1000;
    return { eventStartMs, blockedEndMs };
  }
  const eventStartMs = dayMs;
  const blockedEndMs = dayMs + 24 * 60 * 60 * 1000 + EVENT_CLEANING_BUFFER_MINUTES * 60 * 1000;
  return { eventStartMs, blockedEndMs };
}

export function intervalsOverlapMs(a0, a1, b0, b1) {
  return a0 < b1 && b0 < a1;
}

/**
 * @param {string} venueId
 * @param {string} eventDateYmd
 * @param {string} startTime HH:MM
 * @param {string} endTime HH:MM
 * @param {Array<Record<string, unknown>>} calendarRows from GET /api/bookings/event-calendar
 * @param {{ excludeBookingId?: string }} [opts]
 */
export function eventNewRangeOverlapsExisting(venueId, eventDateYmd, startTime, endTime, calendarRows, opts = {}) {
  const vid = String(venueId || "").trim().toLowerCase();
  const exclude = String(opts.excludeBookingId || "").trim();
  const parsed = parseEventStartEndMinutes(startTime, endTime);
  if (!vid || !eventDateYmd || !parsed) return false;
  const dayMs = ymdLocalMidnightMs(eventDateYmd);
  if (Number.isNaN(dayMs)) return false;
  const newStartMs = dayMs + parsed.startMin * 60 * 1000;
  const newEndMs = dayMs + parsed.endMin * 60 * 1000;
  const newBlockedEndMs = newEndMs + EVENT_CLEANING_BUFFER_MINUTES * 60 * 1000;

  const rows = Array.isArray(calendarRows) ? calendarRows : [];
  for (const row of rows) {
    const rv = String(row.eventVenueId ?? "").trim().toLowerCase();
    if (rv !== vid) continue;
    const id = String(row.id ?? row._id ?? "").trim();
    if (exclude && id && exclude === id) continue;
    const iv = eventBlockingWindowOnCalendarDay(row, eventDateYmd);
    if (!iv) continue;
    if (intervalsOverlapMs(newStartMs, newBlockedEndMs, iv.eventStartMs, iv.blockedEndMs)) return true;
  }
  return false;
}

export function formatTime12hFromHHMM(hhmm) {
  const st = String(hhmm || "").trim();
  const re = HHMM_RE.exec(st);
  if (!re) return st || "—";
  const h24 = Number(re[1]);
  const m = Number(re[2]);
  if (!Number.isFinite(h24) || !Number.isFinite(m)) return st || "—";
  const am = h24 < 12;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const mm = String(m).padStart(2, "0");
  return `${h12}:${mm} ${am ? "AM" : "PM"}`;
}

export function buildEventTimeSlotLabel(startTime, endTime) {
  const a = formatTime12hFromHHMM(startTime);
  const b = formatTime12hFromHHMM(endTime);
  if (a === "—" || b === "—") return "";
  return `${a} – ${b}`;
}
