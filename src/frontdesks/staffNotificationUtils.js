/**

 * Infer which frontdesk reservation screen a staff notification refers to.

 * Explicit `bookingType` from the API wins; otherwise text cues are used.

 * When both "room" and "event"/"venue" appear in the message, room wins (legacy behavior).

 * @param {{ bookingId?: string, bookingType?: string, msg?: string, detail?: string }} n

 * @returns {string | null} pathname with query, or null if no booking id

 */

export function getFrontdeskNotificationBookingPath(n) {

  const bookingId = String(n?.bookingId || "").trim();

  if (!bookingId) return null;

  const bookingType = String(n?.bookingType || "").toLowerCase().trim();

  if (bookingType === "event") {

    return `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`;

  }

  if (bookingType === "room") {

    return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;

  }

  const hay = `${String(n?.msg || "")} ${String(n?.detail || "")}`.toLowerCase();

  const isRoomNotif = hay.includes("room");

  const isEventNotif = hay.includes("event") || hay.includes("venue");

  if (isRoomNotif && isEventNotif) {

    return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;

  }

  if (isRoomNotif) return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;

  if (isEventNotif) return `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`;

  return `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`;

}


