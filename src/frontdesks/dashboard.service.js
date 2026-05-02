/**
 * Front desk dashboard — API integration layer.
 * Uses JWT from `authApi`; all calls go to `/api/*` via `guestApi` helpers.
 *
 * Backend flow: Frontend → /api/* → Controller → Service → MongoDB → JSON → UI
 */

import { getStoredAuthToken } from "../api/authApi";
import {
  fetchBookingsBackend,
  fetchRoomsCatalog,
  fetchEventVenuesBackend,
  fetchFrontdeskBookingDetailsBackend,
  fetchFrontdeskDashboardSummaryBackend,
} from "../api/guestApi";

export class DashboardAuthError extends Error {
  constructor(message = "Sign in required") {
    super(message);
    this.name = "DashboardAuthError";
    this.code = "NO_TOKEN";
  }
}

function assertToken() {
  if (!getStoredAuthToken()) throw new DashboardAuthError();
}

export function formatPeso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `₱${x.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normStatus(s) {
  return String(s || "")
    .trim()
    .toLowerCase();
}

/**
 * GET /api/frontdesk/summary — metrics computed on the server from MongoDB
 * (same booking list + billing ledger rules as `/api/bookings` and `/api/billing`).
 */
export async function getDashboardSummary() {
  assertToken();
  return fetchFrontdeskDashboardSummaryBackend();
}

/**
 * Front desk dashboard tables only show three labels for rooms and venues.
 * Maps Mongo asset `status` (rooms + event venues share the same enum).
 */
function dashboardAssetStatusLabel(s) {
  const k = normStatus(s);
  if (!k) return "—";
  if (k === "occupied") return "Occupied";
  if (k === "needs_cleaning" || k === "cleaning_in_progress") return "Needs clean";
  if (k === "available" || k === "ready") return "Available";
  return "—";
}

/** When catalog is empty, derive rows from bookings — collapse booking workflow to the same three labels. */
function dashboardBookingFallbackStatusLabel(bookingStatusRaw) {
  const k = normStatus(bookingStatusRaw);
  if (!k) return "—";
  if (
    k === "approved" ||
    k === "occupied" ||
    k === "confirmed" ||
    k === "active"
  ) {
    return "Occupied";
  }
  return "Available";
}

function sortKeyNum(n) {
  const x = Number(String(n).trim());
  return Number.isFinite(x) ? x : Number.POSITIVE_INFINITY;
}

function parseMoneyish(v) {
  if (v == null || v === "") return 0;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const n = Number(String(v).replace(/[₱,]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/**
 * When the rooms collection is empty, derive display rows from staff-visible bookings (still real DB data).
 * @param {Array<Record<string, unknown>>} bookings
 * @returns {Array<{ number: number, type: string, price: number, status: string }>}
 */
export function buildRoomStatusRowsFromBookings(bookings) {
  const list = (Array.isArray(bookings) ? bookings : []).filter((b) => b && b.type === "room");
  const byKey = new Map();
  for (const b of list) {
    const key = String(b.roomNumber || b.roomId || b.id || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || new Date(b.updatedAt || 0) > new Date(prev.updatedAt || 0)) {
      byKey.set(key, b);
    }
  }
  const rows = [...byKey.values()].map((b, i) => {
    const raw = String(b.roomNumber ?? "")
      .trim()
      .match(/^\d+$/);
    const n = raw ? Number(b.roomNumber) : i + 1;
    return {
      number: Number.isFinite(n) ? n : i + 1,
      type: String(b.roomTitle || "Room").trim() || "Room",
      price: parseMoneyish(b.totalAmount ?? b.paymentAmount ?? 0),
      status: dashboardBookingFallbackStatusLabel(b.status),
    };
  });
  rows.sort((a, b) => sortKeyNum(a.number) - sortKeyNum(b.number));
  return rows;
}

/**
 * When the eventvenues collection is empty, derive display rows from staff-visible event bookings.
 * @param {Array<Record<string, unknown>>} bookings
 * @returns {Array<{ number: number, type: string, price: number, status: string }>}
 */
export function buildEventStatusRowsFromBookings(bookings) {
  const list = (Array.isArray(bookings) ? bookings : []).filter((b) => b && b.type === "event");
  const byKey = new Map();
  for (const b of list) {
    const key = String(b.eventVenueId || b.venueName || b.id || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev || new Date(b.updatedAt || 0) > new Date(prev.updatedAt || 0)) {
      byKey.set(key, b);
    }
  }
  const rows = [...byKey.values()].map((b, i) => {
    const m = String(b.venueName || b.eventTitle || "")
      .match(/\d+/);
    return {
      number: m && m[0] ? Number(m[0]) : i + 1,
      type: String(b.venueName || b.eventTitle || "Event").trim() || "Event",
      price: parseMoneyish(b.venuePrice || b.totalAmount || b.paymentAmount || 0),
      status: dashboardBookingFallbackStatusLabel(b.status),
    };
  });
  rows.sort((a, b) => sortKeyNum(a.number) - sortKeyNum(b.number));
  return rows;
}

/** GET /api/rooms — public catalog */
export async function getRoomStatusRows() {
  const rooms = await fetchRoomsCatalog();
  const rows = (Array.isArray(rooms) ? rooms : [])
    .filter((r) => r && typeof r === "object")
    .map((r, i) => {
    const numRaw = r.roomNumber != null ? String(r.roomNumber).trim() : "";
    const numParsed = Number(numRaw);
    const number = Number.isFinite(numParsed) && String(numParsed) === numRaw ? numParsed : i + 1;
    return {
      number,
      type: String(r.title || r.package || "Room").trim() || "Room",
      price: Number(r.price) || 0,
      status: dashboardAssetStatusLabel(r.status),
    };
  });
  rows.sort((a, b) => sortKeyNum(a.number) - sortKeyNum(b.number));
  return rows;
}

/** GET /api/event-venues — Bearer; frontdesk/housekeeping/admin */
export async function getEventStatusRows() {
  assertToken();
  const venues = await fetchEventVenuesBackend();
  const rows = (Array.isArray(venues) ? venues : [])
    .filter((v) => v && typeof v === "object")
    .map((v, i) => {
    const ev = v.eventNum != null ? String(v.eventNum).trim() : "";
    const numParsed = Number(ev);
    const number = Number.isFinite(numParsed) && String(numParsed) === ev ? numParsed : i + 1;
    return {
      number,
      type: String(v.name || "Venue").trim(),
      price: Number(v.price) || 0,
      status: dashboardAssetStatusLabel(v.status),
    };
  });
  rows.sort((a, b) => sortKeyNum(a.number) - sortKeyNum(b.number));
  return rows;
}

/** GET /api/frontdesk/bookings/:id */
export async function getFrontdeskBookingDetails(bookingId) {
  assertToken();
  return fetchFrontdeskBookingDetailsBackend(bookingId);
}

function packErrorMessage(e) {
  const msg = e && e.message ? String(e.message) : String(e);
  const net =
    msg === "Failed to fetch" ||
    msg === "Load failed" ||
    /networkerror|load failed|fetch/i.test(msg);
  if (net) {
    return "Network error — is the API running? In dev: start be/abela-be (npm run dev, port 5000) so Vite can proxy /api.";
  }
  return msg;
}

const pack = (p) =>
  p.then(
    (v) => ({ ok: true, v }),
    (e) => ({ ok: false, e: packErrorMessage(e) })
  );

/**
 * Classic front desk dashboard: summary + room/event catalog tables.
 */
export async function loadDashboardBundle() {
  const roomsP = pack(getRoomStatusRows());

  if (!getStoredAuthToken()) {
    const roomsR = await roomsP;
    return {
      authenticated: false,
      summary: null,
      summaryError: null,
      roomRows: roomsR.ok ? roomsR.v : [],
      roomCatalogError: roomsR.ok ? null : roomsR.e,
      eventRows: [],
      eventCatalogError: null,
    };
  }

  const [summaryR, roomsR, eventsR] = await Promise.all([
    pack(getDashboardSummary()),
    roomsP,
    pack(getEventStatusRows()),
  ]);

  let roomRows = roomsR.ok ? roomsR.v : [];
  let eventRows = eventsR.ok ? eventsR.v : [];
  const roomCatalogError = roomsR.ok ? null : roomsR.e;
  const eventCatalogError = eventsR.ok ? null : eventsR.e;

  const needBookingFallback = roomRows.length === 0 || eventRows.length === 0;
  if (needBookingFallback) {
    const bookingsR = await pack(fetchBookingsBackend());
    if (bookingsR.ok) {
      const bookings = bookingsR.v;
      if (roomRows.length === 0) {
        roomRows = buildRoomStatusRowsFromBookings(bookings);
      }
      if (eventRows.length === 0) {
        eventRows = buildEventStatusRowsFromBookings(bookings);
      }
    }
  }

  return {
    authenticated: true,
    summary: summaryR.ok ? summaryR.v : null,
    summaryError: summaryR.ok ? null : summaryR.e,
    roomRows,
    roomCatalogError,
    eventRows,
    eventCatalogError,
  };
}
