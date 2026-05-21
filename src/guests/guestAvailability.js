/**
 * Shared availability checks for guest room / venue booking UIs.
 */

import { parseEventStartEndMinutes } from "./eventVenueTimeShared";
import { parseLocalYmd, formatLocalYmd } from "./roomStayDates";

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

/** Calendar cell tone for event bookings (occupied | approved | pending). */
export function eventStayToneFromStatus(statusRaw) {
  const st = String(statusRaw ?? "").trim().toLowerCase();
  if (st === "occupied") return "occupied";
  if (st === "approved" || st === "confirmed" || st === "reserved") return "approved";
  if (st === "pending") return "pending";
  return "pending";
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
 * Build `{ venueId, startDate, endDate, status, startTime, endTime }[]` for venue availability / calendars.
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
        startTime: String(b.startTime ?? "").trim(),
        endTime: String(b.endTime ?? "").trim(),
        timeSlot: String(b.timeSlot ?? "").trim(),
        id: String(b.id ?? b._id ?? "").trim(),
      };
    })
    .filter((x) => x.venueId && x.startDate);
}

/**
 * Per-day sets for guest / walk-in event DayPicker (yellow pending, green approved, red occupied).
 * Does not expose guest names in tooltips.
 */
export function guestEventCalendarNightsFromBookedRanges(bookedRanges, venueId) {
  const occupied = new Set();
  const approved = new Set();
  const pending = new Set();
  const dayLabelSuffixByKey = new Map();
  const dayTitleByKey = new Map();
  const vid = String(venueId ?? "").trim().toLowerCase();
  if (!vid || !Array.isArray(bookedRanges)) {
    return { occupied, approved, pending, dayLabelSuffixByKey, dayTitleByKey };
  }

  for (const b of bookedRanges) {
    if (!b || String(b.venueId ?? "").trim().toLowerCase() !== vid) continue;
    const sRaw = String(b.startDate ?? "").trim();
    const eRaw = String(b.endDate ?? "").trim();
    const end = /^\d{4}-\d{2}-\d{2}$/.test(eRaw) ? eRaw : sRaw;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sRaw)) continue;

    const tone = eventStayToneFromStatus(b.status);
    let cur = parseLocalYmd(sRaw);
    const endD = parseLocalYmd(end);
    if (!cur || !endD) continue;
    while (cur <= endD) {
      const key = formatLocalYmd(cur);
      if (tone === "occupied") {
        occupied.add(key);
        approved.delete(key);
        pending.delete(key);
      } else if (tone === "approved") {
        if (!occupied.has(key)) {
          approved.add(key);
          pending.delete(key);
        }
      } else if (!occupied.has(key) && !approved.has(key)) {
        pending.add(key);
      }
      cur = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate() + 1, 12, 0, 0, 0);
    }
  }

  for (const key of occupied) {
    dayLabelSuffixByKey.set(key, " This venue has an occupied event on this date.");
    dayTitleByKey.set(key, "Occupied");
  }
  for (const key of approved) {
    if (occupied.has(key)) continue;
    dayLabelSuffixByKey.set(key, " This venue has an approved reservation on this date.");
    dayTitleByKey.set(key, "Approved / Reserved");
  }
  for (const key of pending) {
    if (occupied.has(key) || approved.has(key)) continue;
    dayLabelSuffixByKey.set(key, " This venue has a pending reservation on this date.");
    dayTitleByKey.set(key, "Pending");
  }

  return { occupied, approved, pending, dayLabelSuffixByKey, dayTitleByKey };
}

/** @deprecated Use guestEventCalendarNightsFromBookedRanges — returns occupied + reserved (pending+approved merged). */
export function guestEventCalendarNightsLegacyReserved(bookedRanges, venueId) {
  const { occupied, approved, pending } = guestEventCalendarNightsFromBookedRanges(bookedRanges, venueId);
  const reserved = new Set([...approved, ...pending]);
  return { occupied, reserved };
}

export function isRoomAvailableForDates(roomId, wantIn, wantOut, bookedDates) {
  if (!wantIn || !wantOut || wantIn >= wantOut) return false;
  return !bookedDates.some(
    (b) => b.roomId === roomId && wantIn < b.checkOut && wantOut > b.checkIn,
  );
}

/**
 * Venue list search: block only when date ranges truly conflict.
 * Same-day bookings with start/end times do not block the whole venue for other time slots.
 */
export function isVenueAvailableForDates(venueId, wantStart, wantEnd, bookedDates) {
  if (!wantStart || !wantEnd || wantStart > wantEnd) return false;
  const vid = String(venueId ?? "").trim().toLowerCase();
  if (!vid) return false;

  return !bookedDates.some((b) => {
    if (String(b.venueId ?? "").trim().toLowerCase() !== vid) return false;
    if (wantEnd < b.startDate || wantStart > b.endDate) return false;

    const bEnd = b.endDate || b.startDate;
    const singleDayBooking = b.startDate === bEnd;
    const hasTimes = Boolean(parseEventStartEndMinutes(b.startTime, b.endTime));

    if (singleDayBooking && hasTimes) {
      return false;
    }

    return true;
  });
}
