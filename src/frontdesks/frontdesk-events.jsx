import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import {
  fetchBookingsBackend,
  fetchBookingByIdBackend,
  fetchEventVenuesBackend,
  createBookingBackend,
  bookingSaveAlertMessage,
  approveBookingBackend,
  rejectBookingBackend,
  dispatchHousekeepingTasksRefresh,
  dispatchHousekeepingInboxRefresh,
  dispatchGuestBookingsRefreshPing,
  dispatchFrontdeskNotificationsRefresh,
  patchBookingBackend,
} from "../api/guestApi";
import { ReservationProofPreview } from "../components/ReservationProofPreview";
import GovernmentIdPreview from "../components/GovernmentIdPreview";
import {
  derivePaymentStatusLine,
  parseAdditionalRequestChargeLines,
  paymentMethodDisplayLabel,
  paymentProofFromBooking,
} from "../components/reservationDetailsHelpers";
import {
  uploadBookingGuestValidIdDirectBackend,
  uploadPaymentProofDirectBackend,
} from "../api/imageUploadApi";
import { handleImageFileInputChange, isStoredImageRef } from "../utils/s3ImageUpload";
import "../components/reservation-details-modal.css";
import {
  bookingCustomerDisplayName,
  bookingEmailDisplay,
  bookingPhoneDisplay,
  buildEventVenueIdToEventNumMap,
  buildEventVenueIdToNameMap,
  eventNumberColumn,
  eventVenueNameFromBooking,
  formatStoredEventNumberForDisplay,
  formatEventPackageWithNumber,
  packageLabelForReservedGuestRow,
} from "../guests/bookingRoomDisplay";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import {
  bookingStatusBlocksOverlap,
  eventBookedRangesFromBookings,
  guestEventCalendarNightsFromBookedRanges,
} from "../guests/guestAvailability";
import { DayPicker, DayButton, labelDayButton as defaultLabelDayButton } from "react-day-picker";
import "react-day-picker/style.css";
import "./dashboard.css";
import { parseLocalYmd, formatLocalYmd, addLocalDays } from "../guests/roomStayDates";
import {
  durationHoursDecimalFromTimes,
  buildEventTimeSlotLabel,
  eventNewRangeOverlapsExisting,
  parseEventStartEndMinutes,
  EVENT_BASE_INCLUDED_HOURS,
} from "../guests/eventVenueTimeShared";
import BillingSummary from "../guests/BillingSummary";
import BillingPaymentPills from "../guests/BillingPaymentPills";
import { computeEventBookingBill, paymentSnapshotFromBill } from "../guests/bookingBilling";
import "../guests/billing-summary.css";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { useNotificationRedirect } from "../navigation/useNotificationRedirect";
import "../guests/idUploadedCard.css";
import "./frontdesk-rooms.css";
import "./frontdesk-events.css";
import "../admin_1/adminClickable.css";
import { handleAdminRowActivate, handleAdminRowKeyDown } from "../admin_1/adminClickUtils";
import "./walkin-event-booking-parity.css";
import TermsAgreementsSection from "../components/terms-agreements/TermsAgreementsSection";
import "../components/terms-agreements/terms-agreements.css";

/** Files in `public/` — served at `/…` (see `fe/abela-fe/public/`). */
const IMAGES = {
  sidebarLogo: "/logo.png",
  gcashCard: "/Gcash.png",
  gcashPaymentQr: "/QR.png",
  guestId: "/id.png",
};

/** Match `frontdesk-rooms` header toolbar / search (same line weights and walk-in icon). */
const PlusUserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);
const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

const CashPayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="6" width="20" height="12" rx="2" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M7 12h.01M17 12h.01" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="10" r="3" />
    <path d="M7 21v-1a5 5 0 0 1 10 0v1" />
  </svg>
);
const UploadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="16 16 12 12 8 16" />
    <line x1="12" y1="12" x2="12" y2="21" />
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
  </svg>
);
const CardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

/* ── INITIAL DATA (Reserved Guest tab uses approved+ rows from this same list) ── */
const INITIAL_RESERVATIONS = [
  { id: 1, number: "1", venueName: "Mini Sky Bar", type: "Event", customer: "Jimie Macarulay", package: formatEventPackageWithNumber("1", "Mini Sky Bar"), total: "₱2,205.00", downpayment: "₱661.50", balance: "₱1,543.50", status: "pending", venueNo: "1", price: "₱2,205.00", email: "jimiemacarulay@gmail.com", contact: "09976645323", checkin: "14-02-2026", timeslot: "8:00AM-6:00PM", addguest: "0", paid: "₱661.50", refnum: "ABR-20260221-4598", amountpaid: "₱661.50", paydate: "16/02/2026", transid: "GC1234567890", addreq: "N/A", paymethod: "GCash" },
  { id: 2, number: "2", venueName: "Function Hall", type: "Event", customer: "Marie Santos", package: formatEventPackageWithNumber("2", "Function Hall"), total: "₱2,205.00", downpayment: "₱1,543.00", balance: "₱661.00", status: "pending", venueNo: "2", price: "₱2,205.00", email: "marie@email.com", contact: "09111222333", checkin: "11-02-2026", timeslot: "9:00AM-5:00PM", addguest: "0", paid: "₱1,543", refnum: "ABR-20260221-0012", amountpaid: "₱1,543", paydate: "14/02/2026", transid: "GC0987654321", addreq: "N/A", paymethod: "GCash" },
  { id: 401, number: "1", venueName: "Single Suites", type: "Event", customer: "Alma Reyes", package: formatEventPackageWithNumber("1", "Single Suites"), total: "₱924.00", downpayment: "₱576.00", balance: "₱247.00", status: "approved", venueNo: "1", price: "₱924.00", email: "alma@email.com", contact: "09170000001", checkin: "14-02-2026", timeslot: "2:00 PM - 6:00 PM", addguest: "0", paid: "₱576.00", refnum: "EVT-DEMO-401", amountpaid: "₱576.00", paydate: "10/02/2026", transid: "—", addreq: "N/A", paymethod: "GCash" },
  { id: 402, number: "2", venueName: "Single Suites", type: "Event", customer: "Ben Cruz", package: formatEventPackageWithNumber("2", "Single Suites"), total: "₱1,148.00", downpayment: "₱803.00", balance: "₱334.00", status: "approved", venueNo: "2", price: "₱1,148.00", email: "ben@email.com", contact: "09170000002", checkin: "15-02-2026", timeslot: "10:00 AM - 2:00 PM", addguest: "1", paid: "₱803.00", refnum: "EVT-DEMO-402", amountpaid: "₱803.00", paydate: "11/02/2026", transid: "—", addreq: "N/A", paymethod: "GCash" },
  { id: 403, number: "3", venueName: "Single Suites", type: "Event", customer: "Carla Dizon", package: formatEventPackageWithNumber("3", "Single Suites"), total: "₱924.00", downpayment: "₱576.00", balance: "₱334.00", status: "approved", venueNo: "3", price: "₱924.00", email: "carla@email.com", contact: "09170000003", checkin: "16-02-2026", timeslot: "7:00 PM - 10:00 PM", addguest: "0", paid: "₱576.00", refnum: "EVT-DEMO-403", amountpaid: "₱576.00", paydate: "12/02/2026", transid: "—", addreq: "N/A", paymethod: "GCash" },
];

const EVENT_TYPES = ["Birthday", "Wedding", "Corporate", "Anniversary", "Other"];

/** Same formal confirm pattern as `frontdesk-rooms.jsx` (`layout="booking"`, seal, brown actions). */
const APPROVE_EVENT_BOOKING_CONFIRM_TEXT =
  "Are you sure you want to approve this event booking? Once approved, the guest will be notified and the booking status will be updated in their account.";

const CHECKIN_EVENT_BOOKING_CONFIRM_TEXT =
  "Are you sure you want to check this guest in? The reservation will show as occupied, the guest will be notified, and the venue status will update for housekeeping.";

const CHECKOUT_EVENT_BOOKING_CONFIRM_TEXT =
  "Are you sure you want to check out this event? The booking will complete and the reservation will move to history.";

/* ── HELPERS ── */
const statusBadge = (status) => {
  const s = String(status || "");
  const display =
    s.toLowerCase() === "approved" ? "Approved"
    : s.toLowerCase() === "rejected" ? "Rejected"
    : s.toLowerCase() === "occupied" ? "Occupied"
    : s.toLowerCase() === "pending" ? "Pending"
    : s;
  const cls = display === "Approved" ? "badge-approved" : display === "Rejected" ? "badge-rejected" : display === "Occupied" ? "badge-occupied" : "badge-pending";
  return <span className={`badge ${cls}`}>{display}</span>;
};

/** Same badge semantics as frontdesk-rooms reservation table. */
function ReservationBadge({ status }) {
  const map = {
    approved: "badge-approved",
    rejected: "badge-rejected",
    pending: "badge-pending",
    occupied: "badge-occupied",
    cancelledBooking: "badge-cancelled",
    completed: "badge-completed",
    "checked-out": "badge-checkedout",
    other: "badge-pending",
  };
  const label = {
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    occupied: "Occupied",
    cancelledBooking: "Cancelled Booking",
    completed: "Completed",
    "checked-out": "Checked Out",
    other: "Other",
  };
  const key = (() => {
    const s = String(status || "").toLowerCase();
    if (s === "confirmed") return "approved";
    if (s === "declined" || s === "rejected") return "rejected";
    if (s === "cancelled" || s === "cancelledbooking") return "cancelledBooking";
    if (s === "completed") return "completed";
    if (s === "other") return "other";
    if (map[s]) return s;
    if (!s) return "pending";
    return "other";
  })();
  return <span className={`badge ${map[key] || "badge-pending"}`}>{label[key] || status}</span>;
}
const fmt = (n) => "₱" + Number(n).toLocaleString();

function parsePesoNum(v) {
  if (v == null || v === "") return NaN;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function fmtPeso(n) {
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function parseExtraHoursValue(raw) {
  const n = parseFloat(String(raw ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : NaN;
}

/** Display extra hours in the charges summary (e.g. "2 hrs", "1 hr"). */
function formatExtraHoursDisplay(hours) {
  const n = typeof hours === "number" ? hours : parseExtraHoursValue(hours);
  if (!Number.isFinite(n) || n <= 0) return "—";
  if (n === 1) return "1 hr";
  const display = Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
  return `${display} hrs`;
}

function formatEventChargeLinesForAdditionalRequests(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((c) => {
      const amount = Number(c.amount) || 0;
      const hrsLabel = formatExtraHoursDisplay(c.extraHours);
      return `Extra ${hrsLabel} (₱${amount.toFixed(2)})`;
    })
    .join("; ");
}

/** Paid amount counted toward this booking (never more than the event total). */
function paymentCreditedTowardTotal(totalNum, paymentNum) {
  if (!Number.isFinite(paymentNum) || paymentNum < 0) return NaN;
  if (!Number.isFinite(totalNum) || totalNum <= 0) return paymentNum;
  return Math.min(paymentNum, totalNum);
}

/** From walk-in select label e.g. "Mini Sky Bar - EV-001" */
function splitWalkinEventSelection(sel) {
  if (!sel || typeof sel !== "string") return { eventno: "—", venueLabel: "" };
  const trimmed = sel.trim();
  const ev = trimmed.match(/\b(EV-?\d+)\b/i);
  const eventno = ev ? formatStoredEventNumberForDisplay(ev[0]) : "—";
  const lastDash = trimmed.lastIndexOf(" - ");
  const venueLabel = lastDash >= 0 ? trimmed.slice(0, lastDash).trim() : trimmed;
  return { eventno, venueLabel: venueLabel || trimmed };
}

function normEventWalkinDate(d) {
  if (d == null || d === "") return "";
  const s = String(d);
  return s.includes("T") ? s.slice(0, 10) : s.trim();
}

/** Per-day sets for walk-in DayPicker (yellow pending, green approved, red occupied). */
function splitWalkinEventCalendarNights(eventBookingsRaw, selectedVenueId) {
  const ranges = eventBookedRangesFromBookings(
    (Array.isArray(eventBookingsRaw) ? eventBookingsRaw : []).map((b) => ({
      ...b,
      type: b?.type || "event",
    })),
  );
  return guestEventCalendarNightsFromBookedRanges(ranges, selectedVenueId);
}

const EVENT_TIME_OVERLAP_ALERT =
  "This venue is unavailable during the selected time because it overlaps with an existing booking or cleaning schedule.";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.onerror = () => reject(new Error("Could not read file."));
    r.readAsDataURL(file);
  });
}

const WALKIN_EVENT_FALLBACK = [
  { id: "walkin-fallback-ev001", name: "Mini Sky Bar", eventNum: "EV001" },
  { id: "walkin-fallback-ev002", name: "Function Hall", eventNum: "EV002" },
  { id: "walkin-fallback-ev003", name: "Garden Venue", eventNum: "EV003" },
  { id: "walkin-fallback-ev004", name: "Grand Ballroom", eventNum: "EV004" },
];

function statusForBadgeFromApi(status) {
  const s = String(status || "").toLowerCase();
  if (s === "occupied") return "occupied";
  if (s === "confirmed" || s === "approved") return "approved";
  if (s === "rejected" || s === "declined") return "rejected";
  if (s === "pending") return "pending";
  if (s === "cancelled") return "cancelledBooking";
  if (s === "completed") return "completed";
  if (!s) return "pending";
  return "other";
}

function isFrontdeskBookingPending(row) {
  if (!row) return false;
  if (row._fromApi) return String(row._apiStatus || "").toLowerCase() === "pending";
  return String(row.status || "").toLowerCase() === "pending";
}

/** Status bucket for Events reservation tab (matches room reservation filters). */
function eventReservationFilterBucket(row) {
  if (!row) return "other";
  if (row._fromApi) {
    const api = String(row._apiStatus || "").toLowerCase();
    if (api === "pending") return "pending";
    if (api === "cancelled") return "cancelled";
    if (api === "rejected" || api === "declined") return "rejected";
    if (api === "occupied") return "occupied";
    if (api === "approved" || api === "confirmed") return "approved";
    return "other";
  }
  const st = String(row.status || "").toLowerCase();
  if (st === "pending") return "pending";
  if (st === "cancelledbooking" || st === "cancelled") return "cancelled";
  if (st === "rejected") return "rejected";
  if (st === "occupied") return "occupied";
  if (st === "approved" || st === "checked-out") return "approved";
  return "other";
}

/** API-backed rows that front desk may still amend (same rule as rooms). */
function frontdeskEventReservationRowCanEdit(r) {
  if (!r) return false;
  if (r._fromApi) {
    const api = String(r._apiStatus || "").toLowerCase();
    return api === "approved" || api === "confirmed" || api === "occupied";
  }
  const st = String(r.status || "").toLowerCase();
  return st === "approved" || st === "occupied" || st === "confirmed";
}

/** Normalize booking id from API JSON (string, or rare `{ $oid }`). */
function extractBookingId(b) {
  if (!b || typeof b !== "object") return "";
  const raw = b.id != null ? b.id : b._id;
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw.$oid) return String(raw.$oid).trim();
  return String(raw).trim();
}

/** Match event reservation rows for guest check-in / checkout updates. */
function eventRowMatchKey(r) {
  if (!r) return "";
  const raw = String(r._bookingId ?? r.refnum ?? "").trim();
  if (/^[a-f0-9]{24}$/i.test(raw)) return raw;
  return String(r.id ?? "");
}

/** Maps API payment date (YYYY-MM-DD) to a short display string. */
function formatApiPaymentDateDisplayEv(isoDate) {
  const s = String(isoDate || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-PH");
  }
  return s;
}

/** Maps `GET /api/bookings` event row + guest to the Events table / modal shape. */
function mapApiEventBookingToRow(b, venueIdToEventNum, venueIdToName) {
  const id = extractBookingId(b);
  const g = b.guest || {};
  const totalRaw = parsePesoNum(b.totalAmount);
  const venueP = parsePesoNum(b.venuePrice);
  const total = Number.isFinite(totalRaw) ? totalRaw : venueP;
  const downRaw = parsePesoNum(b.paymentAmount);
  const credited = paymentCreditedTowardTotal(total, downRaw);
  const bal =
    Number.isFinite(total) && Number.isFinite(credited) ? Math.max(0, total - credited) : NaN;
  const st = statusForBadgeFromApi(b.status);
  const vmap = venueIdToEventNum instanceof Map ? venueIdToEventNum : null;
  const displayCode = eventNumberColumn(b, vmap);
  const venueLabel = eventVenueNameFromBooking(b, venueIdToName instanceof Map ? venueIdToName : null);
  const pkgLabel = formatEventPackageWithNumber(displayCode, b.eventTitle, venueLabel);
  return {
    id,
    _bookingId: id,
    _fromApi: true,
    _apiStatus: String(b.status ?? "").trim().toLowerCase(),
    number: displayCode,
    venueName: venueLabel,
    type: "Event",
    customer: bookingCustomerDisplayName(b),
    email: bookingEmailDisplay(b),
    contact: bookingPhoneDisplay(b),
    package: pkgLabel,
    total: fmtPeso(total),
    downpayment: fmtPeso(credited),
    balance: fmtPeso(bal),
    status: st,
    venueNo: displayCode,
    price: fmtPeso(total),
    checkin: b.eventDate || "—",
    timeslot: b.timeSlot || (b.eventEndDate ? `${b.eventDate || "—"} → ${b.eventEndDate}` : "—"),
    addguest: String(b.expectedPax ?? 0),
    paid: fmtPeso(credited),
    refnum: id,
    amountpaid: fmtPeso(credited),
    paydate:
      b.paymentDate && String(b.paymentDate).trim()
        ? formatApiPaymentDateDisplayEv(b.paymentDate)
        : b.updatedAt
          ? new Date(b.updatedAt).toLocaleDateString("en-PH")
          : "",
    transid: b.transactionId || "—",
    addreq: b.additionalRequests || "N/A",
    paymethod: b.paymentMethod || "—",
    paymentProofData: "",
    governmentIdUrl: String(b.governmentIdUrl || b.validIdPhotoUrl || "").trim(),
    validIdPhotoData:
      String(b.governmentIdUrl || b.validIdPhotoUrl || g.validIdPhotoData || "").trim(),
    declineReason: String(b.declineReason || "").trim(),
  };
}

/* ══════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════ */
function Sidebar() {
  const navItems = [
    { label: "Dashboard", path: "/frontdesk-dashboard", icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
    { label: "Rooms", path: "/frontdesk-rooms", icon: <svg viewBox="0 0 24 24" fill="white" width="22" height="22"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/></svg> },
    { label: "Events", path: "/frontdesk-events", icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/></svg> },
    { label: "Housekeeping", path: "/frontdesk-housekeeping", icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg> },
    { label: "Bills", path: "/frontdesk-bills", icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg> },
    { label: "Reservation History", path: "/frontdesk-history", icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
    { label: "Settings", path: "/frontdesk-settings", icon: <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  ];

  return (
    <FrontdeskSidebar
      navItems={navItems.map((item) => ({ label: item.label, href: item.path, icon: item.icon }))}
      logoSrc={IMAGES.sidebarLogo}
      onLogoError={(e) => {
        e.target.style.background = "#fff3";
      }}
    />
  );
}

/* ══════════════════════════════════════════
   TOAST
══════════════════════════════════════════ */
function Toast({ toast, onHide }) {
  useEffect(() => {
    if (toast.visible) { const t = setTimeout(onHide, 3500); return () => clearTimeout(t); }
  }, [toast.visible]);
  if (!toast.visible) return null;
  const ok = toast.type === "approved";
  return (
    <div className="res-toast active" style={{ borderColor: ok ? "#27ae60" : "#e74c3c" }}>
      <div className="res-toast-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke={ok ? "#27ae60" : "#e74c3c"} strokeWidth="2.5" width="20" height="20">
          <circle cx="12" cy="12" r="10" />
          {ok ? <polyline points="9 12 11 14 15 10" /> : <line x1="12" y1="8" x2="12" y2="12" />}
        </svg>
      </div>
      <span>{toast.msg}</span>
      <span className="res-toast-sub">Review more reservations!</span>
    </div>
  );
}

/* ══════════════════════════════════════════
   CONFIRM DIALOG
══════════════════════════════════════════ */
function ConfirmDialog({
  open,
  text,
  onCancel,
  onConfirm,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  layout,
  headline,
  tone = "caution",
  size = "sm",
  panelClassName,
}) {
  if (layout === "booking") {
    const effectiveTone = tone;
    const sealMark =
      effectiveTone === "approve" || effectiveTone === "success" ? (
        <span className="confirm-formal__seal-mark">✓</span>
      ) : effectiveTone === "reject" ? (
        <span className="confirm-formal__seal-mark confirm-formal__seal-mark--narrow">!</span>
      ) : (
        <span className="confirm-formal__seal-mark">!</span>
      );
    const seal = (
      <div className={`confirm-formal__seal confirm-formal__seal--${effectiveTone}`} aria-hidden="true">
        {sealMark}
      </div>
    );
    const mainInner = (
      <>
        {seal}
        {headline ? <h2 className="confirm-formal__headline">{headline}</h2> : null}
        <div className="confirm-formal__message">
          <p className="confirm-text confirm-text--multiline">{text}</p>
        </div>
      </>
    );
    return (
      <Modal
        open={open}
        onClose={onCancel}
        placement="center"
        contentOnly
        shellStyle={false}
        panelClassName={panelClassName || "confirm-box confirm-box--booking-decision"}
        size={size}
        ariaLabel={typeof text === "string" ? text : "Confirmation"}
      >
        <div className="confirm-formal confirm-formal--booking">
          <div className="confirm-formal__main">{mainInner}</div>
          <div className="confirm-formal__footer">
            <div className="confirm-btns">
              <button type="button" className="btn-confirm-cancel" onClick={onCancel}>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={
                  effectiveTone === "reject" ? "btn-confirm-submit btn-confirm-submit--reject" : "btn-confirm-submit"
                }
                onClick={onConfirm}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onCancel}
      placement="center"
      contentOnly
      shellStyle={false}
      panelClassName="confirm-box"
      size="sm"
      ariaLabel={typeof text === "string" ? text : "Confirmation"}
    >
      <div className="confirm-icon" style={{ position: "relative" }}>
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <span className="confirm-exclaim">!</span>
      </div>
      <p className="confirm-text">{text}</p>
      <div className="confirm-btns">
        <button type="button" className="btn-confirm-cancel" onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className="btn-confirm-submit" onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   SUCCESS DIALOG
══════════════════════════════════════════ */
function SuccessDialog({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose ?? (() => {})}
      placement="center"
      contentOnly
      shellStyle={false}
      panelClassName="confirm-box"
      size="sm"
      ariaLabel="Updated successfully"
    >
      <div className="confirm-icon" style={{ position: "relative" }}>
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
        </svg>
        <span
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 32,
            fontWeight: 900,
            color: "#27ae60",
          }}
        >
          ✓
        </span>
      </div>
      <p className="confirm-text">Updated Successfully!</p>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   EVENT RESERVATION DETAILS (shared body)
══════════════════════════════════════════ */
function EventReservationDetailsInner({ r, open }) {
  const [apiBooking, setApiBooking] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  useEffect(() => {
    if (!open || !r?._bookingId || !getStoredAuthToken()) {
      setApiBooking(null);
      setDetailBusy(false);
      return undefined;
    }
    let cancelled = false;
    setDetailBusy(true);
    setApiBooking(null);
    fetchBookingByIdBackend(r._bookingId)
      .then((b) => {
        if (!cancelled && b && String(b.id) === String(r._bookingId)) setApiBooking(b);
      })
      .catch(() => {
        if (!cancelled) setApiBooking(null);
      })
      .finally(() => {
        if (!cancelled) setDetailBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, r?._bookingId]);

  const display = useMemo(() => {
    if (!r) return null;
    if (!apiBooking) return r;
    const paydate =
      apiBooking.paymentDate && String(apiBooking.paymentDate).trim()
        ? formatApiPaymentDateDisplayEv(apiBooking.paymentDate)
        : r.paydate;
    return {
      ...r,
      paymethod: apiBooking.paymentMethod || r.paymethod,
      transid: apiBooking.transactionId || r.transid,
      paydate,
      paymentProofData: apiBooking.paymentProofData || r.paymentProofData || "",
      governmentIdUrl:
        apiBooking.governmentIdUrl || apiBooking.validIdPhotoUrl || r.governmentIdUrl || "",
      validIdPhotoData:
        apiBooking.governmentIdUrl ||
        apiBooking.validIdPhotoUrl ||
        apiBooking.guest?.validIdPhotoData ||
        r.validIdPhotoData ||
        "",
      guest: apiBooking.guest || r.guest,
    };
  }, [r, apiBooking]);

  const x = display || r;
  const idBooking = apiBooking || {
    governmentIdUrl: r?.governmentIdUrl,
    validIdPhotoUrl: r?.governmentIdUrl,
    guest: { validIdPhotoData: r?.validIdPhotoData },
  };
  const proofBooking = { paymentMethod: x.paymethod, paymentProofData: x.paymentProofData };
  const proofSrc = paymentProofFromBooking(proofBooking);
  const payLine = derivePaymentStatusLine(
    { paymentMethod: x.paymethod, transactionId: x.transid },
    proofSrc,
  );

  return (
    <div className="rdm">
      {detailBusy ? <p className="rdm-loading">Loading payment details…</p> : null}
      <div className="rdm-status-bar">
        <div className="rdm-pill rdm-pill--booking">
          <span className="rdm-pill__k">Booking status</span>
          <span className="rdm-pill__v">{statusBadge(x.status)}</span>
        </div>
        <div className="rdm-pill rdm-pill--payment">
          <span className="rdm-pill__k">Payment status</span>
          <span className="rdm-pill__v">{payLine}</span>
        </div>
        <div className="rdm-pill rdm-pill--balance">
          <span className="rdm-pill__k">Remaining balance</span>
          <span className="rdm-pill__v">{x.balance}</span>
        </div>
      </div>
      <div className="rdm-grid">
        <section className="rdm-card">
          <h4 className="rdm-card__title">Booking information</h4>
          <dl className="rdm-dl">
            <div>
              <dt className="rdm-dt">Venue no.</dt>
              <dd className="rdm-dd">{x.venueNo}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Package</dt>
              <dd className="rdm-dd">{x.package}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Price</dt>
              <dd className="rdm-dd">{x.price}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Status</dt>
              <dd className="rdm-dd">{statusBadge(x.status)}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Event date</dt>
              <dd className="rdm-dd">{x.checkin}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Time slot</dt>
              <dd className="rdm-dd">{x.timeslot}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Guests (est.)</dt>
              <dd className="rdm-dd">{x.addguest}</dd>
            </div>
          </dl>
        </section>
        <section className="rdm-card">
          <h4 className="rdm-card__title">Guest information</h4>
          <dl className="rdm-dl">
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Guest</dt>
              <dd className="rdm-dd">{x.customer}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Email</dt>
              <dd className="rdm-dd rdm-dd--muted">{x.email}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Contact</dt>
              <dd className="rdm-dd">{x.contact}</dd>
            </div>
          </dl>
        </section>
        <section className="rdm-card rdm-card--span2">
          <h4 className="rdm-card__title">Requests</h4>
          <p className="rdm-dd rdm-dd--muted" style={{ margin: 0 }}>
            {x.addreq && String(x.addreq).trim() && x.addreq !== "N/A" ? x.addreq : "None"}
          </p>
        </section>
        <section className="rdm-card rdm-card--span2">
          <h4 className="rdm-card__title">Billing summary</h4>
          <div className="rdm-billing">
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Total amount</div>
              <div className="rdm-billing__value">{x.total}</div>
            </div>
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Downpayment</div>
              <div className="rdm-billing__value">{x.downpayment}</div>
            </div>
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Total paid</div>
              <div className="rdm-billing__value">{x.paid}</div>
            </div>
            <div className="rdm-billing__cell rdm-billing__cell--highlight">
              <div className="rdm-billing__label">Remaining balance</div>
              <div className="rdm-billing__value">{x.balance}</div>
            </div>
          </div>
        </section>
        <section className="rdm-card">
          <h4 className="rdm-card__title">Payment information</h4>
          <dl className="rdm-dl">
            <div>
              <dt className="rdm-dt">Method</dt>
              <dd className="rdm-dd">{paymentMethodDisplayLabel(proofBooking)}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Amount paid</dt>
              <dd className="rdm-dd">{x.amountpaid}</dd>
            </div>
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Transaction ID</dt>
              <dd className="rdm-dd rdm-dd--muted">{x.transid}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Payment date</dt>
              <dd className="rdm-dd">{x.paydate || "—"}</dd>
            </div>
          </dl>
        </section>
        <ReservationProofPreview booking={proofBooking} proofSrc={proofSrc} />
        <GovernmentIdPreview booking={idBooking} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   DETAILS MODAL (Review)
══════════════════════════════════════════ */
function DetailsModal({ r, open, onClose, onApprove, onReject, onEdit }) {
  if (!r) return null;
  const pendingReview = isFrontdeskBookingPending(r);
  return (
    <Modal
      open={open && !!r}
      onClose={onClose}
      title="Event reservation"
      size="lg"
      placement="center"
      panelClassName="fd-event-modal fd-event-details-modal rdm-shell-panel"
      bodyClassName="modal-body-scroll rdm-shell-body"
      footer={
        <div className="modal-footer modal-footer-actions">
          {pendingReview ? (
            <>
              <button type="button" className="btn-reject" onClick={onReject}>
                Reject
              </button>
              <button type="button" className="btn-approve" onClick={onApprove}>
                Approve
              </button>
            </>
          ) : (
            <>
              {typeof onEdit === "function" && frontdeskEventReservationRowCanEdit(r) ? (
                <button type="button" className="btn-approve" onClick={onEdit}>
                  Edit
                </button>
              ) : null}
              <button type="button" className="btn-approve" onClick={onClose}>
                Close
              </button>
            </>
          )}
        </div>
      }
    >
      <EventReservationDetailsInner r={r} open={open} />
    </Modal>
  );
}

/* ══════════════════════════════════════════
   EDIT MODAL
══════════════════════════════════════════ */
function EditModal({ r, open, onClose, onSave, onCancel }) {
  const [form, setForm] = useState({});
  const [showUpdateConfirm, setShowUpdateConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (r) setForm({
      package: r.package, eventtype: "Birthday",
      name: r.customer, email: r.email, contact: r.contact,
      checkin: r.checkin ? r.checkin.split("-").reverse().join("-") : "",
      timeslot: r.timeslot, addguest: r.addguest,
      requests: r.addreq === "N/A" ? "" : (r.addreq || ""),
    });
  }, [r]);

  if (!r || !open) return null;
  const field = (id) => ({ value: form[id] || "", onChange: (e) => setForm((f) => ({ ...f, [id]: e.target.value })) });

  const handleUpdate = () => {
    setShowUpdateConfirm(false);
    const updated = {
      ...r,
      customer: form.name, email: form.email, contact: form.contact,
      timeslot: form.timeslot, addguest: form.addguest,
      addreq: form.requests || "N/A", package: form.package,
      checkin: form.checkin ? form.checkin.split("-").reverse().join("-") : r.checkin,
    };
    setShowSuccess(true);
    setTimeout(() => { setShowSuccess(false); onSave(updated); }, 2000);
  };

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title="Edit Reservation"
        size="lg"
        placement="top"
        bodyClassName="modal-body-scroll"
        footer={
          <div className="modal-footer modal-footer-actions">
            <button type="button" className="btn-reject" onClick={() => setShowCancelConfirm(true)}>
              Cancel
            </button>
            <button type="button" className="btn-approve" onClick={() => setShowUpdateConfirm(true)}>
              Update Reservation
            </button>
          </div>
        }
      >
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Select Package</label>
                <div className="edit-select-wrap">
                  <select className="edit-input" {...field("package")}>
                    <option>Mini Sky Bar - ₱1,148</option>
                    <option>Function Hall - ₱2,205</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Event Type</label>
                <div className="edit-select-wrap">
                  <select className="edit-input" {...field("eventtype")}>
                    {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Guest Name</label><input type="text" className="edit-input" {...field("name")} /></div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="edit-input" {...field("email")} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Contact Number</label><input type="text" className="edit-input" {...field("contact")} /></div>
              <div className="form-group"><label className="form-label">Date</label><input type="date" className="edit-input" {...field("checkin")} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">Time Slot</label><input type="text" className="edit-input" placeholder="e.g. 8:00AM-6:00PM" {...field("timeslot")} /></div>
              <div className="form-group"><label className="form-label">Estimated Guest</label><input type="number" className="edit-input" min="0" {...field("addguest")} /></div>
            </div>
            <div className="form-group" style={{ marginTop: 4 }}>
              <label className="form-label">Additional Requests</label>
              <textarea className="edit-input edit-textarea" {...field("requests")} />
            </div>
            <div className="edit-payment-card">
              <h4 className="edit-payment-title">Payment Summary</h4>
              <div className="edit-payment-grid">
                <div><span className="detail-label">Amount Paid</span><span className="detail-value">{r.amountpaid}</span></div>
                <div><span className="detail-label">Date</span><span className="detail-value">{r.paydate}</span></div>
                <div><span className="detail-label">Transaction ID</span><span className="detail-value">{r.transid}</span></div>
                <div><span className="detail-label">Payment Option</span><span className="detail-value">Downpayment</span></div>
              </div>
            </div>
            <div className="id-uploaded-card" style={{ marginTop: 12 }}>
              <h4 className="id-uploaded-card-title">ID Uploaded</h4>
              <div className="id-uploaded-frame">
                <img
                  src={IMAGES.guestId}
                  alt="Guest ID"
                  className="id-img"
                  decoding="async"
                />
              </div>
            </div>
      </Modal>
      <ConfirmDialog open={showUpdateConfirm} text="Update Reservation?" onCancel={() => setShowUpdateConfirm(false)} onConfirm={handleUpdate} confirmLabel="Update" />
      <ConfirmDialog open={showCancelConfirm} text="Cancel Reservation?" onCancel={() => setShowCancelConfirm(false)} onConfirm={() => { setShowCancelConfirm(false); onCancel(); }} confirmLabel="Yes" />
      <SuccessDialog open={showSuccess} onClose={() => setShowSuccess(false)} />
    </>
  );
}

/* ══════════════════════════════════════════
   REJECT MODAL
══════════════════════════════════════════ */
function RejectModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Reject Reservation"
        size="sm"
        placement="top"
        footer={
          <div className="modal-footer modal-footer-actions">
            <button type="button" className="btn-confirm-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="btn-confirm-submit"
              onClick={() => {
                if (!reason.trim()) {
                  alert("Please provide a reason.");
                  return;
                }
                setShowConfirm(true);
              }}
            >
              Submit
            </button>
          </div>
        }
      >
        <p className="reject-label">Please provide a reason for rejection:</p>
        <textarea
          className="reject-textarea"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Write reason here..."
        />
      </Modal>
      <ConfirmDialog
        open={showConfirm}
        text="Reject Reservation?"
        onCancel={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false);
          onSubmit(reason);
          setReason("");
        }}
      />
    </>
  );
}

/* ══════════════════════════════════════════
   CHECK MODAL (Check-In / Check-Out) — aligned with frontdesk-rooms CheckModal (billing + add-ons)
══════════════════════════════════════════ */
function CheckModal({ open, row, onClose, onCheckin, onCheckout, onAddCharges }) {
  if (!row) return null;
  const r = row;
  const isOccupied = String(r.status || "").toLowerCase() === "occupied";
  const addreqParsed = parseAdditionalRequestChargeLines(r.addreq);
  const addOnsSubtotal = addreqParsed.charges.reduce((s, c) => s + c.amount, 0);
  const proofBooking = { paymentMethod: r.paymethod, paymentProofData: r.paymentProofData };
  const proofSrc = paymentProofFromBooking(proofBooking);
  const payLine = derivePaymentStatusLine(
    { paymentMethod: r.paymethod, transactionId: r.transid },
    proofSrc,
  );
  const showDeclineReason =
    String(r._apiStatus || "").toLowerCase() === "rejected" && String(r.declineReason || "").trim() !== "";

  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title={isOccupied ? "Guest event & check-out" : "Guest details & check-in"}
      size="lg"
      placement="center"
      panelClassName="fd-room-modal fd-room-details-modal rdm-shell-panel"
      bodyClassName="modal-body-scroll rdm-shell-body"
      footer={
        <div className="modal-footer modal-footer-actions fd-room-details-actions">
          {isOccupied ? (
            <>
              <button type="button" className="btn-add-charges" onClick={onAddCharges}>
                Add Charges
              </button>
              <button type="button" className="checkout-btn" onClick={onCheckout}>
                Check-Out
              </button>
            </>
          ) : (
            <button type="button" className="checkin-btn" onClick={onCheckin}>
              Check-In
            </button>
          )}
        </div>
      }
    >
      <div className="rdm">
        <div className="rdm-status-bar">
          <div className="rdm-pill rdm-pill--booking">
            <span className="rdm-pill__k">Booking status</span>
            <span className="rdm-pill__v">
              <ReservationBadge status={r.status} />
            </span>
          </div>
          <div className="rdm-pill rdm-pill--payment">
            <span className="rdm-pill__k">Payment status</span>
            <span className="rdm-pill__v">{payLine}</span>
          </div>
          <div className="rdm-pill rdm-pill--balance">
            <span className="rdm-pill__k">Remaining balance</span>
            <span className="rdm-pill__v">{r.balance}</span>
          </div>
        </div>
        <div className="rdm-grid">
          <section className="rdm-card">
            <h4 className="rdm-card__title">Event information</h4>
            <dl className="rdm-dl">
              <div>
                <dt className="rdm-dt">Booking ref.</dt>
                <dd className="rdm-dd rdm-dd--muted">{String(r.refnum || r._bookingId || "—").trim() || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Venue no.</dt>
                <dd className="rdm-dd">{r.venueno || r.venueNo || "—"}</dd>
              </div>
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Venue / event</dt>
                <dd className="rdm-dd">{r.package || r.venueName || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">{isOccupied ? "Event total on bill" : "Quoted total"}</dt>
                <dd className="rdm-dd">{isOccupied ? r.total : r.price || r.total}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Status</dt>
                <dd className="rdm-dd">
                  <ReservationBadge status={r.status} />
                </dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card">
            <h4 className="rdm-card__title">Guest information</h4>
            <dl className="rdm-dl">
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Guest name</dt>
                <dd className="rdm-dd">{String(r.customer || r.guest || "").trim() || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Email</dt>
                <dd className="rdm-dd rdm-dd--muted">{r.email || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Contact</dt>
                <dd className="rdm-dd">{r.contact || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Event date</dt>
                <dd className="rdm-dd">{r.date || r.checkin || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Time slot</dt>
                <dd className="rdm-dd">{r.timeslot || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Estimated guests (pax)</dt>
                <dd className="rdm-dd">{r.addguest ?? "—"}</dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card rdm-card--span2">
            <h4 className="rdm-card__title">{isOccupied ? "Current event bill" : "Billing summary"}</h4>
            {isOccupied ? (
              <>
                <div className="rdm-billing" role="region" aria-label="Current event bill">
                  <div className="rdm-billing__cell">
                    <div className="rdm-billing__label">Event total (venue and add-ons)</div>
                    <div className="rdm-billing__value">{r.total}</div>
                  </div>
                  <div className="rdm-billing__cell">
                    <div className="rdm-billing__label">Payments received</div>
                    <div className="rdm-billing__value">{r.downpayment || r.downpaymentAmt}</div>
                  </div>
                  <div className="rdm-billing__cell rdm-billing__cell--highlight">
                    <div className="rdm-billing__label">Balance due</div>
                    <div className="rdm-billing__value">{r.balance}</div>
                  </div>
                </div>
                {addreqParsed.charges.length > 0 ? (
                  <div className="rdm-charge-lines" aria-label="Extra-hour additional charges">
                    <div className="rdm-charge-lines__title">Additional extra-hour charges</div>
                    <ul className="rdm-charge-lines__list">
                      {addreqParsed.charges.map((c, idx) => (
                        <li key={`${c.label}-${idx}`} className="rdm-charge-lines__row">
                          <span className="rdm-charge-lines__name">{c.label}</span>
                          <span className="rdm-charge-lines__amt">{fmtPeso(c.amount)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="rdm-charge-lines__footer">
                      <span>Listed add-ons subtotal</span>
                      <span>{fmtPeso(addOnsSubtotal)}</span>
                    </div>
                  </div>
                ) : null}
                <p className="rdm-bill-hint">
                  Add-on charges increase the event total and the guest&apos;s remaining balance (balance due). Collect
                  any balance due before check-out so the full amount is settled.
                </p>
              </>
            ) : (
              <dl className="rdm-dl">
                <div>
                  <dt className="rdm-dt">Quoted total</dt>
                  <dd className="rdm-dd">{r.total}</dd>
                </div>
                <div>
                  <dt className="rdm-dt">Amount paid / downpayment</dt>
                  <dd className="rdm-dd">{r.downpayment || r.downpaymentAmt}</dd>
                </div>
                <div>
                  <dt className="rdm-dt">Remaining balance</dt>
                  <dd className="rdm-dd">{r.balance}</dd>
                </div>
              </dl>
            )}
          </section>
          <section className="rdm-card rdm-card--span2">
            <h4 className="rdm-card__title">
              {isOccupied ? "Guest requests & bill notes (add-ons included)" : "Guest notes & special requests"}
            </h4>
            <p className="rdm-dd rdm-dd--muted" style={{ margin: 0 }}>
              {isOccupied
                ? addreqParsed.notes.length > 0
                  ? addreqParsed.notes.join("; ")
                  : addreqParsed.charges.length > 0
                    ? "No separate free-text notes — priced add-ons are listed under Current event bill."
                    : r.addreq && String(r.addreq).trim() && String(r.addreq).trim() !== "N/A"
                      ? String(r.addreq).trim()
                      : "None provided"
                : r.addreq && String(r.addreq).trim() && String(r.addreq).trim() !== "N/A"
                  ? String(r.addreq).trim()
                  : "None provided"}
            </p>
          </section>
          <ReservationProofPreview booking={proofBooking} proofSrc={proofSrc} />
          {showDeclineReason ? (
            <section className="rdm-card rdm-card--span2">
              <h4 className="rdm-card__title">Rejection reason</h4>
              <p className="rdm-dd" style={{ margin: 0 }}>
                {String(r.declineReason || "").trim()}
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

/** Read-only guest details (Reserved Guest → View) — same flow as frontdesk-rooms GuestViewModal. */
function GuestViewModal({ open, row, onClose, onEdit }) {
  if (!row) return null;
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Check Details"
      size="lg"
      placement="top"
      bodyClassName="modal-body-scroll"
      footer={
        <div className="modal-footer modal-footer-actions">
          <button type="button" className="btn-approve" onClick={onEdit}>
            Edit
          </button>
        </div>
      }
    >
          <div className="check-info-card">
            <h4 className="modal-card-title">Guest Information</h4>
            <div className="check-grid">
              <div><span className="detail-label">Guest</span><span className="detail-value">{row.guest}</span></div>
              <div><span className="detail-label">Date</span><span className="detail-value">{row.date}</span></div>
              <div><span className="detail-label">Total Balance</span><span className="detail-value">{row.balance}</span></div>
              <div><span className="detail-label">Venue No.</span><span className="detail-value">{row.venueno}</span></div>
              <div><span className="detail-label">Time Slot</span><span className="detail-value">{row.timeslot}</span></div>
              <div>
                <span className="detail-label">Payment Method</span>
                <span className="detail-value check-paymethod-cell">
                  {/gcash/i.test(String(row.paymethod || "")) && (
                    <img src={IMAGES.gcashCard} alt="" className="check-gcash-icon" width={22} height={22} decoding="async" />
                  )}
                  {row.paymethod}
                </span>
              </div>
              <div><span className="detail-label">Estimated Guest</span><span className="detail-value">{row.addguest}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{row.downpaymentAmt}</span></div>
              <div><span className="detail-label">Additional Request</span><span className="detail-value">{row.addreq || "N/A"}</span></div>
            </div>
          </div>
    </Modal>
  );
}

/** Reserved Guest → View → Edit — same pattern as frontdesk-rooms GuestEditModal. */
function GuestEditModal({ open, row, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => {
    if (row) setForm({ ...row });
  }, [row]);
  if (!row) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Edit guest event"
      size="lg"
      placement="top"
      bodyClassName="modal-body-scroll"
      footer={
        <div className="modal-footer modal-footer-actions">
          <button type="button" className="btn-reject" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-approve" onClick={() => onSave(form)}>
            Update Reservation
          </button>
        </div>
      }
    >
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Guest Name</label>
              <input type="text" className="edit-input" value={form.guest || ""} onChange={set("guest")} />
            </div>
            <div className="form-group">
              <label className="form-label">Venue No.</label>
              <input type="text" className="edit-input" value={form.venueno ?? form.venueNo ?? ""} onChange={set("venueno")} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Event date</label>
              <input type="text" className="edit-input" value={form.date ?? form.checkin ?? ""} onChange={set("date")} placeholder="e.g. 14-02-2026" />
            </div>
            <div className="form-group">
              <label className="form-label">Time slot</label>
              <input type="text" className="edit-input" value={form.timeslot || ""} onChange={set("timeslot")} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Estimated guest</label>
              <input type="number" className="edit-input" min="0" value={form.addguest ?? ""} onChange={set("addguest")} />
            </div>
            <div className="form-group">
              <label className="form-label">Payment method</label>
              <input type="text" className="edit-input" value={form.paymethod || ""} onChange={set("paymethod")} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Additional request</label>
            <textarea className="edit-input edit-textarea" value={form.addreq || ""} onChange={set("addreq")} placeholder="Additional requests" />
          </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   ADD CHARGES MODAL — extra hours + flat amount (no item/qty)
══════════════════════════════════════════ */
function AddChargesModal({
  open,
  onClose,
  onAddItem,
  currentTotalBalanceStr = "—",
  currentStayTotalStr = "—",
  currentPaymentsStr = "—",
}) {
  const [extraHours, setExtraHours] = useState("");
  const [amount, setAmount] = useState("");
  const [chargeItems, setChargeItems] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setExtraHours("");
    setAmount("");
    setChargeItems([]);
    setShowConfirm(false);
  }, [open]);

  const draftHours = parseExtraHoursValue(extraHours);
  const draftAmount = parseFloat(String(amount).replace(/,/g, ""));
  const draftChargeValid = Number.isFinite(draftHours) && Number.isFinite(draftAmount) && draftAmount > 0;
  const showDraftRow = Boolean(extraHours.trim() || amount.trim());
  const draftHoursLabel = Number.isFinite(draftHours)
    ? formatExtraHoursDisplay(draftHours)
    : "0 hrs";
  const draftAmountLabel =
    Number.isFinite(draftAmount) && draftAmount > 0 ? fmtPeso(draftAmount) : "—";
  const showSummaryEmpty = chargeItems.length === 0 && !showDraftRow;

  const previewTotal =
    chargeItems.reduce((s, c) => s + (Number(c.amount) || 0), 0) +
    (draftChargeValid ? draftAmount : 0);
  const balanceDueNum = parsePesoNum(currentTotalBalanceStr);
  const stayTotalNum = parsePesoNum(currentStayTotalStr);
  const balanceAfterCharges = Number.isFinite(balanceDueNum) ? Math.max(0, balanceDueNum + previewTotal) : NaN;
  const stayTotalAfterCharges = Number.isFinite(stayTotalNum) ? Math.max(0, stayTotalNum + previewTotal) : NaN;
  const showStayLine = currentStayTotalStr && currentStayTotalStr !== "—" && Number.isFinite(stayTotalNum);
  const showPaidLine = currentPaymentsStr && currentPaymentsStr !== "—";
  if (!open) return null;

  const remove = (i) => setChargeItems((prev) => prev.filter((_, idx) => idx !== i));
  const clear = () => {
    setExtraHours("");
    setAmount("");
  };

  const doAdd = () => {
    if (!draftChargeValid) return;
    const newItems = [...chargeItems, { extraHours: draftHours, amount: draftAmount }];
    setChargeItems(newItems);
    clear();
    setShowConfirm(false);
    onAddItem(newItems);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Add event charges"
        size="md"
        placement="top"
        panelClassName="fd-room-modal"
        footer={
          <div className="modal-footer modal-footer-actions">
            <button type="button" className="btn-confirm-cancel" onClick={clear}>
              Clear
            </button>
            <button
              type="button"
              className="btn-confirm-submit"
              onClick={() => {
                if (!draftChargeValid) return;
                setShowConfirm(true);
              }}
            >
              Add
            </button>
          </div>
        }
      >
        <div className="charges-layout">
          <div className="charges-form">
            <div className="form-group">
              <label className="detail-label">Extra Hours</label>
              <input
                type="text"
                inputMode="decimal"
                className="charges-input"
                placeholder="e.g. 2"
                value={extraHours}
                onChange={(e) => setExtraHours(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="detail-label">Amount</label>
              <input
                type="text"
                inputMode="decimal"
                className="charges-input"
                placeholder="e.g. 1000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="charges-list-wrap">
            <div className="charges-list-header">
              <span>Extra Hours</span>
              <span>Amount</span>
            </div>
            <div className="charges-list">
              {showSummaryEmpty ? (
                <div className="charge-item-row charge-summary-empty">
                  <span>0 hrs</span>
                  <span>—</span>
                </div>
              ) : null}
              {chargeItems.map((c, i) => (
                <div key={i} className="charge-item-row">
                  <span className="charge-item-hours">{formatExtraHoursDisplay(c.extraHours)}</span>
                  <div className="charge-item-amount-wrap">
                    <span className="charge-item-amount">{fmtPeso(c.amount)}</span>
                    <button
                      type="button"
                      className="charge-remove"
                      onClick={() => remove(i)}
                      aria-label="Remove charge"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {showDraftRow ? (
                <div className="charge-item-row charge-preview-row">
                  <span className="charge-item-hours">{draftHoursLabel}</span>
                  <span
                    className={`charge-item-amount${draftAmountLabel === "—" ? " charge-item-amount--muted" : ""}`}
                  >
                    {draftAmountLabel}
                  </span>
                </div>
              ) : null}
            </div>
            <div className="charges-total-row">
              <span>New charges total</span>
              <span>{fmtPeso(previewTotal)}</span>
            </div>
            <div className="charges-balance-hint charges-balance-hint--stack" aria-live="polite">
              <div className="charges-balance-hint__caption">Current bill (before this save)</div>
              {showStayLine ? (
                <div>
                  <span className="charges-balance-hint-label">Event total on bill</span>
                  <span className="charges-balance-hint-value">{currentStayTotalStr}</span>
                </div>
              ) : null}
              {showPaidLine ? (
                <div>
                  <span className="charges-balance-hint-label">Payments received</span>
                  <span className="charges-balance-hint-value">{currentPaymentsStr}</span>
                </div>
              ) : null}
              <div>
                <span className="charges-balance-hint-label">Balance due now</span>
                <span className="charges-balance-hint-value">{currentTotalBalanceStr}</span>
              </div>
              <div className="charges-balance-hint__caption charges-balance-hint__caption--after">
                After saving these charges
              </div>
              {showStayLine ? (
                <div>
                  <span className="charges-balance-hint-label">Event total on bill</span>
                  <span
                    className={`charges-balance-hint-value${previewTotal > 0 ? " charges-balance-hint-value--changed" : ""}`}
                  >
                    {Number.isFinite(stayTotalAfterCharges) ? fmtPeso(stayTotalAfterCharges) : "—"}
                  </span>
                </div>
              ) : null}
              <div>
                <span className="charges-balance-hint-label">Balance due</span>
                <span
                  className={`charges-balance-hint-value${previewTotal > 0 ? " charges-balance-hint-value--changed" : ""}`}
                >
                  {Number.isFinite(balanceAfterCharges) ? fmtPeso(balanceAfterCharges) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={showConfirm}
        layout="booking"
        tone="caution"
        headline="Add event charge"
        text="Add this extra-hours charge to the event bill and update the total balance?"
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setShowConfirm(false)}
        onConfirm={doAdd}
        confirmLabel="Add"
        cancelLabel="Cancel"
      />
    </>
  );
}

/* ══════════════════════════════════════════
   WALK-IN MODAL
══════════════════════════════════════════ */
const EVENT_WALKIN_INCLUDED_HOURS = 3;
/** Each hour beyond `EVENT_WALKIN_INCLUDED_HOURS` (flat add-on, not derived from listed base). */
const EVENT_WALKIN_EXTRA_HOUR_FLAT_RATE = 1000;

function roundWalkinEventMoney(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.round(x * 100) / 100;
}

function computeWalkinEventVenueBill(basePriceNum, durationHoursStr) {
  const parsed = parseFloat(String(durationHoursStr ?? "").replace(/,/g, ""));
  const durationHours =
    Number.isFinite(parsed) && parsed > 0 ? parsed : EVENT_WALKIN_INCLUDED_HOURS;
  const base = Number.isFinite(basePriceNum) && basePriceNum > 0 ? basePriceNum : 0;
  const extraHoursRaw = Math.max(0, durationHours - EVENT_WALKIN_INCLUDED_HOURS);
  const hourlyRate = EVENT_WALKIN_EXTRA_HOUR_FLAT_RATE;
  const additionalCharge = roundWalkinEventMoney(extraHoursRaw * hourlyRate);
  const total = roundWalkinEventMoney(base + additionalCharge);
  return {
    basePrice: base,
    durationHours,
    extraHours: roundWalkinEventMoney(extraHoursRaw),
    hourlyRate: roundWalkinEventMoney(hourlyRate),
    additionalCharge,
    total,
  };
}

function walkinEventPricingFootnote(bill) {
  return (
    `[Venue hire ${bill.durationHours} h — base (${EVENT_WALKIN_INCLUDED_HOURS} h) ${fmtPeso(bill.basePrice)}; ` +
    `extra ${bill.extraHours} h @ ${fmtPeso(bill.hourlyRate)}/h = ${fmtPeso(bill.additionalCharge)}; ` +
    `total ${fmtPeso(bill.total)}]`
  );
}

function eventCalendarRowAccent(statusRaw) {
  const s = String(statusRaw || "").toLowerCase();
  if (s === "occupied") return "#e74c3c";
  if (s === "pending") return "#f1c40f";
  if (s === "approved" || s === "confirmed" || s === "reserved") return "#27ae60";
  return "#95a5a6";
}

const WALKIN_EVENT_EMPTY_FORM = {
  package: "",
  eventName: "",
  date: "",
  startTime: "09:00",
  endTime: "12:00",
  customerName: "",
  email: "",
  contact: "",
  address: "",
  attendees: "",
  requests: "",
  payment: "cash",
  chkTerms: false,
  chkPrivacy: false,
  chkTOS: false,
};

function WalkinModal({ open, onClose, onSubmit, onBookingCreated, venuesCatalog = [], eventBookingsRaw = [], listLoading = false }) {
  const [form, setForm] = useState(() => ({ ...WALKIN_EVENT_EMPTY_FORM }));
  const [errors, setErrors] = useState({});
  const [showBanner, setShowBanner] = useState(false);
  const [idPreview, setIdPreview] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [payForm, setPayForm] = useState({ amountpaid: "", paydate: "", transid: "", proof: null });
  const [payErrors, setPayErrors] = useState({});
  const [proofPreview, setProofPreview] = useState(null);
  const setAgreement = (field) => (e) => {
    set(field, e.target.checked);
    setErrors((fe) => ({ ...fe, [field]: "" }));
  };

  const set = (k, v) => {
    setShowBanner(false);
    setForm((f) => ({ ...f, [k]: v }));
  };
  const setP = (k, v) => setPayForm((f) => ({ ...f, [k]: v }));

  const evToday = useMemo(() => new Date().toISOString().split("T")[0], [open]);
  const datePickerWindowTo = useMemo(() => addLocalDays(evToday, 540), [evToday]);

  const walkinFullVenueOptions = useMemo(() => {
    const loggedIn = !!getStoredAuthToken();
    const fromApi = (venuesCatalog || [])
      .map((v) => {
        const id = String(v.id ?? v._id ?? "").trim();
        const priceNum =
          typeof v.price === "number" && Number.isFinite(v.price)
            ? v.price
            : parsePesoNum(String(v.price ?? "0")) || 0;
        const name = String(v.name ?? v.title ?? v.package ?? "Venue").trim();
        const capacity = Number(v?.capacity);
        const maxGuests = Number.isFinite(capacity) && capacity > 0 ? capacity : 100;
        return {
          id,
          name,
          label: `${name} - ${formatStoredEventNumberForDisplay(v.eventNum)}`,
          priceNum,
          maxGuests,
        };
      })
      .filter((r) => r.id);
    if (fromApi.length > 0) return fromApi;
    if (!loggedIn) {
      return WALKIN_EVENT_FALLBACK.map((v) => ({
        id: String(v.id ?? "").trim(),
        name: v.name,
        label: `${v.name} - ${formatStoredEventNumberForDisplay(v.eventNum)}`,
        priceNum: 0,
        maxGuests: 100,
      }));
    }
    return [];
  }, [venuesCatalog]);

  const venueOptions = useMemo(() => walkinFullVenueOptions, [walkinFullVenueOptions]);

  const selectedVenueId = useMemo(() => {
    const loggedIn = !!getStoredAuthToken();
    const fromApi = (venuesCatalog || [])
      .map((v) => {
        const id = String(v.id ?? v._id ?? "").trim();
        const label = `${String(v.name ?? v.title ?? v.package ?? "Venue").trim()} - ${formatStoredEventNumberForDisplay(v.eventNum)}`;
        return { id, label };
      })
      .filter((r) => r.id);
    const base =
      fromApi.length > 0
        ? fromApi
        : !loggedIn
          ? WALKIN_EVENT_FALLBACK.map((v) => ({
              id: String(v.id ?? "").trim(),
              label: `${v.name} - ${formatStoredEventNumberForDisplay(v.eventNum)}`,
            }))
          : [];
    const hit = base.find((o) => o.label === form.package);
    return hit ? String(hit.id).trim() : "";
  }, [venuesCatalog, form.package]);

  const {
    occupied: eventOccupiedNightSet,
    approved: eventApprovedNightSet,
    pending: eventPendingNightSet,
  } = useMemo(
    () => splitWalkinEventCalendarNights(eventBookingsRaw, selectedVenueId),
    [eventBookingsRaw, selectedVenueId],
  );

  const walkinEventCalendarComponents = useMemo(
    () => ({
      DayButton: function WalkinEventDayButton(props) {
        return <DayButton {...props} />;
      },
    }),
    [],
  );

  const eventDateCalendarLabels = useMemo(
    () => ({
      labelDayButton(date, modifiers, options, dateLib) {
        let label = defaultLabelDayButton(date, modifiers, options, dateLib);
        const key = formatLocalYmd(date);
        if (selectedVenueId && eventOccupiedNightSet.has(key)) {
          label = `${label}. Occupied on this date.`;
        } else if (selectedVenueId && eventApprovedNightSet.has(key)) {
          label = `${label}. Approved / reserved on this date.`;
        } else if (selectedVenueId && eventPendingNightSet.has(key)) {
          label = `${label}. Pending reservation on this date.`;
        }
        return label;
      },
    }),
    [selectedVenueId, eventOccupiedNightSet, eventApprovedNightSet, eventPendingNightSet],
  );

  const checkEventDateDisabledMatchers = useMemo(() => {
    const t0 = parseLocalYmd(evToday);
    return [t0 ? { before: t0 } : { before: new Date() }];
  }, [evToday]);

  const selectedVenueOption = useMemo(
    () => venueOptions.find((o) => o.label === form.package),
    [venueOptions, form.package],
  );

  const walkinDurationHoursStr = String(
    durationHoursDecimalFromTimes(form.startTime, form.endTime) || EVENT_WALKIN_INCLUDED_HOURS,
  );

  const walkinEventBill = useMemo(() => {
    if (!selectedVenueOption || !(selectedVenueOption.priceNum > 0)) return null;
    return computeWalkinEventVenueBill(selectedVenueOption.priceNum, walkinDurationHoursStr);
  }, [selectedVenueOption, walkinDurationHoursStr]);

  const walkinModalVenueTitle = useMemo(() => {
    const { venueLabel } = splitWalkinEventSelection(form.package);
    return venueLabel || "Venue";
  }, [form.package]);

  const walkinPendingGcash = useMemo(() => {
    if (form.payment !== "gcash") return null;
    if (!payForm.amountpaid.trim() || !payForm.paydate || !payForm.transid.trim()) return null;
    const paidNum = parseFloat(String(payForm.amountpaid).replace(/[^0-9.]/g, ""));
    return {
      paidNum: Number.isFinite(paidNum) ? paidNum : 0,
      date: payForm.paydate,
      txId: payForm.transid.trim(),
      proofPreview,
    };
  }, [form.payment, payForm.amountpaid, payForm.paydate, payForm.transid, proofPreview]);

  const walkinEventBookingBill = useMemo(() => {
    if (!selectedVenueOption || !form.startTime || !form.endTime) return null;
    const hours = durationHoursDecimalFromTimes(form.startTime, form.endTime);
    if (!(hours > 0)) return null;
    return computeEventBookingBill({
      venueName: selectedVenueOption.name,
      basePrice: selectedVenueOption.priceNum,
      startTime: form.startTime,
      endTime: form.endTime,
      includedPax: selectedVenueOption.maxGuests ?? 100,
      expectedPax: form.attendees,
    });
  }, [selectedVenueOption, form.startTime, form.endTime, form.attendees]);

  const walkinLivePayment = useMemo(() => {
    if (!walkinEventBookingBill) return null;
    const paidNum =
      form.payment === "gcash" && walkinPendingGcash ? Number(walkinPendingGcash.paidNum) || 0 : 0;
    return paymentSnapshotFromBill(walkinEventBookingBill, paidNum);
  }, [walkinEventBookingBill, form.payment, walkinPendingGcash]);

  const walkinCalendarOverlapRows = useMemo(() => {
    if (!Array.isArray(eventBookingsRaw)) return [];
    return eventBookingsRaw
      .filter((b) => b && String(b.type || "").toLowerCase() === "event" && bookingStatusBlocksOverlap(b.status))
      .map((b) => ({
        id: String(b.id ?? b._id ?? ""),
        eventVenueId: String(b.eventVenueId ?? ""),
        eventDate: b.eventDate,
        eventEndDate: b.eventEndDate,
        startTime: String(b.startTime ?? "").trim(),
        endTime: String(b.endTime ?? "").trim(),
        timeSlot: String(b.timeSlot ?? "").trim(),
        status: String(b.status ?? "").trim(),
        customerName: String(bookingCustomerDisplayName(b) || "").trim(),
      }))
      .filter((r) => r.id);
  }, [eventBookingsRaw]);

  const walkinScheduleForSelectedDay = useMemo(() => {
    const vid = String(selectedVenueId || "").trim().toLowerCase();
    const d = String(form.date || "").trim();
    if (!vid || !d) return [];
    return walkinCalendarOverlapRows.filter((r) => {
      if (String(r.eventVenueId || "").trim().toLowerCase() !== vid) return false;
      const d0 = normEventWalkinDate(r.eventDate);
      const d1 = normEventWalkinDate(r.eventEndDate || r.eventDate) || d0;
      return d >= d0 && d <= d1;
    });
  }, [walkinCalendarOverlapRows, selectedVenueId, form.date]);

  useEffect(() => {
    if (!form.package || listLoading) return;
    const ok = walkinFullVenueOptions.some((o) => o.label === form.package);
    if (!ok) setForm((f) => ({ ...f, package: "" }));
  }, [walkinFullVenueOptions, form.package, listLoading]);

  useEffect(() => {
    if (showPayment) setPayQrMissing(false);
  }, [showPayment]);

  useEffect(() => () => {
    if (proofPreview) URL.revokeObjectURL(proofPreview);
  }, [proofPreview]);

  function clearPayForm() {
    setProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPayForm({ amountpaid: "", paydate: "", transid: "", proof: null });
    setPayErrors({});
  }

  async function handleProofFile(e) {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!f) return;
    setShowBanner(false);
    setPayErrors((er) => ({ ...er, proof: "" }));
    await handleImageFileInputChange(f, {
      uploadFn: uploadPaymentProofDirectBackend,
      setPreview: (url) => {
        setProofPreview(url);
        setPayForm((p) => ({ ...p, proof: f }));
      },
      setError: (msg) => {
        setProofPreview(null);
        setPayForm((p) => ({ ...p, proof: null }));
        setPayErrors((er) => ({ ...er, proof: msg || "Proof upload failed." }));
      },
    });
  }

  function selectPayment(val) {
    set("payment", val);
    if (val === "gcash") {
      setPayErrors({});
      setShowPayment(true);
    } else {
      setShowPayment(false);
      clearPayForm();
    }
  }

  function closePayModal() {
    setShowPayment(false);
    clearPayForm();
  }

  function handleSelectEventDate(d) {
    const s = d ? formatLocalYmd(d) : "";
    setShowBanner(false);
    setForm((f) => ({ ...f, date: s }));
    setErrors((er) => ({ ...er, date: "" }));
  }

  function handlePackageSelect(e) {
    const packageVal = e.target.value;
    setShowBanner(false);
    setForm((f) => ({ ...f, package: packageVal, date: "" }));
    setErrors((er) => ({ ...er, package: "", date: "" }));
  }

  async function handleIdFile(e) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setShowBanner(false);
    setErrors((er) => ({ ...er, id: "" }));
    await handleImageFileInputChange(file, {
      uploadFn: uploadBookingGuestValidIdDirectBackend,
      setPreview: setIdPreview,
      setError: (msg) => {
        setIdPreview(null);
        setErrors((er) => ({ ...er, id: msg || "ID upload failed." }));
      },
    });
  }

  const validate = () => {
    const errs = {};
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const att = parseInt(String(form.attendees ?? ""), 10);
    if (!form.package.trim()) errs.package = "Please select a venue.";
    if (!form.eventName.trim()) errs.eventName = "Event name is required.";
    if (!form.date) errs.date = "Date is required.";
    const tOk = parseEventStartEndMinutes(form.startTime, form.endTime);
    if (!tOk) {
      errs.startTime = true;
      errs.endTime = true;
    } else {
      const dh = durationHoursDecimalFromTimes(form.startTime, form.endTime);
      if (!Number.isFinite(dh) || dh < 0.5 || dh > 72) {
        errs.startTime = true;
        errs.endTime = true;
      } else if (
        selectedVenueId &&
        form.date.trim() &&
        eventNewRangeOverlapsExisting(
          selectedVenueId,
          form.date.trim(),
          form.startTime,
          form.endTime,
          walkinCalendarOverlapRows,
        )
      ) {
        errs.startTime = true;
        errs.endTime = true;
      }
    }
    if (!form.customerName.trim()) errs.customerName = "Customer name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!emailRx.test(form.email.trim())) errs.email = "Please enter a valid email.";
    if (!form.contact.trim()) errs.contact = "Contact number is required.";
    else {
      const digits = form.contact.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 11) errs.contact = "Enter a valid 10–11 digit mobile number.";
    }
    if (!Number.isFinite(att) || att < 1) errs.attendees = "Please enter the number of attendees (min 1).";
    if (!isStoredImageRef(idPreview)) errs.id = "Please upload a valid government ID.";
    if (!form.chkTerms) errs.chkTerms = "You must accept the Terms and Conditions.";
    if (!form.chkPrivacy) errs.chkPrivacy = "Please agree to the Data Privacy Policy.";
    if (!form.chkTOS) errs.chkTOS = "Please agree to the Terms & Conditions of Stay.";
    return errs;
  };

  const handleSubmitClick = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) {
      setShowBanner(true);
      return;
    }
    setShowBanner(false);
    if (form.payment === "gcash") {
      const pe = validatePayment();
      setPayErrors(pe);
      if (Object.keys(pe).length) return;
    }
    setShowPayment(false);
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setShowConfirm(false);
    if (
      selectedVenueId &&
      form.date.trim() &&
      eventNewRangeOverlapsExisting(
        selectedVenueId,
        form.date.trim(),
        form.startTime,
        form.endTime,
        walkinCalendarOverlapRows,
      )
    ) {
      window.alert(EVENT_TIME_OVERLAP_ALERT);
      return;
    }
    const paidNum =
      form.payment === "gcash"
        ? parseFloat(String(payForm.amountpaid).replace(/[^0-9.]/g, "")) || 0
        : 0;
    let totalNum = walkinEventBill ? walkinEventBill.total : 0;
    if (!totalNum && paidNum) totalNum = paidNum;
    const downNum = paidNum;
    const balNum = Math.max(0, totalNum - downNum);
    const opt =
      venueOptions.find((o) => o.label === form.package) ??
      walkinFullVenueOptions.find((o) => o.label === form.package);
    const rawId = opt?.id != null ? String(opt.id).trim() : "";
    const eventVenueId = rawId;
    const { eventno, venueLabel } = splitWalkinEventSelection(form.package);
    const pkgFormatted = formatEventPackageWithNumber(eventno, venueLabel, venueLabel);
    const reqPart = (form.requests || "").trim();
    const billNote = walkinEventBill ? walkinEventPricingFootnote(walkinEventBill) : "";
    const addreqMerged = [reqPart, billNote].filter(Boolean).join("\n\n") || "N/A";
    const pax = String(Math.max(1, parseInt(String(form.attendees), 10) || 1));
    const slotLabel = buildEventTimeSlotLabel(form.startTime, form.endTime);
    const venueNameForApi = String(opt?.name || venueLabel).trim() || venueLabel;
    const totalStr = Number.isFinite(totalNum) ? totalNum.toFixed(2) : "0.00";

    if (getStoredAuthToken()) {
      try {
        const hasId = isStoredImageRef(idPreview);
        const paymentProofData =
          form.payment === "gcash" && isStoredImageRef(proofPreview) ? String(proofPreview).trim() : "";
        const apiBody = {
          type: "event",
          customerName: form.customerName.trim(),
          email: form.email.trim().toLowerCase(),
          contactNumber: form.contact.trim(),
          address: String(form.address || "").trim(),
          eventVenueId,
          venueName: venueNameForApi,
          venuePrice: totalStr,
          totalAmount: totalStr,
          eventTitle: form.eventName.trim(),
          eventDate: form.date.trim(),
          eventEndDate: form.date.trim(),
          expectedPax: Math.max(1, parseInt(String(form.attendees), 10) || 1),
          additionalRequests: addreqMerged || "N/A",
          timeSlot: slotLabel || "",
          startTime: String(form.startTime || "").trim(),
          endTime: String(form.endTime || "").trim(),
          paymentAmount: String(downNum),
          paymentMethod: form.payment === "gcash" ? "Gcash" : "Cash",
          transactionId: form.payment === "gcash" ? String(payForm.transid || "").trim() : "",
          guestIdPhotoName: hasId ? "uploaded" : "",
          guestIdPhotoData: hasId ? idPreview : "",
          paymentDate: form.payment === "gcash" ? String(payForm.paydate || "").trim() : "",
          paymentProofData,
          paymentProofName: paymentProofData ? "uploaded" : "",
        };
        await createBookingBackend(apiBody);
        if (typeof onBookingCreated === "function") {
          await onBookingCreated();
        }
      } catch (e) {
        const msg = e && typeof e.message === "string" ? e.message : "";
        if ((e && e.status === 409) || /overlap|unavailable|cleaning/i.test(msg)) {
          window.alert(EVENT_TIME_OVERLAP_ALERT);
        } else {
          window.alert(bookingSaveAlertMessage(e) || msg || "Could not save booking.");
        }
        return;
      }
    } else {
      onSubmit({
        type: "Event",
        customer: form.customerName.trim(),
        package: pkgFormatted,
        venueName: venueLabel,
        eventVenueId,
        total: fmt(totalNum),
        downpayment: fmt(downNum),
        balance: fmt(balNum),
        status: "pending",
        venueNo: eventno !== "—" ? eventno : String(Date.now()).slice(-2),
        price: fmt(totalNum),
        email: form.email.trim().toLowerCase(),
        contact: form.contact.trim(),
        checkin: form.date,
        timeslot: slotLabel || "",
        addguest: pax,
        paid: fmt(downNum),
        refnum: "ABR-EVENT-" + Date.now(),
        amountpaid: fmt(downNum),
        paydate: payForm.paydate,
        transid: payForm.transid,
        addreq: addreqMerged,
      });
    }

    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setShowBanner(false);
      setForm({ ...WALKIN_EVENT_EMPTY_FORM });
      setIdPreview(null);
      setShowPayment(false);
      clearPayForm();
      onClose();
    }, 2000);
  };

  const validatePayment = () => {
    const errs = {};
    if (!payForm.amountpaid.trim()) errs.amountpaid = "Required.";
    if (!payForm.paydate) errs.paydate = "Required.";
    if (!payForm.transid.trim()) errs.transid = "Required.";
    if (!isStoredImageRef(proofPreview)) errs.proof = "Please upload proof.";
    return errs;
  };

  const submitPayment = () => {
    const errs = validatePayment();
    setPayErrors(errs);
    if (Object.keys(errs).length) return;
    setShowPayment(false);
  };

  function dismissWalkin() {
    setShowConfirm(false);
    setShowSuccess(false);
    setShowPayment(false);
    setPayQrMissing(false);
    setShowBanner(false);
    setErrors({});
    clearPayForm();
    setForm({ ...WALKIN_EVENT_EMPTY_FORM });
    setIdPreview(null);
    onClose();
  }

  useEffect(() => {
    if (open) return;
    setShowConfirm(false);
    setShowSuccess(false);
    setShowPayment(false);
    setPayQrMissing(false);
    setShowBanner(false);
    setPayErrors({});
    setProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPayForm({ amountpaid: "", paydate: "", transid: "", proof: null });
    setForm({ ...WALKIN_EVENT_EMPTY_FORM });
    setIdPreview(null);
    setErrors({});
  }, [open]);

  if (!open && !showConfirm && !showSuccess) return null;

  return (
    <>
      {open && !showConfirm && !showSuccess && (
        <div className="walkin-event-booking-root ev-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && dismissWalkin()}>
          <div
            className="ev-modal ev-modal--reservation"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ev-wi-reservation-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ev-modal-header ev-modal-header--reservation">
              <h2 id="ev-wi-reservation-modal-title" className="ev-modal-title">
                {walkinModalVenueTitle} — Reservation
              </h2>
              <button type="button" className="ev-modal-close" onClick={dismissWalkin} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="ev-modal-body ev-modal-body--reservation">
              <div className="booking-form booking-form--event ev-reservation-form">
                {showBanner ? (
                  <p className="booking-form-error-banner" role="alert">
                    {(errors.startTime || errors.endTime) && (
                      <>
                        Check event times: end must be after start (0.5–72 hours), and your range must not overlap another
                        reservation or the 2-hour cleaning buffer after an existing event.
                        <br />
                      </>
                    )}
                    Please fill in all required fields before submitting.
                  </p>
                ) : null}

                <div className="ev-form-row">
                  <div className="ev-form-group ev-full-width">
                    <label htmlFor="wi-ev-venue-select">
                      Select event venue / package <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    {listLoading ? (
                      <p className="booking-cal-hint" role="status">
                        Loading event venues from the server…
                      </p>
                    ) : (
                      <p className="booking-cal-hint">
                        Choose the venue or package for this walk-in guest. Pick a date below to see availability for the selected
                        venue.
                      </p>
                    )}
                    <select
                      id="wi-ev-venue-select"
                      className={errors.package ? "ev-error" : ""}
                      value={form.package}
                      onChange={handlePackageSelect}
                      disabled={listLoading && walkinFullVenueOptions.length === 0}
                      aria-busy={listLoading}
                    >
                      <option value="">— Select event venue / package —</option>
                      {venueOptions.map((o) => (
                        <option key={`${o.id}|${o.label}`} value={o.label}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {!listLoading && venueOptions.length === 0 ? (
                      <span className="ev-field-err visible">
                        No event venues are configured — add venues in Admin or sign in to load the catalog.
                      </span>
                    ) : null}
                    {errors.package ? <span className={`ev-field-err${errors.package ? " visible" : ""}`}>{errors.package}</span> : null}
                  </div>
                </div>

                <div className="ev-form-row">
                  <div className="ev-form-group">
                    <label>
                      Event Name <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="eventName"
                      placeholder="e.g. Birthday Party"
                      value={form.eventName}
                      className={errors.eventName ? "ev-error" : ""}
                      onChange={(e) => set("eventName", e.target.value)}
                    />
                    <span className={`ev-field-err${errors.eventName ? " visible" : ""}`}>Event name is required.</span>
                  </div>
                  <div className="ev-form-group">
                    <label>
                      Customer Name <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="customerName"
                      placeholder="e.g. Janah Cultura"
                      value={form.customerName}
                      className={errors.customerName ? "ev-error" : ""}
                      onChange={(e) => set("customerName", e.target.value)}
                    />
                    <span className={`ev-field-err${errors.customerName ? " visible" : ""}`}>Customer name is required.</span>
                  </div>
                </div>

                <div className="ev-form-row">
                  <div className="ev-form-group">
                    <label>
                      Contact Number <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <input
                      type="text"
                      name="contact"
                      placeholder="e.g. 09XXXXXXXXX"
                      maxLength={11}
                      value={form.contact}
                      className={errors.contact ? "ev-error" : ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "");
                        set("contact", v);
                      }}
                    />
                    <span className={`ev-field-err${errors.contact ? " visible" : ""}`}>Valid 10–11 digit contact number is required.</span>
                  </div>
                  <div className="ev-form-group">
                    <label>
                      Email <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      placeholder="e.g. example@email.com"
                      value={form.email}
                      className={errors.email ? "ev-error" : ""}
                      onChange={(e) => set("email", e.target.value)}
                    />
                    <span className={`ev-field-err${errors.email ? " visible" : ""}`}>A valid email address is required.</span>
                  </div>
                </div>

                <div className="form-row form-row--event-schedule ev-form-row ev-form-row--guest-event-date-cal">
                  <p className="booking-cal-unavailable-hint">
                    <strong>How to book:</strong> Past dates are disabled. Yellow is pending, green is approved, red is occupied.
                    Pick start/end times that do not overlap another booking on the same date.
                  </p>
                  <div className="ev-form-group">
                    <span className="form-label-static" id="ev-wi-guest-date-label">
                      Date <span className="required">*</span>
                    </span>
                    <div
                      className={
                        errors.date ? "booking-day-picker-wrap booking-day-picker-wrap--error" : "booking-day-picker-wrap"
                      }
                    >
                      <DayPicker
                        key={`wi-ev-cal-${selectedVenueId || "none"}`}
                        mode="single"
                        components={walkinEventCalendarComponents}
                        selected={form.date ? parseLocalYmd(form.date) : undefined}
                        onSelect={handleSelectEventDate}
                        startMonth={parseLocalYmd(evToday) ?? undefined}
                        endMonth={parseLocalYmd(datePickerWindowTo) ?? undefined}
                        defaultMonth={parseLocalYmd(form.date) ?? parseLocalYmd(evToday) ?? undefined}
                        disabled={checkEventDateDisabledMatchers}
                        labels={eventDateCalendarLabels}
                        modifiers={{
                          evOccupied: (date) =>
                            Boolean(selectedVenueId) && eventOccupiedNightSet.has(formatLocalYmd(date)),
                          evApproved: (date) =>
                            Boolean(selectedVenueId) && eventApprovedNightSet.has(formatLocalYmd(date)),
                          evPending: (date) =>
                            Boolean(selectedVenueId) && eventPendingNightSet.has(formatLocalYmd(date)),
                        }}
                        modifiersClassNames={{
                          evOccupied: "fd-cal-cell fd-cal-cell--occupied",
                          evApproved: "fd-cal-cell fd-cal-cell--approved",
                          evPending: "fd-cal-cell fd-cal-cell--pending",
                        }}
                        className="booking-day-picker"
                        id="wi-ev-date-calendar"
                        aria-labelledby="ev-wi-guest-date-label"
                      />
                    </div>
                    <span className={`ev-field-err${errors.date ? " visible" : ""}`}>Please select a date (not in the past).</span>
                  </div>
                  <div className="ev-form-group ev-form-group--event-times">
                    <div className="ev-time-stack">
                      <div className="ev-time-field">
                        <label className="form-label-static" htmlFor="wi-ev-start-time">
                          Event start time <span className="required">*</span>
                        </label>
                        <input
                          id="wi-ev-start-time"
                          type="time"
                          name="startTime"
                          value={form.startTime}
                          className={errors.startTime ? "ev-error" : ""}
                          onChange={(e) => {
                            set("startTime", e.target.value);
                            setErrors((er) => ({ ...er, startTime: "", endTime: "" }));
                          }}
                        />
                      </div>
                      <div className="ev-time-field">
                        <label className="form-label-static" htmlFor="wi-ev-end-time">
                          Event end time <span className="required">*</span>
                        </label>
                        <input
                          id="wi-ev-end-time"
                          type="time"
                          name="endTime"
                          value={form.endTime}
                          className={errors.endTime ? "ev-error" : ""}
                          onChange={(e) => {
                            set("endTime", e.target.value);
                            setErrors((er) => ({ ...er, startTime: "", endTime: "" }));
                          }}
                        />
                      </div>
                    </div>
                    <span className={`ev-field-err${errors.startTime || errors.endTime ? " visible" : ""}`}>
                      Choose end after start (0.5–72 hours). Times must not overlap another booking on the same date.
                    </span>
                    <p className="booking-schedule-note" role="note">
                      <strong>Note:</strong> The first {EVENT_BASE_INCLUDED_HOURS} hours are included in the venue base rate. Each
                      additional hour is {fmtPeso(EVENT_WALKIN_EXTRA_HOUR_FLAT_RATE)}.
                    </p>
                  </div>
                </div>
                <div className="ev-guest-ev-cal-legend-wrap">
                  <div className="fd-cal-legend" aria-label="Schedule legend">
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-swatch fd-cal-legend-swatch--available" aria-hidden /> Available
                    </span>
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-swatch fd-cal-legend-swatch--pending" aria-hidden /> Pending
                    </span>
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-swatch fd-cal-legend-swatch--approved" aria-hidden /> Approved / Reserved
                    </span>
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-swatch fd-cal-legend-swatch--occupied" aria-hidden /> Occupied
                    </span>
                  </div>
                </div>

                {form.date && selectedVenueId ? (
                  <div className="ev-guest-ev-day-schedule" style={{ marginTop: 4 }}>
                    <p className="ev-field-hint" style={{ marginBottom: 10 }}>
                      <strong>Booked times on {form.date}</strong> (live from hotel reservations). Full-day holds show when no start/end
                      times are stored yet.
                    </p>
                    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                      {walkinScheduleForSelectedDay.length === 0 ? (
                        <li className="ev-field-hint">No blocking bookings on this date for this venue.</li>
                      ) : (
                        walkinScheduleForSelectedDay.map((r) => {
                          const slot =
                            r.startTime && r.endTime
                              ? buildEventTimeSlotLabel(r.startTime, r.endTime)
                              : (r.timeSlot && r.timeSlot.trim()) || "Time on file";
                          const accent = eventCalendarRowAccent(r.status);
                          return (
                            <li
                              key={r.id}
                              style={{
                                borderLeft: `4px solid ${accent}`,
                                padding: "8px 10px",
                                marginBottom: 8,
                                background: "#faf9f6",
                                borderRadius: 6,
                              }}
                            >
                              <strong>{slot}</strong>
                              <span style={{ color: "#6b5a3e", marginLeft: 8 }}>
                                · {String(r.status || "").trim() || "—"}
                              </span>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </div>
                ) : null}

                {walkinEventBookingBill ? (
                  <div className="booking-form-billing-block">
                    <BillingSummary bill={walkinEventBookingBill} title="Billing summary" showMinimumDown />
                    {walkinLivePayment ? (
                      <BillingPaymentPills
                        total={walkinLivePayment.total}
                        amountPaid={walkinLivePayment.amountPaid}
                        balanceDue={walkinLivePayment.balanceDue}
                        minimumDownPayment={walkinLivePayment.minimumDownPayment}
                      />
                    ) : null}
                  </div>
                ) : form.startTime && form.endTime ? (
                  <p className="booking-bill-hint" role="status">
                    Set valid start and end times to see your billing summary.
                  </p>
                ) : null}

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="wi-ev-attendees">
                      Estimated Attendees <span className="required">*</span>
                    </label>
                    <input
                      id="wi-ev-attendees"
                      type="number"
                      name="attendees"
                      min={1}
                      placeholder="e.g. 30"
                      value={form.attendees}
                      className={errors.attendees ? "input-error" : ""}
                      onChange={(e) => set("attendees", e.target.value)}
                    />
                    {errors.attendees ? (
                      <span className="field-error">Please enter the number of attendees.</span>
                    ) : null}
                  </div>
                  <div className="form-group">
                    <span className="form-label-static">
                      Guest ID <span className="required">*</span>
                    </span>
                    <label
                      htmlFor="wi-ev-id-file"
                      className={`upload-box upload-box--booking-id${errors.id ? " box-error" : ""}`}
                    >
                      <input id="wi-ev-id-file" type="file" accept="image/*" onChange={handleIdFile} />
                      {idPreview ? (
                        <img src={idPreview} className="upload-preview" alt="ID preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <UserIcon />
                          <span>Upload government ID</span>
                        </div>
                      )}
                    </label>
                    {errors.id ? <span className="field-error">{errors.id}</span> : null}
                  </div>
                </div>

                <div className="form-section form-section--textarea">
                  <label className="form-section__label" htmlFor="wi-ev-requests">
                    Additional requests
                  </label>
                  <textarea
                    id="wi-ev-requests"
                    rows={4}
                    value={form.requests}
                    placeholder="Special requests or notes (optional)"
                    onChange={(e) => set("requests", e.target.value)}
                  />
                </div>

                <div className="ev-form-section ev-form-section--payment">
                  <div className="ev-form-section__head">
                    <CardIcon aria-hidden />
                    <h3 className="ev-form-section__title">Payment options</h3>
                  </div>
                  <p className="ev-form-section__desc">
                    Pay with cash on arrival, or choose GCash to scan and save your payment details in this form. Saving GCash details does not send your booking until you click Submit Reservation and confirm.
                  </p>
                  <div className="ev-payment-options">
                    <label className={`ev-payment-card${form.payment === "cash" ? " ev-selected" : ""}`} onClick={() => selectPayment("cash")}>
                      <input type="radio" name="wi-ev-walkin-pay" value="cash" readOnly checked={form.payment === "cash"} />
                      <div className="ev-payment-card-inner">
                        <CashPayIcon />
                        <strong>Cash</strong>
                        <span>Pay at the venue — no online form needed</span>
                      </div>
                    </label>
                    <label className={`ev-payment-card${form.payment === "gcash" ? " ev-selected" : ""}`} onClick={() => selectPayment("gcash")}>
                      <input type="radio" name="wi-ev-walkin-pay" value="gcash" readOnly checked={form.payment === "gcash"} />
                      <div className="ev-payment-card-inner">
                        <div className="ev-payment-gcash-icon-wrap">
                          <img src={IMAGES.gcashCard} alt="" className="ev-payment-logo-gcash" width={32} height={32} decoding="async" />
                        </div>
                        <strong>GCash</strong>
                        <span>Scan QR and fill in amount, date, and proof</span>
                      </div>
                    </label>
                  </div>
                </div>

                <TermsAgreementsSection
                  variant="event"
                  termsChecked={form.chkTerms}
                  privacyChecked={form.chkPrivacy}
                  stayChecked={form.chkTOS}
                  onTermsChange={setAgreement("chkTerms")}
                  onPrivacyChange={setAgreement("chkPrivacy")}
                  onStayChange={setAgreement("chkTOS")}
                  errors={{
                    chkTerms: errors.chkTerms,
                    chkPrivacy: errors.chkPrivacy,
                    chkTOS: errors.chkTOS,
                  }}
                />

                {form.package && (form.date || form.eventName.trim() || form.customerName.trim()) ? (
                  <div className="ev-booking-review-summary" aria-labelledby="ev-wi-booking-review-title">
                    <h3 id="ev-wi-booking-review-title" className="ev-booking-review-summary__title">
                      Booking summary
                    </h3>
                    <ul className="ev-booking-review-summary__list">
                      <li>
                        <span className="ev-booking-review-summary__k">Venue</span>
                        <span className="ev-booking-review-summary__v">{walkinModalVenueTitle}</span>
                      </li>
                      <li>
                        <span className="ev-booking-review-summary__k">Event</span>
                        <span className="ev-booking-review-summary__v">{form.eventName.trim() || "—"}</span>
                      </li>
                      <li>
                        <span className="ev-booking-review-summary__k">Date</span>
                        <span className="ev-booking-review-summary__v">{form.date || "—"}</span>
                      </li>
                      <li>
                        <span className="ev-booking-review-summary__k">Time</span>
                        <span className="ev-booking-review-summary__v">
                          {buildEventTimeSlotLabel(form.startTime, form.endTime) || "—"}
                        </span>
                      </li>
                      <li>
                        <span className="ev-booking-review-summary__k">Duration</span>
                        <span className="ev-booking-review-summary__v">
                          {(() => {
                            const h = durationHoursDecimalFromTimes(form.startTime, form.endTime);
                            return Number.isFinite(h) && h > 0 ? `${h} h` : "—";
                          })()}
                        </span>
                      </li>
                      <li>
                        <span className="ev-booking-review-summary__k">Contact</span>
                        <span className="ev-booking-review-summary__v">{form.customerName.trim() || "—"}</span>
                      </li>
                      <li>
                        <span className="ev-booking-review-summary__k">Estimated attendees</span>
                        <span className="ev-booking-review-summary__v">{form.attendees || "—"}</span>
                      </li>
                      {walkinEventBookingBill ? (
                        <li>
                          <span className="ev-booking-review-summary__k">Total due</span>
                          <span className="ev-booking-review-summary__v">{fmtPeso(walkinEventBookingBill.total)}</span>
                        </li>
                      ) : null}
                      {walkinLivePayment ? (
                        <li>
                          <span className="ev-booking-review-summary__k">Remaining balance</span>
                          <span className="ev-booking-review-summary__v">{fmtPeso(walkinLivePayment.balanceDue)}</span>
                        </li>
                      ) : null}
                      <li>
                        <span className="ev-booking-review-summary__k">Payment method</span>
                        <span className="ev-booking-review-summary__v">{form.payment === "gcash" ? "GCash" : "Cash on arrival"}</span>
                      </li>
                      {form.payment === "gcash" && walkinPendingGcash ? (
                        <li>
                          <span className="ev-booking-review-summary__k">GCash</span>
                          <span className="ev-booking-review-summary__v">
                            {fmtPeso(walkinPendingGcash.paidNum)} on {walkinPendingGcash.date}, ref. {walkinPendingGcash.txId}
                            {walkinPendingGcash.proofPreview ? " · Proof attached" : ""}
                          </span>
                        </li>
                      ) : form.payment === "gcash" ? (
                        <li>
                          <span className="ev-booking-review-summary__k">GCash</span>
                          <span className="ev-booking-review-summary__v ev-booking-review-summary__v--muted">
                            Not saved yet — click Submit Reservation to open the payment form.
                          </span>
                        </li>
                      ) : null}
                    </ul>
                  </div>
                ) : null}

                {form.payment === "gcash" && walkinPendingGcash ? (
                  <p className="ev-gcash-draft-note" role="status">
                    GCash details are saved in this form only. Review the summary above, then click Submit Reservation to send this walk-in to the hotel.
                  </p>
                ) : null}

                <div className="ev-modal-actions">
                  <button
                    type="button"
                    className="ev-btn-clear"
                    onClick={() => {
                      setShowBanner(false);
                      setForm({ ...WALKIN_EVENT_EMPTY_FORM });
                      setIdPreview(null);
                      setErrors({});
                      setShowPayment(false);
                      clearPayForm();
                    }}
                  >
                    Clear
                  </button>
                  <button type="button" className="ev-btn-submit" onClick={handleSubmitClick}>
                    Submit Reservation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {open && showPayment && (
        <div
          className="walkin-event-booking-root ev-modal-backdrop active ev-payment-backdrop-walkin"
          style={{ zIndex: 10061 }}
          onClick={(e) => e.target === e.currentTarget && closePayModal()}
        >
          <div className="ev-modal ev-payment-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="ev-modal-header">
              <h2 className="ev-modal-title">GCash Payment</h2>
              <button type="button" className="ev-modal-close" onClick={closePayModal} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="ev-modal-body ev-payment-modal-body">
              <div className="ev-payment-qr-side">
                <div className="ev-payment-qr-brand">
                  <div className={`ev-qr-payment-frame${payQrMissing ? " ev-qr-payment-frame--empty" : ""}`}>
                    {!payQrMissing && (
                      <img
                        src={IMAGES.gcashPaymentQr}
                        alt=""
                        className="ev-qr-img ev-qr-img-payment"
                        decoding="async"
                        onError={() => setPayQrMissing(true)}
                      />
                    )}
                    {payQrMissing && (
                      <div className="ev-qr-payment-placeholder" aria-hidden>
                        <span className="ev-qr-payment-placeholder-label">QR code</span>
                      </div>
                    )}
                  </div>
                  <p className="ev-qr-name">GCash</p>
                </div>
                <p className="ev-gcash-handle">@Abela Suites</p>
              </div>
              <div className="ev-payment-form-side">
                <p className="ev-payment-modal-lead">
                  Enter your transfer details and proof here. This only saves them in your booking form — your reservation is not sent until you click Submit Reservation and confirm.
                </p>
                <div className="ev-payment-form-scroll">
                  <h3 className="ev-payment-form-title">Fill this Form</h3>
                  {walkinEventBill ? (
                    <div className="ev-pay-billing-recap" aria-live="polite">
                      <p className="ev-pay-billing-recap__label">Amount due (this booking)</p>
                      <p className="ev-pay-billing-recap__total">{fmtPeso(walkinEventBill.total)}</p>
                      <ul className="ev-pay-billing-recap__list">
                        <li>
                          Base ({EVENT_WALKIN_INCLUDED_HOURS} h): {fmtPeso(walkinEventBill.basePrice)}
                        </li>
                        {walkinEventBill.extraHours > 0 ? (
                          <li>
                            Extra {walkinEventBill.extraHours} h @ {fmtPeso(walkinEventBill.hourlyRate)}/h: {fmtPeso(walkinEventBill.additionalCharge)}
                          </li>
                        ) : (
                          <li>No extra-hour charges</li>
                        )}
                      </ul>
                    </div>
                  ) : null}
                  <div className="ev-payment-form-grid">
                    <div className="ev-form-group">
                      <label>
                        Amount Paid <span style={{ color: "#e74c3c" }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1,666"
                        value={payForm.amountpaid}
                        className={payErrors.amountpaid ? "ev-error" : ""}
                        onChange={(e) => setP("amountpaid", e.target.value)}
                      />
                      <span className={`ev-field-err${payErrors.amountpaid ? " visible" : ""}`}>{payErrors.amountpaid || ""}</span>
                    </div>
                    <div className="ev-form-group">
                      <label>
                        Date <span style={{ color: "#e74c3c" }}>*</span>
                      </label>
                      <input type="date" value={payForm.paydate} className={payErrors.paydate ? "ev-error" : ""} onChange={(e) => setP("paydate", e.target.value)} />
                      <span className={`ev-field-err${payErrors.paydate ? " visible" : ""}`}>{payErrors.paydate || ""}</span>
                    </div>
                  </div>
                  <div className="ev-form-group ev-payment-form-group--spaced">
                    <label>
                      Transaction ID <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={payForm.transid}
                      className={payErrors.transid ? "ev-error" : ""}
                      onChange={(e) => setP("transid", e.target.value)}
                    />
                    <span className={`ev-field-err${payErrors.transid ? " visible" : ""}`}>{payErrors.transid || ""}</span>
                  </div>
                  <div className="ev-form-group ev-payment-form-group--spaced">
                    <label>
                      Proof of Payment <span style={{ color: "#e74c3c" }}>*</span>
                    </label>
                    <label className={`ev-upload-box ev-proof-upload${payErrors.proof ? " ev-error" : ""}`}>
                      <input type="file" accept="image/*" onChange={handleProofFile} />
                      {proofPreview ? (
                        <img src={proofPreview} className="ev-upload-preview" alt="Proof preview" />
                      ) : (
                        <div className="ev-upload-placeholder">
                          <UploadIcon />
                          <span>Upload your proof of payment here...</span>
                        </div>
                      )}
                    </label>
                    <span className={`ev-field-err${payErrors.proof ? " visible" : ""}`}>{payErrors.proof || ""}</span>
                  </div>
                </div>
                <div className="ev-payment-form-actions">
                  <button type="button" className="ev-btn-clear" onClick={clearPayForm}>
                    Clear
                  </button>
                  <button type="button" className="ev-btn-submit" onClick={submitPayment}>
                    Save payment details
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="walkin-event-booking-root ev-confirm-backdrop active">
          <div className="ev-confirm-dialog">
            <div className="ev-confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="ev-confirm-exclaim">!</span>
            </div>
            <h3 className="ev-confirm-title">Submit reservation?</h3>
            <p className="ev-confirm-sub">Please confirm before adding this walk-in to the events list.</p>
            <div className="ev-confirm-btns">
              <button type="button" className="ev-btn-cancel-confirm" onClick={() => setShowConfirm(false)}>
                Cancel
              </button>
              <button type="button" className="ev-btn-submit-confirm" onClick={doSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="walkin-event-booking-root ev-confirm-backdrop active">
          <div className="ev-confirm-dialog">
            <div className="ev-confirm-icon">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span style={{ position: "absolute", fontSize: 32, fontWeight: 900, color: "#27ae60" }}>✓</span>
            </div>
            <h3 className="ev-confirm-title">Reservation submitted!</h3>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="wi-center-overlay" style={{ display: "flex" }}>
          <div className="wi-confirm-box">
            <div className="wi-confirm-icon">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /></svg>
              <span style={{ position: "absolute", fontSize: 32, fontWeight: 900, color: "#27ae60" }}>✓</span>
            </div>
            <p className="wi-confirm-text">Reservation Submitted!</p>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════
   MAIN PAGE COMPONENT
══════════════════════════════════════════ */
function visibleClientPageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

function EventReservation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [tab, setTab] = useState("reservation");
  /** Reservation tab: `all` | `pending` | `approved` | `rejected` | `occupied` — same as Rooms. */
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  /** Client-side table pagination only; same booking fetch as before (no API or DB change). */
  const [eventsTablePage, setEventsTablePage] = useState(1);
  const [eventsTablePageSize, setEventsTablePageSize] = useState(10);
  const [toast, setToast] = useState({ visible: false, msg: "", type: "approved" });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(false);
  const [checkinConfirm, setCheckinConfirm] = useState(false);
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);
  const [addChargesOpen, setAddChargesOpen] = useState(false);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [reservationsLoad, setReservationsLoad] = useState(false);
  const [reservationsErr, setReservationsErr] = useState("");
  /** Same `GET /api/eventvenues` + raw `GET /api/bookings` list as the reservation table (walk-in venue picker). */
  const [walkinVenueCatalog, setWalkinVenueCatalog] = useState([]);
  const [walkinBookingsRaw, setWalkinBookingsRaw] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  /** Snapshot of the row opened in Review (approve/reject) — same pattern as frontdesk-rooms. */
  const [detailsRow, setDetailsRow] = useState(null);
  /** Reserved Guest tab: row open in Check Details (same as frontdesk-rooms `checkRow`). */
  const [checkRow, setCheckRow] = useState(null);
  /** Read-only view from Reserved Guest → View. */
  const [guestViewRow, setGuestViewRow] = useState(null);
  const [guestEditRow, setGuestEditRow] = useState(null);
  const [guestUpdateConfirm, setGuestUpdateConfirm] = useState(false);
  const [pendingGuestEdit, setPendingGuestEdit] = useState(null);
  const [guestSuccess, setGuestSuccess] = useState(false);
  const staffTopbarRef = useRef(null);
  /** Latest venue id → eventNum map from API (for mapping patched bookings). */
  const venueMapRef = useRef(new Map());
  const venueNameMapRef = useRef(new Map());
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { pendingCount, displayNotifications, loadPending, markStaffNotificationsSeen } =
    useFrontdeskPendingNotifications({
      bookingType: "event",
    });
  const { mainStyle } = useFrontdeskShell();

  const curRes = reservations.find((r) => String(r.id) === String(currentId)) || null;

  const guestRows = useMemo(
    () =>
      reservations
        .filter((r) => {
          const api = String(r._apiStatus || "").toLowerCase();
          if (api === "completed" || api === "cancelled") return false;
          const s = String(r.status || "").toLowerCase();
          if (s === "pending" || s === "rejected") return false;
          if (s === "cancelledbooking" || s === "cancelled") return false;
          /** After check-out, row lives in Reservation History only (not Reserved Guest). */
          if (s === "checked-out" || s === "completed") return false;
          return true;
        })
        .map((r) => ({
          ...r,
          guest: r.customer,
          date: r.checkin,
          venueno: String(r.venueNo ?? r.number ?? "—"),
          downpaymentAmt: r.downpayment,
        })),
    [reservations],
  );

  /** Snapshot for Add Charges modal: event total, payments, balance due (matches Check modal / table). */
  const addChargesBillingSnapshot = useMemo(() => {
    if (!checkRow) return null;
    const key = eventRowMatchKey(checkRow);
    const r = reservations.find((x) => eventRowMatchKey(x) === key);
    const src = r ?? checkRow;
    return {
      balanceDue: src?.balance ?? checkRow.balance ?? "—",
      stayTotal: src?.total ?? checkRow.total ?? "—",
      payments: src?.downpayment ?? checkRow.downpayment ?? "—",
    };
  }, [checkRow, reservations]);

  useEffect(() => {
    if (!checkRow) setAddChargesOpen(false);
  }, [checkRow]);

  const applyNotificationBookingNavigation = useCallback(
    (notif) => {
      const bookingId = String(notif?.bookingId || "").trim();
      if (!bookingId) return false;
      staffTopbarRef.current?.hideMenusOnly?.();
      const row = reservations.find((r) => mongoIdFromRow(r) === bookingId);
      if (row) {
        setTab("reservation");
        setCurrentId(row.id);
        setDetailsRow(row);
        setDetailsOpen(true);
        setRejectOpen(false);
        setApproveConfirm(false);
        navigate("/frontdesk-events", { replace: true });
        return true;
      }
      const bookingType = String(notif?.bookingType || "").toLowerCase();
      const hay = `${String(notif?.msg || "")} ${String(notif?.detail || "")}`.toLowerCase();
      const isRoom = bookingType === "room" || (hay.includes("room") && !hay.includes("event"));
      navigate(
        isRoom
          ? `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`
          : `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`,
      );
      return true;
    },
    [navigate, reservations],
  );

  const onNotificationItemClick = useNotificationRedirect("frontdesk", {
    customHandler: applyNotificationBookingNavigation,
  });

  const loadReservationsFromApi = useCallback(async () => {
    setReservationsLoad(true);
    setReservationsErr("");
    if (!getStoredAuthToken()) {
      setWalkinVenueCatalog([]);
      setWalkinBookingsRaw([]);
      setReservations((prev) => {
        const walkins = prev.filter((r) => r._walkin);
        return [...INITIAL_RESERVATIONS, ...walkins];
      });
      setReservationsLoad(false);
      return;
    }
    try {
      const [list, venues] = await Promise.all([
        fetchBookingsBackend(),
        fetchEventVenuesBackend().catch(() => []),
      ]);
      const venuesArr = Array.isArray(venues) ? venues : [];
      setWalkinVenueCatalog(venuesArr);
      setWalkinBookingsRaw(Array.isArray(list) ? list : []);
      const vmap = buildEventVenueIdToEventNumMap(venuesArr);
      const vname = buildEventVenueIdToNameMap(venuesArr);
      venueMapRef.current = vmap;
      venueNameMapRef.current = vname;
      const eventBookings = Array.isArray(list) ? list.filter((b) => b.type === "event") : [];
      const apiRows = eventBookings.map((b) => mapApiEventBookingToRow(b, vmap, vname));
      setReservations((prev) => {
        const walkins = prev.filter((r) => r._walkin);
        return [...apiRows, ...walkins];
      });
    } catch (e) {
      setReservationsErr(e.message || "Could not load reservations.");
    } finally {
      setReservationsLoad(false);
    }
  }, []);

  useEffect(() => {
    loadReservationsFromApi();
  }, [loadReservationsFromApi]);

  useEffect(() => {
    if (!walkinOpen) return undefined;
    if (!getStoredAuthToken()) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchBookingsBackend().catch(() => []);
        if (!cancelled) setWalkinBookingsRaw(Array.isArray(list) ? list : []);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walkinOpen]);

  useEffect(() => {
    const onToken = () => loadReservationsFromApi();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadReservationsFromApi]);

  const showToast = (msg, type) => setToast({ visible: true, msg, type });

  function mongoIdFromRow(row) {
    const raw = String(row?._bookingId ?? row?.refnum ?? "").trim();
    return /^[a-f0-9]{24}$/i.test(raw) ? raw : "";
  }

  useEffect(() => {
    const bookingId = new URLSearchParams(location.search).get("bookingId");
    if (!bookingId) return;
    const row = reservations.find((r) => mongoIdFromRow(r) === String(bookingId).trim());
    if (!row) return;
    setTab("reservation");
    setCurrentId(row.id);
    setDetailsRow(row);
    setDetailsOpen(true);
    setRejectOpen(false);
    setApproveConfirm(false);
    navigate("/frontdesk-events", { replace: true });
  }, [location.search, navigate, reservations]);

  const handleApprove = async () => {
    const row = detailsRow;
    if (!row) {
      window.alert("No reservation selected. Close and open Review again.");
      setApproveConfirm(false);
      return;
    }
    const bookingId = mongoIdFromRow(row);
    if (bookingId) {
      try {
        await approveBookingBackend(bookingId);
        setApproveConfirm(false);
        setDetailsOpen(false);
        setDetailsRow(null);
        showToast("Reservation Approved!", "approved");
        dispatchHousekeepingTasksRefresh();
        dispatchHousekeepingInboxRefresh();
        dispatchGuestBookingsRefreshPing();
        await loadReservationsFromApi();
        await loadPending();
      } catch (e) {
        const msg = e.message || "Approve failed";
        if (e?.status === 409 || /only pending/i.test(msg)) {
          window.alert("This reservation is no longer pending. Refreshing the list.");
          await loadReservationsFromApi();
          await loadPending();
          setDetailsOpen(false);
          setDetailsRow(null);
        } else {
          window.alert(msg);
          showToast(msg, "rejected");
        }
        setApproveConfirm(false);
      }
      return;
    }
    setReservations((prev) => prev.map((r) => String(r.id) === String(row.id) ? { ...r, status: "approved" } : r));
    setApproveConfirm(false);
    setDetailsOpen(false);
    setDetailsRow(null);
    showToast("Reservation Approved!", "approved");
    window.alert(
      "This approval was saved only in the browser (sample data or no server booking id). It was NOT sent to the API, so housekeeping will not see a cleaning task.\n\n" +
        "Log in with frontdesk@abela.demo (API) and approve a booking that exists in MongoDB.",
    );
  };

  const handleReject = async (reason) => {
    const row = detailsRow;
    if (!row) {
      window.alert("No reservation selected.");
      setRejectOpen(false);
      return;
    }
    const bookingId = mongoIdFromRow(row);
    if (bookingId) {
      try {
        await rejectBookingBackend(bookingId, reason != null && String(reason).trim() ? String(reason).trim() : undefined);
        setRejectOpen(false);
        setDetailsOpen(false);
        setDetailsRow(null);
        showToast("Reservation Rejected!", "rejected");
        dispatchGuestBookingsRefreshPing();
        await loadReservationsFromApi();
        await loadPending();
      } catch (e) {
        const msg = e.message || "Reject failed";
        if (e?.status === 409 || /only pending/i.test(msg)) {
          window.alert("This reservation is no longer pending. Refreshing the list.");
          await loadReservationsFromApi();
          await loadPending();
          setDetailsOpen(false);
          setDetailsRow(null);
        } else {
          window.alert(msg);
          showToast(msg, "rejected");
        }
        setRejectOpen(false);
      }
      return;
    }
    setReservations((prev) => prev.map((r) => String(r.id) === String(row.id) ? { ...r, status: "rejected" } : r));
    setRejectOpen(false);
    setDetailsOpen(false);
    setDetailsRow(null);
    showToast("Reservation Rejected!", "rejected");
  };

  const handleEditSave = (updated) => {
    setReservations((prev) => prev.map((r) => (String(r.id) === String(updated.id) ? updated : r)));
    setEditOpen(false);
    setDetailsRow(updated);
    setDetailsOpen(true);
  };

  const handleCheckin = async () => {
    if (!checkRow) return;
    const key = eventRowMatchKey(checkRow);
    const bookingId = mongoIdFromRow(checkRow);
    setCheckinConfirm(false);

    if (bookingId) {
      try {
        await patchBookingBackend(bookingId, { status: "occupied" });
        dispatchGuestBookingsRefreshPing();
        await loadReservationsFromApi();
      } catch (e) {
        window.alert(e?.message || "Check-in failed.");
        return;
      }
    } else {
      setReservations((prev) =>
        prev.map((r) => (eventRowMatchKey(r) === key ? { ...r, status: "occupied" } : r)),
      );
    }
    setCheckRow(null);
    showToast("Guest Checked In!", "approved");
  };

  const handleCheckout = async () => {
    if (!checkRow) return;
    const key = eventRowMatchKey(checkRow);
    const bookingId = mongoIdFromRow(checkRow);
    if (bookingId) {
      try {
        await patchBookingBackend(bookingId, { status: "completed" });
        dispatchGuestBookingsRefreshPing();
        await loadReservationsFromApi();
      } catch (e) {
        window.alert(e?.message || "Checkout failed.");
        return;
      }
    } else {
      setReservations((prev) =>
        prev.map((r) => (eventRowMatchKey(r) === key ? { ...r, status: "checked-out" } : r)),
      );
    }
    staffTopbarRef.current?.hideMenusOnly?.();
    setCheckoutConfirm(false);
    setAddChargesOpen(false);
    setCheckRow(null);
    navigate("/frontdesk-events", { replace: true });
    showToast("Guest checked out. You are still on Events — open Reservation History anytime to view past stays.", "approved");
  };

  function mergeGuestModalFromRow(row) {
    if (!row) return null;
    return {
      ...row,
      guest: row.customer,
      date: row.checkin,
      venueno: String(row.venueNo ?? row.number ?? "—"),
      downpaymentAmt: row.downpayment,
    };
  }

  const handleAddItem = async (items) => {
    if (!checkRow) return;
    const key = eventRowMatchKey(checkRow);
    const r = reservations.find((x) => eventRowMatchKey(x) === key);
    if (!r) {
      setAddChargesOpen(false);
      return;
    }
    const extra = items.reduce((s, c) => s + (Number(c.amount) || 0), 0);
    if (extra <= 0) {
      setAddChargesOpen(false);
      return;
    }

    const totalWas = parsePesoNum(r.total);
    const downWas = parsePesoNum(r.downpayment);
    const t0 = Number.isFinite(totalWas) ? totalWas : 0;
    const d0 = Number.isFinite(downWas) ? downWas : 0;
    const newTotal = t0 + extra;
    const newBal = Math.max(0, newTotal - d0);
    const chargeLine = formatEventChargeLinesForAdditionalRequests(items);
    const prevReq = String(r.addreq || "").trim();
    const addreqMerged = [prevReq && prevReq !== "N/A" ? prevReq : "", chargeLine]
      .filter(Boolean)
      .join("; ");

    const bookingId = mongoIdFromRow(r);
    setAddChargesOpen(false);

    if (bookingId) {
      try {
        const patchBody = {
          totalAmount: String(newTotal),
          additionalRequests: addreqMerged || prevReq,
        };
        if (String(r.type || "").toLowerCase() === "event") {
          patchBody.venuePrice = String(newTotal);
        }
        const fresh = await patchBookingBackend(bookingId, patchBody);
        const updatedRow = mapApiEventBookingToRow(fresh, venueMapRef.current, venueNameMapRef.current);
        setReservations((prev) => prev.map((x) => (eventRowMatchKey(x) === bookingId ? updatedRow : x)));
        setCheckRow(mergeGuestModalFromRow(updatedRow));
        dispatchGuestBookingsRefreshPing();
        showToast("Charges saved to booking.", "approved");
      } catch (e) {
        window.alert(e?.message || "Could not save charges to the server.");
      }
      return;
    }

    const localRow = {
      ...r,
      total: fmtPeso(newTotal),
      balance: fmtPeso(newBal),
      price: fmtPeso(newTotal),
      addreq: addreqMerged || r.addreq,
    };
    setReservations((prev) => prev.map((x) => (eventRowMatchKey(x) === key ? localRow : x)));
    setCheckRow(mergeGuestModalFromRow(localRow));
    showToast("Charges updated (demo — not saved to API).", "approved");
  };

  const handleWalkinBookingSaved = useCallback(async () => {
    dispatchGuestBookingsRefreshPing();
    dispatchHousekeepingTasksRefresh();
    dispatchHousekeepingInboxRefresh();
    dispatchFrontdeskNotificationsRefresh();
    await loadReservationsFromApi();
    setTab("reservation");
  }, [loadReservationsFromApi, setTab]);

  const handleWalkinSubmit = (data) => {
    const newId = reservations.length + 1;
    setReservations((prev) => [...prev, { ...data, id: newId, number: String(newId), _walkin: true }]);
    setWalkinOpen(false);
    setTab("reservation");
  };

  const doGuestUpdate = () => {
    if (!pendingGuestEdit) return;
    const key = eventRowMatchKey(pendingGuestEdit);
    const guest = String(pendingGuestEdit.guest ?? "").trim();
    const venueno = String(pendingGuestEdit.venueno ?? pendingGuestEdit.venueNo ?? "").trim();
    const eventDate = String(pendingGuestEdit.date ?? pendingGuestEdit.checkin ?? "").trim();
    setReservations((rs) =>
      rs.map((r) => {
        if (eventRowMatchKey(r) !== key) return r;
        const num = venueno || String(r.venueNo ?? r.number ?? "").trim();
        return {
          ...r,
          customer: guest || r.customer,
          venueNo: num || r.venueNo,
          number: num || r.number,
          checkin: eventDate || r.checkin,
          timeslot: pendingGuestEdit.timeslot ?? r.timeslot,
          addguest: String(pendingGuestEdit.addguest ?? r.addguest),
          paymethod: pendingGuestEdit.paymethod ?? r.paymethod,
          addreq:
            pendingGuestEdit.addreq != null && String(pendingGuestEdit.addreq).trim() !== ""
              ? pendingGuestEdit.addreq
              : r.addreq,
        };
      }),
    );
    setGuestUpdateConfirm(false);
    setGuestEditRow(null);
    setGuestViewRow(null);
    setPendingGuestEdit(null);
    setGuestSuccess(true);
    setTimeout(() => setGuestSuccess(false), 2000);
  };

  const reservationMonitorRows = useMemo(
    () =>
      reservations.filter((r) => {
        const api = String(r._apiStatus || "").toLowerCase();
        const st = String(r.status || "").toLowerCase();
        if (api === "completed" || st === "completed") return false;
        return true;
      }),
    [reservations],
  );

  const filteredResAfterStatus = useMemo(() => {
    if (reservationStatusFilter === "all") return reservationMonitorRows;
    return reservationMonitorRows.filter((r) => eventReservationFilterBucket(r) === reservationStatusFilter);
  }, [reservationMonitorRows, reservationStatusFilter]);

  const filteredRes = useMemo(() => {
    const q = search.toLowerCase();
    return filteredResAfterStatus.filter((r) => {
      if (!q) return true;
      return [
        r.number,
        r.type,
        r.customer,
        r.package,
        r.status,
        r.email,
        r.contact,
        r.refnum,
        r.checkin,
        r.timeslot,
        r._bookingId,
        r.venueName,
      ].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [filteredResAfterStatus, search]);

  const filteredGuestRows = useMemo(() => {
    const q = search.toLowerCase();
    return guestRows.filter((g) =>
      [g.guest, g.customer, g.package, String(g.number), g.venueNo, g.venueno, g.venueName, g.refnum, g.email, g.checkin, g.timeslot].some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [guestRows, search]);

  const eventsActiveFiltered = tab === "reservation" ? filteredRes : filteredGuestRows;
  const eventsPageSizeSafe = Math.min(100, Math.max(5, Number(eventsTablePageSize) || 10));
  const eventsTotalPages = Math.max(1, Math.ceil(eventsActiveFiltered.length / eventsPageSizeSafe));
  const eventsPageSafe = Math.min(Math.max(1, eventsTablePage), eventsTotalPages);

  const eventsPagedRows = useMemo(() => {
    const start = (eventsPageSafe - 1) * eventsPageSizeSafe;
    return eventsActiveFiltered.slice(start, start + eventsPageSizeSafe);
  }, [eventsActiveFiltered, eventsPageSafe, eventsPageSizeSafe]);

  useEffect(() => {
    setEventsTablePage(1);
  }, [search, tab, reservationStatusFilter]);

  useEffect(() => {
    setEventsTablePage((p) => Math.min(Math.max(1, p), eventsTotalPages));
  }, [eventsTotalPages]);

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout rooms-page events-page frontdesk-app"
        mainStyle={mainStyle}
        sidebar={<Sidebar />}
      >
        <Toast toast={toast} onHide={() => setToast((t) => ({ ...t, visible: false }))} />

        {/* TOP BAR */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Events</span>
          </div>
          <StaffTopbarActions
            ref={staffTopbarRef}
            roleKey="frontdesk"
            notifications={displayNotifications}
            dot={pendingCount > 0 ? "active" : null}
            dotTitle="Pending or unread alerts"
            onNotificationsPanelOpen={() => void markStaffNotificationsSeen()}
            onNotificationItemClick={onNotificationItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* PAGE CONTENT */}
        <main className="content">
          <div className="page-heading">
            <h1 className="page-title">Reservation Request & Management</h1>
            <p className="page-sub">Review, approve, and manage customer reservations</p>
          </div>

          <div className="rooms-res-toolbar">
            <div className="rooms-tab-bar">
              <button
                type="button"
                className={`rooms-tab-btn${tab === "reservation" ? " active" : ""}`}
                onClick={() => {
                  setTab("reservation");
                  setSearch("");
                }}
              >
                Reservation
              </button>
              <button
                type="button"
                className={`rooms-tab-btn${tab === "guest" ? " active" : ""}`}
                onClick={() => {
                  setTab("guest");
                  setSearch("");
                }}
              >
                Approved Bookings
              </button>
            </div>
            <button type="button" className="rooms-walkin-btn" onClick={() => setWalkinOpen(true)}>
              <PlusUserIcon /> Walk-in Reservation
            </button>
          </div>

          <div className="rooms-search-wrap">
            <SearchIcon />
            <input
              type="text"
              className="rooms-search-input"
              placeholder="Search reservations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {tab === "reservation" && (
            <div className="rooms-status-filter" role="group" aria-label="Filter by reservation status">
              {[
                { id: "all", label: "All" },
                { id: "pending", label: "Pending" },
                { id: "approved", label: "Approved" },
                { id: "rejected", label: "Rejected" },
                { id: "occupied", label: "Occupied" },
                { id: "cancelled", label: "Cancelled Booking" },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`rooms-status-filter-btn${reservationStatusFilter === id ? " active" : ""}`}
                  onClick={() => setReservationStatusFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {tab === "reservation" && !getStoredAuthToken() && (
            <div
              style={{
                margin: "8px 0 0",
                padding: "0.75rem 1rem",
                background: "#fff8e6",
                border: "1px solid #e8d4a8",
                borderRadius: 8,
                fontSize: 14,
                color: "#5c4a30",
                lineHeight: 1.45,
              }}
            >
              <strong>No API session.</strong> You are seeing sample rows. Log in at <strong>/login</strong> with{" "}
              <code style={{ fontSize: 13 }}>frontdesk@abela.demo</code> / <code style={{ fontSize: 13 }}>12345678</code>{" "}
              (run <code style={{ fontSize: 13 }}>npm run seed-demo</code> in <code style={{ fontSize: 13 }}>be/abela-be</code> first).
            </div>
          )}

          {tab === "reservation" && reservationsLoad && (
            <p style={{ margin: "8px 0 0", color: "#9a8060", fontSize: 14 }}>Loading reservations…</p>
          )}
          {tab === "reservation" && reservationsErr && (
            <div style={{ margin: "8px 0 0", color: "#c0392b", fontSize: 14, background: reservationsErr.includes("Not signed") ? "#fdecea" : "transparent", padding: reservationsErr.includes("Not signed") ? "0.75rem 1rem" : 0, borderRadius: 8 }}>
              {reservationsErr.includes("Not signed") ? (
                <>
                  <strong>No API token.</strong> Log in at <strong>/login</strong> with front desk staff (e.g. run <code style={{ fontSize: 13 }}>npm run seed-demo</code> in <code style={{ fontSize: 13 }}>be/abela-be</code>, then <code style={{ fontSize: 13 }}>frontdesk@abela.demo</code> / <code style={{ fontSize: 13 }}>12345678</code>).
                </>
              ) : (
                reservationsErr
              )}
            </div>
          )}

          {/* RESERVATION TABLE — same grid / money alignment / cancelled badge as frontdesk-rooms */}
          {tab === "reservation" && (
            <div className="rooms-table-scroll-wrap">
              <table className="rooms-table rooms-table--frontdesk-reservation">
                <colgroup>
                  <col className="rooms-col-fdr-num" />
                  <col className="rooms-col-fdr-type" />
                  <col className="rooms-col-fdr-customer" />
                  <col className="rooms-col-fdr-package" />
                  <col className="rooms-col-fdr-amount" />
                  <col className="rooms-col-fdr-amount" />
                  <col className="rooms-col-fdr-amount" />
                  <col className="rooms-col-fdr-status" />
                </colgroup>
                <thead>
                  <tr>
                    <th className="rooms-th-nowrap">Number</th>
                    <th>Type</th>
                    <th className="rooms-th-customer">Customer</th>
                    <th className="rooms-th-package">Package</th>
                    <th className="rooms-th-num">
                      <span className="rooms-money-align">Total</span>
                    </th>
                    <th className="rooms-th-num">
                      <span className="rooms-money-align">Down payment</span>
                    </th>
                    <th className="rooms-th-num" title="Total balance">
                      <span className="rooms-money-align">Balance</span>
                    </th>
                    <th className="rooms-th-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRes.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>
                        No reservations found.
                      </td>
                    </tr>
                  ) : (
                  eventsPagedRows.map((r) => (
                    <tr
                      key={String(r.id)}
                      className="admin-clickable-row"
                      tabIndex={0}
                      role="button"
                      aria-label={`Review reservation for ${String(r.customer ?? "").trim() || "guest"}`}
                      onClick={(e) =>
                        handleAdminRowActivate(e, () => {
                          setDetailsRow(r);
                          setCurrentId(r.id);
                          setDetailsOpen(true);
                        })
                      }
                      onKeyDown={(e) =>
                        handleAdminRowKeyDown(e, () => {
                          setDetailsRow(r);
                          setCurrentId(r.id);
                          setDetailsOpen(true);
                        })
                      }
                    >
                      <td className="rooms-td-nowrap">{formatStoredEventNumberForDisplay(r.number ?? r.refnum ?? r.id)}</td>
                      <td>{r.type}</td>
                      <td className="rooms-td-customer" title={String(r.customer ?? "")}>{r.customer}</td>
                      <td className="rooms-td-package" title={String(r.package ?? "")}>{r.package}</td>
                      <td className="rooms-td-num">
                        <span className="rooms-money-align">{r.total}</span>
                      </td>
                      <td className="rooms-td-num">
                        <span className="rooms-money-align">{r.downpayment}</span>
                      </td>
                      <td className="rooms-td-num">
                        <span className="rooms-money-align">{r.balance}</span>
                      </td>
                      <td className="rooms-td-status"><ReservationBadge status={r.status} /></td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* GUEST — column layout aligned with frontdesk-rooms Reserved Guest */}
          {tab === "guest" && (
            <div className="rooms-table-scroll-wrap">
              <table className="rooms-table rooms-table--guest">
                <thead>
                  <tr>
                    <th className="rooms-th-customer">Guest name</th>
                    <th>Package</th>
                    <th className="rooms-th-num">Total</th>
                    <th className="rooms-th-num">Downpayment</th>
                    <th className="rooms-th-num">Total Balance</th>
                    <th className="rooms-th-status">Status</th>
                    <th className="rooms-th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuestRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>
                        No confirmed reservations right now.
                      </td>
                    </tr>
                  ) : eventsPagedRows.map((g) => {
                    const isOccupied = String(g.status || "").toLowerCase() === "occupied";
                    return (
                      <tr
                        key={eventRowMatchKey(g)}
                        className="admin-clickable-row"
                        tabIndex={0}
                        role="button"
                        aria-label={`View guest details for ${String(g.customer || g.guest || "").trim() || "guest"}`}
                        onClick={(e) => handleAdminRowActivate(e, () => setGuestViewRow(g))}
                        onKeyDown={(e) => handleAdminRowKeyDown(e, () => setGuestViewRow(g))}
                      >
                        <td className="rooms-td-customer" title={String(g.customer || g.guest || "").trim()}>
                          {String(g.customer || g.guest || "").trim() || "—"}
                        </td>
                        <td>{packageLabelForReservedGuestRow(g.package, g.status)}</td>
                        <td className="rooms-td-num">{g.total}</td>
                        <td className="rooms-td-num">{g.downpayment}</td>
                        <td className="rooms-td-num">{g.balance}</td>
                        <td className="rooms-td-status"><ReservationBadge status={g.status} /></td>
                        <td className="rooms-td-action">
                          <div className="rooms-action-cell rooms-action-cell--trailing">
                            <div className="rooms-action-lead rooms-action-lead--checkin">
                              {isOccupied ? (
                                <button
                                  type="button"
                                  className="rooms-action-btn rooms-action-btn--primary-slot rooms-checkout-action-btn"
                                  onClick={() => setCheckRow(g)}
                                >
                                  Check Out
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="rooms-action-btn rooms-action-btn--primary-slot rooms-review-btn"
                                  onClick={() => setCheckRow(g)}
                                >
                                  Check In
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {eventsActiveFiltered.length > 0 ? (
          <div
            className="rooms-pagination-row rooms-pagination-row--below-table"
            role="navigation"
            aria-label={tab === "reservation" ? "Event reservation table pages" : "Approved bookings table pages"}
          >
            <div className="rooms-pagination-meta">
              <span className="rooms-pagination-info">
                Showing{" "}
                <strong>
                  {eventsActiveFiltered.length === 0 ? 0 : (eventsPageSafe - 1) * eventsPageSizeSafe + 1}
                </strong>
                –
                <strong>{Math.min(eventsPageSafe * eventsPageSizeSafe, eventsActiveFiltered.length)}</strong> of{" "}
                <strong>{eventsActiveFiltered.length}</strong>
                {tab === "reservation" ? " reservations" : " approved bookings"}
              </span>
              <label className="rooms-pagination-per">
                <span>Rows per page</span>
                <select
                  className="rooms-pagination-select"
                  value={eventsPageSizeSafe}
                  onChange={(e) => {
                    setEventsTablePageSize(Number(e.target.value));
                    setEventsTablePage(1);
                  }}
                >
                  {[5, 10, 15, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="rooms-pagination-btns">
              <button
                type="button"
                className="rooms-pg-btn"
                disabled={eventsPageSafe <= 1}
                onClick={() =>
                  setEventsTablePage((p) => {
                    const cur = Math.min(Math.max(1, p), eventsTotalPages);
                    return Math.max(1, cur - 1);
                  })
                }
              >
                Prev
              </button>
              {visibleClientPageNumbers(eventsPageSafe, eventsTotalPages).map((pNum, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev != null && pNum - prev > 1;
                return (
                  <span key={pNum} className="rooms-pg-num-wrap">
                    {showEllipsis ? (
                      <span className="rooms-pg-ellipsis" aria-hidden>
                        …
                      </span>
                    ) : null}
                    <button
                      type="button"
                      className={`rooms-pg-num${pNum === eventsPageSafe ? " rooms-pg-num--active" : ""}`}
                      aria-label={`Page ${pNum}`}
                      {...(pNum === eventsPageSafe ? { "aria-current": "page" } : {})}
                      onClick={() => setEventsTablePage(pNum)}
                    >
                      {pNum}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                className="rooms-pg-btn"
                disabled={eventsPageSafe >= eventsTotalPages}
                onClick={() =>
                  setEventsTablePage((p) => {
                    const cur = Math.min(Math.max(1, p), eventsTotalPages);
                    return Math.min(eventsTotalPages, cur + 1);
                  })
                }
              >
                Next
              </button>
            </div>
          </div>
          ) : null}
        </main>
      </RailPortalShell>

      {/* ── MODALS ── */}
      <DetailsModal
        r={detailsRow}
        open={detailsOpen}
        onClose={() => {
          setDetailsOpen(false);
          setDetailsRow(null);
        }}
        onApprove={() => setApproveConfirm(true)}
        onReject={() => setRejectOpen(true)}
        onEdit={() => {
          setDetailsOpen(false);
          setDetailsRow(null);
          setEditOpen(true);
        }}
      />

      <ConfirmDialog
        open={approveConfirm}
        tone="approve"
        headline="Confirm approval"
        layout="booking"
        text={APPROVE_EVENT_BOOKING_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setApproveConfirm(false)}
        onConfirm={handleApprove}
        confirmLabel="Approve"
      />

      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onSubmit={handleReject} />

      {editOpen && (
        <EditModal
          r={curRes}
          open={editOpen}
          onClose={() => {
            setEditOpen(false);
            const row = reservations.find((x) => String(x.id) === String(currentId));
            if (row) {
              setDetailsRow(row);
              setDetailsOpen(true);
            }
          }}
          onSave={handleEditSave}
          onCancel={() => {
            setEditOpen(false);
            const row = reservations.find((x) => String(x.id) === String(currentId));
            if (row) {
              setDetailsRow(row);
              setDetailsOpen(true);
            }
          }}
        />
      )}

      <CheckModal
        open={!!checkRow}
        row={checkRow ? mergeGuestModalFromRow(checkRow) : null}
        onClose={() => setCheckRow(null)}
        onCheckin={() => setCheckinConfirm(true)}
        onCheckout={() => setCheckoutConfirm(true)}
        onAddCharges={() => setAddChargesOpen(true)}
      />

      <GuestViewModal
        open={!!guestViewRow}
        row={guestViewRow ? mergeGuestModalFromRow(guestViewRow) : null}
        onClose={() => setGuestViewRow(null)}
        onEdit={() => {
          setGuestEditRow(guestViewRow);
        }}
      />

      <GuestEditModal
        open={!!guestEditRow}
        row={guestEditRow}
        onClose={() => setGuestEditRow(null)}
        onSave={(form) => {
          setPendingGuestEdit(form);
          setGuestUpdateConfirm(true);
        }}
      />

      <ConfirmDialog
        open={guestUpdateConfirm}
        text="Update Reservation?"
        onCancel={() => setGuestUpdateConfirm(false)}
        onConfirm={doGuestUpdate}
        confirmLabel="Update"
      />
      <SuccessDialog open={guestSuccess} onClose={() => setGuestSuccess(false)} />

      <ConfirmDialog
        open={checkinConfirm}
        tone="approve"
        headline="Confirm check-in"
        layout="booking"
        text={CHECKIN_EVENT_BOOKING_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setCheckinConfirm(false)}
        onConfirm={handleCheckin}
        confirmLabel="Check in"
      />
      <ConfirmDialog
        open={checkoutConfirm}
        tone="reject"
        headline="Confirm check-out"
        layout="booking"
        text={CHECKOUT_EVENT_BOOKING_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setCheckoutConfirm(false)}
        onConfirm={handleCheckout}
        confirmLabel="Check out"
      />

      <AddChargesModal
        open={addChargesOpen}
        onClose={() => setAddChargesOpen(false)}
        onAddItem={handleAddItem}
        currentTotalBalanceStr={addChargesBillingSnapshot?.balanceDue ?? "—"}
        currentStayTotalStr={addChargesBillingSnapshot?.stayTotal ?? "—"}
        currentPaymentsStr={addChargesBillingSnapshot?.payments ?? "—"}
      />

      <WalkinModal
        open={walkinOpen}
        onClose={() => setWalkinOpen(false)}
        onSubmit={handleWalkinSubmit}
        onBookingCreated={handleWalkinBookingSaved}
        venuesCatalog={walkinVenueCatalog}
        eventBookingsRaw={walkinBookingsRaw}
        listLoading={reservationsLoad}
      />

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

export default EventReservation;