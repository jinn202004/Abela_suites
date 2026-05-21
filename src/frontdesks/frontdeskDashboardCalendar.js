/**
 * Front Desk dashboard booking calendar — active bookings only (pending / approved / occupied).
 * Status is shown as dots on white date cells, not full-cell background colors.
 */

import { bookingCustomerDisplayName } from "../guests/bookingRoomDisplay";
import { buildEventTimeSlotLabel } from "../guests/eventVenueTimeShared";

export function normFdCalStatus(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

/** Statuses excluded from the active Front Desk calendar and day panel. */
const CALENDAR_EXCLUDED_STATUSES = new Set([
  "completed",
  "checked-out",
  "checked_out",
  "cancelled",
  "rejected",
  "declined",
  "archived",
  "finished",
]);

export function isBookingActiveForFdCalendar(b) {
  const k = normFdCalStatus(b?.status);
  return Boolean(k) && !CALENDAR_EXCLUDED_STATUSES.has(k);
}

function parseBookingCalDay(s) {
  if (s == null || s === "") return null;
  const t = String(s).trim();
  if (!t) return null;
  const iso = t.includes("T") ? t : `${t.slice(0, 10)}T12:00:00`;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function dateKeyFromCalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function iterCalDateKeysInclusive(startD, endD) {
  const keys = [];
  const cur = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), 12, 0, 0, 0);
  const end = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), 12, 0, 0, 0);
  while (cur <= end) {
    keys.push(dateKeyFromCalDate(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
}

export function bookingCalendarDateKeys(b) {
  if (!b || !isBookingActiveForFdCalendar(b)) return [];
  const t = String(b.type || "").toLowerCase();
  if (t === "room") {
    const ci = parseBookingCalDay(b.checkIn);
    const co = parseBookingCalDay(b.checkOut);
    if (!ci) return [];
    const end = co && co >= ci ? co : ci;
    return iterCalDateKeysInclusive(ci, end);
  }
  if (t === "event") {
    const ed = parseBookingCalDay(b.eventDate);
    const ee = parseBookingCalDay(b.eventEndDate);
    if (!ed) return [];
    const end = ee && ee >= ed ? ee : ed;
    return iterCalDateKeysInclusive(ed, end);
  }
  return [];
}

/** Dot tone for a single booking status (completed never maps to occupied). */
export function bookingCalendarDotTone(statusRaw) {
  const k = normFdCalStatus(statusRaw);
  if (k === "occupied") return "occupied";
  if (k === "pending") return "pending";
  if (k === "approved" || k === "confirmed" || k === "reserved") return "approved";
  return null;
}

/** Which status dots to show on a day (multiple may be true). */
export function calendarDayState(dayKey, bookingsList) {
  const dots = { pending: false, approved: false, occupied: false };
  for (const b of bookingsList) {
    if (!isBookingActiveForFdCalendar(b)) continue;
    if (!bookingCalendarDateKeys(b).includes(dayKey)) continue;
    const tone = bookingCalendarDotTone(b.status);
    if (tone === "pending") dots.pending = true;
    else if (tone === "approved") dots.approved = true;
    else if (tone === "occupied") dots.occupied = true;
  }
  return { dots };
}

export function bookingsActiveOnDay(dayKey, bookingsList) {
  return (Array.isArray(bookingsList) ? bookingsList : []).filter((b) => {
    if (!isBookingActiveForFdCalendar(b)) return false;
    return bookingCalendarDateKeys(b).includes(dayKey);
  });
}

export function formatCalendarHeading(dayKey) {
  const d = parseBookingCalDay(dayKey);
  if (!d) return dayKey;
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

export function bookingCalendarGuestName(b) {
  return bookingCustomerDisplayName(b);
}

export function bookingCalendarResourceLabel(b) {
  const t = String(b.type || "").toLowerCase();
  if (t === "room") {
    const num = String(b.roomNumber ?? "").trim() || String(b.roomId ?? "").trim().slice(-6) || "?";
    return `Room ${num}`;
  }
  return String(b.venueName ?? b.eventTitle ?? "Event").trim() || "Event";
}

export function bookingCalendarTypeLabel(b) {
  const t = String(b.type || "").toLowerCase();
  if (t === "room") return "Room";
  if (t === "event") return "Event";
  return String(b.type || "Booking").trim() || "Booking";
}

export function bookingCalendarSummaryLine(b) {
  return `${bookingCalendarResourceLabel(b)} — ${bookingCalendarGuestName(b)}`;
}

export function bookingCalendarStatusDisplay(statusRaw) {
  const k = normFdCalStatus(statusRaw);
  if (k === "occupied") return "Occupied";
  if (k === "pending") return "Pending";
  if (k === "approved" || k === "confirmed") return "Approved";
  if (k === "reserved") return "Reserved";
  if (k === "cancelled") return "Cancelled";
  if (k === "rejected" || k === "declined") return "Declined";
  if (k === "completed") return "Completed";
  return String(statusRaw || "—").trim() || "—";
}

export function bookingCalendarScheduleLine(b) {
  const t = String(b.type || "").toLowerCase();
  if (t === "room") {
    const ci = parseBookingCalDay(b.checkIn);
    const co = parseBookingCalDay(b.checkOut);
    const fmt = (d) =>
      d
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—";
    if (ci && co && dateKeyFromCalDate(ci) !== dateKeyFromCalDate(co)) {
      return `${fmt(ci)} – ${fmt(co)}`;
    }
    return fmt(ci) || "—";
  }
  if (t === "event") {
    const ed = parseBookingCalDay(b.eventDate);
    const ee = parseBookingCalDay(b.eventEndDate);
    const fmt = (d) =>
      d
        ? d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "";
    const datePart =
      ed && ee && dateKeyFromCalDate(ed) !== dateKeyFromCalDate(ee)
        ? `${fmt(ed)} – ${fmt(ee)}`
        : fmt(ed);
    const slot =
      String(b.timeSlot ?? "").trim() ||
      buildEventTimeSlotLabel(b.startTime, b.endTime) ||
      "";
    if (datePart && slot) return `${datePart} · ${slot}`;
    return datePart || slot || "—";
  }
  return "—";
}
