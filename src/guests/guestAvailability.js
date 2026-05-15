/**
 * Shared availability checks for guest room / venue booking UIs.
 */

import { bookingCustomerDisplayName } from "./bookingRoomDisplay";
import { parseLocalYmd, formatLocalYmd } from "./roomStayDates";
import { parseEventStartEndMinutes } from "./eventVenueTimeShared";

function normIsoDate(d) {
  if (d == null || d === "") return "";
  const s = String(d);
  return s.includes("T") ? s.slice(0, 10) : s.trim();
}

/** Bookings that should block a new reservation on the calendar. */
export function bookingStatusBlocksOverlap(status) {
  const s = String(status || "").toLowerCase();
  return !["cancelled", "declined", "rejected", "completed", "checked-out"].includes(s);
}

/**
 * Build `{ roomId, checkIn, checkOut }[]` for `isRoomAvailableForDates` from `GET /api/bookings` rows.
 */
export function roomBookedRangesFromBookings(bookings) {
  if (!Array.isArray(bookings)) return [];
  return bookings
    .filter((b) => b && String(b.type) === "room" && bookingStatusBlocksOverlap(b.status))
    .map((b) => ({
      roomId: String(b.roomId ?? "").trim(),
      checkIn: normIsoDate(b.checkIn),
      checkOut: normIsoDate(b.checkOut),
    }))
    .filter((x) => x.roomId && x.checkIn && x.checkOut);
}

/**
 * Build `{ venueId, startDate, endDate }[]` for `isVenueAvailableForDates` from event booking rows.
 */
export function eventBookedRangesFromBookings(bookings) {
  if (!Array.isArray(bookings)) return [];
  return bookings
    .filter((b) => b && String(b.type) === "event" && bookingStatusBlocksOverlap(b.status))
    .map((b) => {
      const start = normIsoDate(b.eventDate);
      const end = normIsoDate(b.eventEndDate || b.eventDate);
      const status = String(b.status || "").trim().toLowerCase();
      return {
        venueId: String(b.eventVenueId ?? "").trim(),
        startDate: start,
        endDate: end || start,
        status,
        bookedByLabel: bookingCustomerDisplayName(b),
        startTime: String(b.startTime ?? "").trim(),
        endTime: String(b.endTime ?? "").trim(),
        timeSlot: String(b.timeSlot ?? "").trim(),
        id: String(b.id ?? b._id ?? "").trim(),
      };
    })
    .filter((x) => x.venueId && x.startDate);
}

/** Display name for calendar copy when a range has no customer (demo / legacy rows). */
function bookedRangeDisplayName(r) {
  const raw = String(r?.bookedByLabel ?? r?.customerName ?? "").trim();
  if (raw && raw !== "—") return raw;
  return "another guest";
}

/**
 * Per-day occupied vs reserved sets for a guest event DayPicker (same red/gold rules as front desk walk-in).
 * Also returns `dayLabelSuffixByKey` (screen reader / aria-label) and `dayTitleByKey` (short hover titles).
 */
export function guestEventCalendarNightsFromBookedRanges(bookedRanges, venueId) {
  const occupied = new Set();
  const reserved = new Set();
  const occNamesByDay = new Map();
  const resNamesByDay = new Map();
  const vid = String(venueId ?? "").trim().toLowerCase();
  if (!vid || !Array.isArray(bookedRanges)) {
    return { occupied, reserved, dayLabelSuffixByKey: new Map(), dayTitleByKey: new Map() };
  }

  for (const b of bookedRanges) {
    if (!b || String(b.venueId ?? "").trim().toLowerCase() !== vid) continue;
    const sRaw = String(b.startDate ?? "").trim();
    const eRaw = String(b.endDate ?? "").trim();
    const end = /^\d{4}-\d{2}-\d{2}$/.test(eRaw) ? eRaw : sRaw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sRaw)) continue;
    if (sRaw === end && parseEventStartEndMinutes(b.startTime, b.endTime)) continue;
    const isOcc = String(b.status || "").trim().toLowerCase() === "occupied";
    const displayName = bookedRangeDisplayName(b);
    let cur = parseLocalYmd(sRaw);
    const endD = parseLocalYmd(end);
    if (!cur || !endD) continue;
    while (cur <= endD) {
      const key = formatLocalYmd(cur);
      if (isOcc) {
        occupied.add(key);
        reserved.delete(key);
        if (!occNamesByDay.has(key)) occNamesByDay.set(key, new Set());
        occNamesByDay.get(key).add(displayName);
        resNamesByDay.delete(key);
      } else if (!occupied.has(key)) {
        reserved.add(key);
        if (!resNamesByDay.has(key)) resNamesByDay.set(key, new Set());
        resNamesByDay.get(key).add(displayName);
      }
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 12, 0, 0, 0);
    }
  }

  const dayLabelSuffixByKey = new Map();
  const joinSet = (s) => (s && s.size ? [...s].filter(Boolean).join(", ") : "");

  for (const key of occupied) {
    const names = joinSet(occNamesByDay.get(key));
    const who = names ? ` Booked by ${names}.` : "";
    dayLabelSuffixByKey.set(
      key,
      ` This venue has an in-house event (occupied) on this date.${who}`,
    );
  }
  for (const key of reserved) {
    if (occupied.has(key)) continue;
    const names = joinSet(resNamesByDay.get(key));
    const who = names ? ` Reserved by ${names}.` : "";
    dayLabelSuffixByKey.set(
      key,
      ` This venue already has a reserved event on this date.${who}`,
    );
  }

  /** Short labels for native tooltips (sighted users hovering a gold/red cell). */
  const dayTitleByKey = new Map();
  for (const key of occupied) {
    const names = joinSet(occNamesByDay.get(key));
    dayTitleByKey.set(key, names ? `Occupied — ${names}` : "Occupied — in-house event");
  }
  for (const key of reserved) {
    if (occupied.has(key)) continue;
    const names = joinSet(resNamesByDay.get(key));
    dayTitleByKey.set(key, names ? `Reserved — ${names}` : "Reserved — not available");
  }

  return { occupied, reserved, dayLabelSuffixByKey, dayTitleByKey };
}

export function isRoomAvailableForDates(roomId, wantIn, wantOut, bookedDates) {
  if (!wantIn || !wantOut || wantIn >= wantOut) return false;
  return !bookedDates.some(
    (b) => b.roomId === roomId && wantIn < b.checkOut && wantOut > b.checkIn,
  );
}

/** startDate / endDate and wantStart / wantEnd are inclusive YYYY-MM-DD. */
export function isVenueAvailableForDates(venueId, wantStart, wantEnd, bookedDates) {
  if (!wantStart || !wantEnd || wantStart > wantEnd) return false;
  const vid = String(venueId ?? "").trim().toLowerCase();
  if (!vid) return false;
  return !bookedDates.some(
    (b) =>
      String(b.venueId ?? "").trim().toLowerCase() === vid && !(wantEnd < b.startDate || wantStart > b.endDate),
  );
}
