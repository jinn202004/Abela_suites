/**
 * Shared availability checks for guest room / venue booking UIs.
 */

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
      return {
        venueId: String(b.eventVenueId ?? "").trim(),
        startDate: start,
        endDate: end || start,
      };
    })
    .filter((x) => x.venueId && x.startDate);
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
  return !bookedDates.some(
    (b) =>
      b.venueId === venueId && !(wantEnd < b.startDate || wantStart > b.endDate),
  );
}
