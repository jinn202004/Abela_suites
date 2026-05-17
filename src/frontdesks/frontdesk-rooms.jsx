import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { useLazyBookingIdPhoto } from "./useLazyBookingIdPhoto";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { StaffNotificationDetailModal, useStaffNotificationDetail } from "./StaffNotificationDetailModal";
import { getFrontdeskNotificationBookingPath } from "./staffNotificationUtils";
import {
  fetchBookingsBackend,
  fetchBookingByIdBackend,
  createBookingBackend,
  fetchRoomsCatalog,
  fetchRoomAvailabilityWindow,
  approveBookingBackend,
  rejectBookingBackend,
  dispatchHousekeepingTasksRefresh,
  dispatchHousekeepingInboxRefresh,
  dispatchGuestBookingsRefreshPing,
  dispatchFrontdeskNotificationsRefresh,
  patchBookingBackend,
  GUEST_BOOKINGS_STORAGE_PING_KEY,
} from "../api/guestApi";
import { ReservationProofPreview } from "../components/ReservationProofPreview";
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
  buildRoomIdToNumberMap,
  formatRoomPackageWithNumber,
  formatRoomTableNumber,
  formatStoredRoomNumberForDisplay,
  packageLabelForReservedGuestRow,
} from "../guests/bookingRoomDisplay";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { isRoomAvailableForDates, roomBookedRangesFromBookings } from "../guests/guestAvailability";
import { DayPicker, labelDayButton as defaultLabelDayButton } from "react-day-picker";
import "react-day-picker/style.css";
import "./dashboard.css";
import {
  parseLocalYmd,
  formatLocalYmd,
  formatLocalTodayYmd,
  countStayNights,
  blockedCheckInSetFromRanges,
  splitGuestStayNightsByTone,
  addLocalDays,
} from "../guests/roomStayDates";
import {
  computeRoomBookingBill,
  paymentSnapshotFromBill,
  formatPeso,
} from "../guests/bookingBilling";
import BillingSummary from "../guests/BillingSummary";
import BillingPaymentPills from "../guests/BillingPaymentPills";
import "../guests/billing-summary.css";
import { fetchRoomBookedRangesMerged } from "../guests/roomBookingOccupancy";
import "../guests/idUploadedCard.css";
import "./frontdesk-rooms.css";
import "./walkin-room-booking-parity.css";

/** Files in `public/` — served at `/…` (see `fe/abela-fe/public/`). */
const IMAGES = {
  sidebarLogo: "/logo.png",
  gcashCard: "/Gcash.png",
  gcashPaymentQr: "/QR.png",
  guestId: "/id.png",
};

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

// ─── SVG ICONS ───────────────────────────────────────────────
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const RoomsIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
  </svg>
);
const EventsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
    <path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/>
    <path d="M15 2h.01"/><path d="M22 20h.01"/>
    <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
    <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
    <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
    <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>
  </svg>
);
const HouseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
    <path d="M9 22V12h6v10"/>
  </svg>
);
const BillsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const SearchIcon = () => (
  <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PlusUserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="2.5" width="20" height="20">
    <circle cx="12" cy="12" r="10"/><polyline points="9 12 11 14 15 10"/>
  </svg>
);
// ─── SAMPLE DATA (guest tab = same rows, filtered to non-pending) ────────────
const initialReservations = [
  { id: 1, number: "1", type: "Room", customer: "Jimie Macarulay", package: formatRoomPackageWithNumber("1", "Single Suites"), total: "₱924", downpayment: "₱247", balance: "₱677", status: "pending", roomno: "RM01", price: "₱924", email: "jimie@email.com", contact: "09170000001", checkin: "2026-04-10", checkout: "2026-04-11", addguest: "0", paid: "₱247", refnum: "REF-20260001", amountpaid: "₱247", paydate: "2026-04-08", transid: "TXN-101", addreq: "N/A", paymethod: "GCash" },
  { id: 2, number: "2", type: "Room", customer: "Raven Cruz", package: formatRoomPackageWithNumber("2", "Single Suites"), total: "₱1,148", downpayment: "₱303", balance: "₱845", status: "pending", roomno: "RM02", price: "₱1,148", email: "raven@email.com", contact: "09170000002", checkin: "2026-04-12", checkout: "2026-04-13", addguest: "0", paid: "₱303", refnum: "REF-20260002", amountpaid: "₱303", paydate: "2026-04-09", transid: "TXN-102", addreq: "N/A", paymethod: "Cash" },
  { id: 3, number: "3", type: "Room", customer: "Jimie Macarulay", package: formatRoomPackageWithNumber("3", "Single Suites"), total: "₱924", downpayment: "₱576", balance: "₱247", status: "approved", roomno: "RM03", price: "₱924", email: "jimie@email.com", contact: "09170000001", checkin: "2026-04-14", checkout: "2026-04-15", addguest: "1", paid: "₱576", refnum: "REF-20260003", amountpaid: "₱576", paydate: "2026-04-10", transid: "TXN-103", addreq: "N/A", paymethod: "GCash" },
  { id: 4, number: "RM05", type: "Room", customer: "Carlos Manalo", package: formatRoomPackageWithNumber("RM05", "Executive Suite"), total: "₱2,940", downpayment: "₱1,470", balance: "₱1,470", status: "occupied", roomno: "RM05", price: "₱2,940", email: "carlos@email.com", contact: "09170000004", checkin: "2026-04-05", checkout: "2026-04-07", addguest: "1", paid: "₱1,470", refnum: "REF-20260004", amountpaid: "₱1,470", paydate: "2026-04-04", transid: "TXN-104", addreq: "Late checkout", paymethod: "GCash" },
  { id: 5, number: "RM01", type: "Room", customer: "Liza Fernandez", package: formatRoomPackageWithNumber("RM01", "Single Suites"), total: "₱824", downpayment: "₱412", balance: "₱0", status: "checked-out", roomno: "RM01", price: "₱824", email: "liza@email.com", contact: "09170000005", checkin: "2026-04-01", checkout: "2026-04-03", addguest: "0", paid: "₱412", refnum: "REF-20260005", amountpaid: "₱412", paydate: "2026-03-31", transid: "TXN-105", addreq: "None", paymethod: "Cash" },
  {
    id: 6,
    number: "RM-099",
    type: "Room",
    customer: "Sample Cancelled",
    package: formatRoomPackageWithNumber("RM-099", "Twin Bed"),
    total: "₱1,148",
    downpayment: "₱300",
    balance: "₱848",
    status: "cancelledBooking",
    roomno: "RM-099",
    price: "₱1,148",
    email: "cancelled@email.com",
    contact: "09170000006",
    checkin: "2026-06-01",
    checkout: "2026-06-03",
    addguest: "0",
    paid: "₱300",
    refnum: "REF-DEMO-CXL",
    amountpaid: "₱300",
    paydate: "2026-05-01",
    transid: "TXN-199",
    addreq: "None",
    paymethod: "GCash",
    cancellationReason: "Change of travel plans (demo row).",
    cancelledAtLabel: "—",
  },
];

// ─── API → table row (room bookings + guest profile) ────────
function parsePesoNum(v) {
  if (v == null || v === "") return NaN;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : NaN;
}

function fmtPeso(n) {
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Charge lines appended to `additionalRequests` on the booking (qty × unit → line subtotal). */
function formatChargeLinesForAdditionalRequests(items) {
  if (!Array.isArray(items) || items.length === 0) return "";
  return items
    .map((c) => {
      const q = Math.max(1, Math.floor(Number(c.qty) || 1));
      const unit = Number(c.amount) || 0;
      const sub = unit * q;
      const name = String(c.item || "").trim() || "Item";
      if (q <= 1) return `${name} (₱${sub.toFixed(2)})`;
      return `${name} ×${q} (₱${sub.toFixed(2)})`;
    })
    .join("; ");
}

/** Paid amount counted toward this booking (never more than the stay total). */
function paymentCreditedTowardTotal(totalNum, paymentNum) {
  if (!Number.isFinite(paymentNum) || paymentNum < 0) return NaN;
  if (!Number.isFinite(totalNum) || totalNum <= 0) return paymentNum;
  return Math.min(paymentNum, totalNum);
}

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

/** Must match server: only `pending` bookings can be approved/rejected — use raw API status, not badge key. */
function isFrontdeskBookingPending(row) {
  if (!row) return false;
  if (row._fromApi) return String(row._apiStatus || "").toLowerCase() === "pending";
  return String(row.status || "").toLowerCase() === "pending";
}

/** Status bucket for reservation tab filters (incl. cancelled guest bookings, separate from staff rejected). */
function reservationFilterBucket(row) {
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
  if (st === "cancelledbooking") return "cancelled";
  if (st === "rejected") return "rejected";
  if (st === "occupied") return "occupied";
  if (st === "approved" || st === "checked-out") return "approved";
  return "other";
}

/** Normalize booking id from API JSON (string, ObjectId, or `{ $oid }`). */
function extractBookingId(b) {
  if (!b || typeof b !== "object") return "";
  const raw = b.id != null ? b.id : b._id;
  if (raw == null) return "";
  if (typeof raw === "string") return raw.trim();
  if (typeof raw === "object" && raw.$oid) return String(raw.$oid).trim();
  return String(raw).trim();
}

/** Match a reservation row when updating from guest check-in / edit (Mongo id or demo id). */
function rowMatchKey(r) {
  if (!r) return "";
  const raw = String(r._bookingId ?? r.refnum ?? "").trim();
  if (/^[a-f0-9]{24}$/i.test(raw)) return raw;
  return String(r.id ?? "");
}

/** Guest tab Check modal row shape (`guest`, `roomno`) from a reservation row. */
function mergeCheckRowFromReservationRow(r) {
  if (!r) return null;
  return {
    ...r,
    guest: r.customer,
    roomno: r.roomno != null && String(r.roomno).trim() !== "" ? r.roomno : r.number,
  };
}

/** Title part after `number ·` in formatted package, or whole string. */
function roomTitleFromPackageField(pkg) {
  const s = String(pkg || "").trim();
  const parts = s.split("·");
  if (parts.length >= 2) return parts.slice(1).join("·").trim();
  return s || "Room";
}

/** From walk-in select label e.g. "Single Suites - RM-001" or "Single Suites - RM01" */
function splitWalkinRoomSelection(roomSel) {
  if (!roomSel || typeof roomSel !== "string") return { roomno: "—", packageLabel: "" };
  const trimmed = roomSel.trim();
  const rm = trimmed.match(/\b(RM-?\d+)\b/i);
  const roomno = rm ? formatStoredRoomNumberForDisplay(rm[0]) : "—";
  const lastDash = trimmed.lastIndexOf(" - ");
  const packageLabel = lastDash >= 0 ? trimmed.slice(0, lastDash).trim() : trimmed;
  return { roomno, packageLabel: packageLabel || trimmed };
}

/** Edit modal select e.g. `Single Suites - ₱824` → API `roomTitle` + optional `totalAmount`. */
function parseEditRoomPackageSelect(option) {
  const s = String(option || "").trim();
  if (!s) return { roomTitle: "", totalAmount: "" };
  const dash = s.lastIndexOf(" - ");
  const title = dash >= 0 ? s.slice(0, dash).trim() : s;
  const pricePart = dash >= 0 ? s.slice(dash + 3).trim() : "";
  const p = pricePart.replace(/^₱\s*/i, "").replace(/,/g, "").trim();
  return { roomTitle: title || "", totalAmount: p };
}

/** First numeric run from RM / table number (for booking snapshot on check-in/out). */
function snapshotRoomNumberForBookingPatch(roomnoOrNumber) {
  const s = String(roomnoOrNumber ?? "").trim();
  if (!s || s === "—") return "";
  const m = s.match(/(\d+)/);
  return m ? m[1].replace(/^0+(?=\d)/, "") || m[1] : "";
}

function formatApiPaymentDateDisplay(isoDate) {
  const s = String(isoDate || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00`);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-PH");
  }
  return s;
}

function formatCancelledAtDisplay(iso) {
  if (iso == null || iso === "") return "—";
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
  }
  return String(iso);
}

const APPROVE_BOOKING_CONFIRM_TEXT =
  "Are you sure you want to approve this booking? Once approved, the guest will be notified and the booking status will be updated in their account.";

const REJECT_BOOKING_CONFIRM_INTRO =
  "Are you sure you want to reject this booking? Once rejected, the guest will be notified and the booking status will be updated in their account.";

const APPROVE_SUCCESS_BODY =
  "The booking has been approved. The guest has been notified and their booking status is updated in their account.";

const APPROVE_SUCCESS_BODY_DEMO =
  "This update was saved only in your browser (no server booking id). The guest was not notified. Start the API (cd be/abela-be && npm run dev) and approve a real pending booking so notifications send.";

const REJECT_SUCCESS_BODY =
  "The booking has been rejected. The guest has been notified with the reason you provided, and their booking status is updated in their account.";

const REJECT_SUCCESS_BODY_DEMO =
  "This update was saved only in your browser (no server booking id). The guest was not notified.";

const CHECKIN_BOOKING_CONFIRM_TEXT =
  "Are you sure you want to check this guest in? The reservation will show as occupied, the guest will be notified, and the room status will update for housekeeping.";

const CHECKOUT_BOOKING_CONFIRM_TEXT = "Are you sure you want to check out this guest?";

const EDIT_RESERVATION_CONFIRM_TEXT =
  "Save your changes to this reservation? Updates will replace the current details on file.";

const WALKIN_SUBMIT_CONFIRM_TEXT =
  "Submit this walk-in reservation? It will appear in the reservation list for review or follow-up.";

function mapApiRoomBookingToRow(b, roomIdToNumber) {
  const id = extractBookingId(b);
  const g = b.guest || {};
  const total = parsePesoNum(b.totalAmount);
  const downRaw = parsePesoNum(b.paymentAmount);
  const credited = paymentCreditedTowardTotal(total, downRaw);
  const bal =
    Number.isFinite(total) && Number.isFinite(credited) ? Math.max(0, total - credited) : NaN;
  const st = statusForBadgeFromApi(b.status);
  const ridMap = roomIdToNumber instanceof Map ? roomIdToNumber : new Map();
  const { roomno: rmFromTitle } = splitWalkinRoomSelection(String(b.roomTitle || ""));
  const displayRoom = formatRoomTableNumber(b, ridMap, rmFromTitle !== "—" ? rmFromTitle : undefined);
  const rawRoomTitle = String(b.roomTitle || "Room").trim() || "Room";
  const cancellationReason = String(b.cancellationReason || "").trim();
  const cancelledAtLabel = formatCancelledAtDisplay(b.cancelledAt);
  return {
    id,
    _bookingId: id,
    _fromApi: true,
    _apiStatus: String(b.status ?? "").trim().toLowerCase(),
    number: displayRoom,
    type: "Room",
    customer: bookingCustomerDisplayName(b),
    email: bookingEmailDisplay(b),
    contact: bookingPhoneDisplay(b),
    package: formatRoomPackageWithNumber(displayRoom, rawRoomTitle),
    total: fmtPeso(total),
    downpayment: fmtPeso(credited),
    balance: fmtPeso(bal),
    status: st,
    cancellationReason,
    cancelledAtLabel,
    roomno: displayRoom,
    price: fmtPeso(total),
    checkin: b.checkIn || "—",
    checkout: b.checkOut || "—",
    addguest: String(b.additionalGuests ?? 0),
    paid: fmtPeso(credited),
    refnum: id,
    amountpaid: fmtPeso(credited),
    paydate:
      b.paymentDate && String(b.paymentDate).trim()
        ? formatApiPaymentDateDisplay(b.paymentDate)
        : b.updatedAt
          ? new Date(b.updatedAt).toLocaleDateString("en-PH")
          : "",
    transid: b.transactionId || "—",
    addreq: b.additionalRequests || "N/A",
    paymethod: b.paymentMethod || "—",
    paymentProofData: "",
    validIdPhotoData: g.validIdPhotoData || "",
    declineReason: String(b.declineReason || "").trim(),
  };
}

// ─── BADGE ───────────────────────────────────────────────────
function Badge({ status }) {
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
  const cls = map[status] || "";
  const text = label[status] !== undefined ? label[status] : String(status ?? "");
  return (
    <span className={`badge ${cls}`}>
      {text}
    </span>
  );
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────
function ConfirmDialog({
  open,
  text,
  onCancel,
  onConfirm,
  isSuccess,
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  size = "sm",
  panelClassName = "confirm-box",
  /** Formal booking decisions: calmer approve seal vs rejection tone */
  tone = "caution",
  headline,
  /** `booking` — same shell as guest cancel modal: white body, cream footer, stacked actions */
  layout = "default",
  /** When `isSuccess`, optional clean layout (gold title + dark body) like “Report submitted” */
  successHeading,
  successBody,
  successOkLabel = "OK",
  /** Seal + tone when `isSuccess` (default success ✓; use `reject` for rejection confirmations) */
  successSealTone = "success",
}) {
  const effectiveTone = isSuccess ? successSealTone : tone;
  const isBookingShell = layout === "booking" && !isSuccess;
  const dismiss = onCancel ?? (() => {});
  const useCleanSuccess = Boolean(isSuccess && successHeading != null && String(successHeading).trim() !== "");

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

  const decisionInner = (
    <>
      {seal}
      {headline ? <h2 className="confirm-formal__headline">{headline}</h2> : null}
      <div className="confirm-formal__message">
        <p className="confirm-text confirm-text--multiline">{text}</p>
      </div>
    </>
  );

  const successCleanInner = (
    <>
      {seal}
      <h2 className="confirm-success__title">{String(successHeading).trim()}</h2>
      {successBody != null && String(successBody).trim() !== "" ? (
        <p className="confirm-success__body">{String(successBody).trim()}</p>
      ) : null}
    </>
  );

  const successLegacyInner = (
    <>
      {seal}
      {headline ? <h2 className="confirm-formal__headline">{headline}</h2> : null}
      <div className="confirm-formal__message">
        <p className="confirm-text confirm-text--multiline">{text}</p>
      </div>
    </>
  );

  const mainInner = isSuccess ? (useCleanSuccess ? successCleanInner : successLegacyInner) : decisionInner;

  const successFooter = isSuccess && (
    <div className="confirm-formal__footer confirm-formal__footer--success-clean">
      <button type="button" className="btn-confirm-submit btn-confirm-success-ok" onClick={dismiss}>
        {successOkLabel}
      </button>
    </div>
  );

  const actions =
    !isSuccess &&
    (
      <div className="confirm-formal__footer">
        <div className="confirm-btns">
          <button type="button" className="btn-confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={
              effectiveTone === "reject"
                ? "btn-confirm-submit btn-confirm-submit--reject"
                : "btn-confirm-submit"
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    );

  const panelExtra = [useCleanSuccess ? "confirm-box--success-clean" : "", `confirm-box--tone-${effectiveTone}`]
    .filter(Boolean)
    .join(" ");

  return (
    <Modal
      open={open}
      onClose={dismiss}
      placement="center"
      contentOnly
      shellStyle={false}
      panelClassName={[panelClassName, panelExtra].filter(Boolean).join(" ")}
      size={size}
      ariaLabel={
        useCleanSuccess
          ? String(successHeading).trim()
          : typeof text === "string"
            ? text
            : "Confirmation"
      }
    >
      <div
        className={[
          "confirm-formal",
          isBookingShell ? "confirm-formal--booking" : "",
          useCleanSuccess ? "confirm-formal--success-clean" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {isSuccess ? (
          <>
            <div
              className={
                useCleanSuccess
                  ? "confirm-formal__main confirm-formal__main--success-clean"
                  : "confirm-formal__main confirm-formal__main--success-legacy"
              }
            >
              {mainInner}
            </div>
            {successFooter}
          </>
        ) : isBookingShell ? (
          <>
            <div className="confirm-formal__main">{mainInner}</div>
            {actions}
          </>
        ) : (
          <>
            {mainInner}
            {actions}
          </>
        )}
      </div>
    </Modal>
  );
}

function frontdeskReservationRowCanEdit(r) {
  if (!r || !r._fromApi) return false;
  const api = String(r._apiStatus || "").toLowerCase();
  return api === "approved" || api === "confirmed" || api === "occupied";
}

// ─── DETAILS MODAL (Reservation) ────────────────────────────
function DetailsModal({ open, row, onClose, onApprove, onReject, onEdit }) {
  const [apiBooking, setApiBooking] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  useEffect(() => {
    if (!open || !row?._bookingId || !getStoredAuthToken()) {
      setApiBooking(null);
      setDetailBusy(false);
      return undefined;
    }
    let cancelled = false;
    setDetailBusy(true);
    setApiBooking(null);
    fetchBookingByIdBackend(row._bookingId)
      .then((b) => {
        if (!cancelled && b && String(b.id) === String(row._bookingId)) setApiBooking(b);
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
  }, [open, row?._bookingId]);

  const display = useMemo(() => {
    if (!row) return null;
    if (!apiBooking) return row;
    const paydate =
      apiBooking.paymentDate && String(apiBooking.paymentDate).trim()
        ? formatApiPaymentDateDisplay(apiBooking.paymentDate)
        : row.paydate;
    const cr =
      apiBooking.cancellationReason != null && String(apiBooking.cancellationReason).trim()
        ? String(apiBooking.cancellationReason).trim()
        : row.cancellationReason || "";
    const cat = apiBooking.cancelledAt
      ? formatCancelledAtDisplay(apiBooking.cancelledAt)
      : row.cancelledAtLabel || "—";
    const addFromApi =
      apiBooking.additionalRequests != null ? String(apiBooking.additionalRequests).trim() : "";
    const declineFromApi =
      apiBooking.declineReason != null ? String(apiBooking.declineReason).trim() : "";
    return {
      ...row,
      paymethod: apiBooking.paymentMethod || row.paymethod,
      transid: apiBooking.transactionId || row.transid,
      paydate,
      paymentProofData:
        apiBooking.paymentProofData != null && String(apiBooking.paymentProofData).trim() !== ""
          ? String(apiBooking.paymentProofData)
          : row.paymentProofData || "",
      cancellationReason: cr,
      cancelledAtLabel: cat,
      checkin: apiBooking.checkIn || row.checkin,
      checkout: apiBooking.checkOut || row.checkout,
      addguest:
        apiBooking.additionalGuests != null && apiBooking.additionalGuests !== ""
          ? String(apiBooking.additionalGuests)
          : row.addguest,
      addreq: addFromApi !== "" ? addFromApi : row.addreq,
      customer: bookingCustomerDisplayName(apiBooking) || row.customer,
      email: bookingEmailDisplay(apiBooking) || row.email,
      contact: bookingPhoneDisplay(apiBooking) || row.contact,
      declineReason: declineFromApi !== "" ? declineFromApi : row.declineReason || "",
    };
  }, [row, apiBooking]);

  const idPhotoData = useLazyBookingIdPhoto({
    open: open && !!row,
    bookingId: row?._bookingId,
    rowPhoto: row?.validIdPhotoData,
  });
  if (!row) return null;
  const r = display || row;
  const roomType = roomTitleFromPackageField(r.package);
  const idSrc =
    idPhotoData && String(idPhotoData).startsWith("data:") ? idPhotoData : IMAGES.guestId;
  const proofBooking = { paymentMethod: r.paymethod, paymentProofData: r.paymentProofData };
  const proofSrc = paymentProofFromBooking(proofBooking);
  const pmLabel = paymentMethodDisplayLabel(proofBooking);
  const payLine = derivePaymentStatusLine(
    { paymentMethod: r.paymethod, transactionId: r.transid },
    proofSrc,
  );
  const showCancellation =
    String(r.cancellationReason || "").trim() !== "" ||
    (r.cancelledAtLabel && r.cancelledAtLabel !== "—") ||
    String(r._apiStatus || "").toLowerCase() === "cancelled";
  const pendingReview = isFrontdeskBookingPending(r);
  const showDeclineReason =
    !pendingReview &&
    String(r._apiStatus || "").toLowerCase() === "rejected" &&
    String(r.declineReason || "").trim() !== "";

  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title={pendingReview ? "Review reservation" : "Reservation details"}
      size="lg"
      placement="center"
      panelClassName="fd-room-modal fd-room-details-modal rdm-shell-panel"
      bodyClassName="modal-body-scroll rdm-shell-body"
      footer={
        <div
          className={`modal-footer modal-footer-actions fd-room-details-actions${
            pendingReview ? " fd-room-details-actions--pending" : ""
          }`}
        >
          {pendingReview ? (
            <>
              <button type="button" className="btn-reject-booking" onClick={onReject}>
                Reject Booking
              </button>
              <button type="button" className="btn-approve-booking" onClick={onApprove}>
                Approve Booking
              </button>
            </>
          ) : (
            <>
              {typeof onEdit === "function" && frontdeskReservationRowCanEdit(r) ? (
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
      <div className="rdm">
        {detailBusy ? <p className="rdm-loading">Loading payment details…</p> : null}
        <div className="rdm-status-bar">
          <div className="rdm-pill rdm-pill--booking">
            <span className="rdm-pill__k">Booking status</span>
            <span className="rdm-pill__v">
              <Badge status={r.status} />
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
            <h4 className="rdm-card__title">Booking information</h4>
            <dl className="rdm-dl">
              <div>
                <dt className="rdm-dt">Room no.</dt>
                <dd className="rdm-dd">{r.roomno}</dd>
              </div>
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Room / package</dt>
                <dd className="rdm-dd">{r.package || roomType}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Quoted total</dt>
                <dd className="rdm-dd">{r.price}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Status</dt>
                <dd className="rdm-dd">
                  <Badge status={r.status} />
                </dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card">
            <h4 className="rdm-card__title">Guest information</h4>
            <dl className="rdm-dl">
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Guest</dt>
                <dd className="rdm-dd">{r.customer}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Email</dt>
                <dd className="rdm-dd rdm-dd--muted">{r.email}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Contact</dt>
                <dd className="rdm-dd">{r.contact}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Check-in</dt>
                <dd className="rdm-dd">{r.checkin}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Check-out</dt>
                <dd className="rdm-dd">{r.checkout}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Additional guests</dt>
                <dd className="rdm-dd">{r.addguest}</dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card rdm-card--span2">
            <h4 className="rdm-card__title">Billing summary</h4>
            <div className="rdm-billing">
              <div className="rdm-billing__cell">
                <div className="rdm-billing__label">Total amount</div>
                <div className="rdm-billing__value">{r.total}</div>
              </div>
              <div className="rdm-billing__cell">
                <div className="rdm-billing__label">Downpayment</div>
                <div className="rdm-billing__value">{r.downpayment}</div>
              </div>
              <div className="rdm-billing__cell">
                <div className="rdm-billing__label">Total paid</div>
                <div className="rdm-billing__value">{r.paid}</div>
              </div>
              <div className="rdm-billing__cell rdm-billing__cell--highlight">
                <div className="rdm-billing__label">Remaining balance</div>
                <div className="rdm-billing__value">{r.balance}</div>
              </div>
            </div>
          </section>
          <section className="rdm-card rdm-card--span2">
            <h4 className="rdm-card__title">Guest notes &amp; special requests</h4>
            <p className="rdm-dd rdm-dd--muted" style={{ margin: 0 }}>
              {r.addreq && String(r.addreq).trim() && String(r.addreq).trim() !== "N/A"
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
          {showCancellation ? (
            <section className="rdm-card rdm-card--span2">
              <h4 className="rdm-card__title">Cancellation</h4>
              <dl className="rdm-dl">
                <div className="rdm-dl__full">
                  <dt className="rdm-dt">Reason</dt>
                  <dd className="rdm-dd">{String(r.cancellationReason || "").trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="rdm-dt">Cancelled at</dt>
                  <dd className="rdm-dd">{r.cancelledAtLabel || "—"}</dd>
                </div>
              </dl>
            </section>
          ) : null}
          <section className="rdm-card">
            <h4 className="rdm-card__title">Payment information</h4>
            <dl className="rdm-dl">
              <div>
                <dt className="rdm-dt">Method</dt>
                <dd className="rdm-dd">{pmLabel}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Amount paid</dt>
                <dd className="rdm-dd">{r.amountpaid}</dd>
              </div>
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Transaction ID</dt>
                <dd className="rdm-dd rdm-dd--muted">{r.transid}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Payment date</dt>
                <dd className="rdm-dd">{r.paydate || "—"}</dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card">
            <h4 className="rdm-card__title">Government ID</h4>
            <div className="rdm-media-frame rdm-media-frame--tall">
              <img src={idSrc} alt="Guest ID" className="rdm-media-img" decoding="async" />
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

// ─── EDIT FORM MODAL ─────────────────────────────────────────
function EditModal({ open, row, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (row) setForm({ ...row }); }, [row]);
  if (!row) return null;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Edit room reservation"
      size="lg"
      placement="top"
      panelClassName="fd-room-modal"
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
          <div className="form-group">
            <label className="form-label">Select Room</label>
            <div className="edit-select-wrap">
              <select className="edit-input" value={form.package || ""} onChange={set("package")}>
                <option>Single Suites - ₱824</option>
                <option>Twin Bed - ₱1,148</option>
                <option>Double Standard - ₱1,266</option>
                <option>Matrimonial - ₱1,383</option>
                <option>Family Room - ₱2,205</option>
                <option>Executive Suite - ₱2,940</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Customer Name</label>
              <input type="text" className="edit-input" value={form.customer || ""} onChange={set("customer")}/>
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="edit-input" value={form.email || ""} onChange={set("email")}/>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Contact Number</label>
              <input type="text" className="edit-input" value={form.contact || ""} onChange={set("contact")}/>
            </div>
            <div className="form-group">
              <label className="form-label">Additional Guest</label>
              <input type="number" className="edit-input" value={form.addguest || ""} onChange={set("addguest")} min="0"/>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Check-In Date</label>
              <input type="date" className="edit-input" value={form.checkin || ""} onChange={set("checkin")}/>
            </div>
            <div className="form-group">
              <label className="form-label">Check-Out Date</label>
              <input type="date" className="edit-input" value={form.checkout || ""} onChange={set("checkout")}/>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Additional Requests</label>
            <textarea className="edit-input edit-textarea" value={form.addreq || ""} onChange={set("addreq")} placeholder="Additional Requests"/>
          </div>
          <div className="edit-payment-card">
            <h4 className="edit-payment-title">Payment Summary</h4>
            <div className="edit-payment-grid">
              <div><span className="detail-label">Amount Paid</span><span className="detail-value">{row.amountpaid}</span></div>
              <div><span className="detail-label">Date</span><span className="detail-value">{row.paydate}</span></div>
              <div><span className="detail-label">Transaction ID</span><span className="detail-value">{row.transid}</span></div>
              <div><span className="detail-label">Payment Option</span><span className="detail-value">Downpayment</span></div>
            </div>
          </div>
    </Modal>
  );
}

// ─── REJECT MODAL ────────────────────────────────────────────
function RejectModal({ open, onClose, onSubmit, initialReason = "" }) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (open) setReason(initialReason);
  }, [open, initialReason]);
  const trimmed = reason.trim();
  const canContinue = trimmed.length > 0;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject booking"
      size="sm"
      placement="center"
      panelClassName="fd-room-modal fd-room-reject-modal"
      bodyClassName="fd-room-reject-modal__body"
      footer={
        <div className="modal-footer modal-footer-actions fd-room-reject-modal__footer">
          <button type="button" className="btn-confirm-cancel" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-confirm-submit"
            disabled={!canContinue}
            onClick={() => canContinue && onSubmit(trimmed)}
          >
            Continue to confirmation
          </button>
        </div>
      }
    >
      <p className="reject-intro">
        The guest will see this reason in their account and in their notification. Please be clear and professional.
      </p>
      <p className="reject-label">Reason for rejection (required)</p>
      <textarea
        className="reject-textarea"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="e.g. Selected dates are no longer available, or required information was missing."
        rows={5}
      />
    </Modal>
  );
}

// ─── CHECK MODAL (Reserved Guest — Check-In / Check-Out) — full guest + booking details + actions ───
function CheckModal({ open, row, onClose, onCheckin, onCheckout, onAddCharges }) {
  const [apiBooking, setApiBooking] = useState(null);
  const [detailBusy, setDetailBusy] = useState(false);

  useEffect(() => {
    if (!open || !row?._bookingId || !getStoredAuthToken()) {
      setApiBooking(null);
      setDetailBusy(false);
      return undefined;
    }
    let cancelled = false;
    setDetailBusy(true);
    setApiBooking(null);
    fetchBookingByIdBackend(row._bookingId)
      .then((b) => {
        if (!cancelled && b && String(b.id) === String(row._bookingId)) setApiBooking(b);
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
  }, [open, row?._bookingId, row?.total, row?.balance]);

  const display = useMemo(() => {
    if (!row) return null;
    if (!apiBooking) return row;
    const paydate =
      apiBooking.paymentDate && String(apiBooking.paymentDate).trim()
        ? formatApiPaymentDateDisplay(apiBooking.paymentDate)
        : row.paydate;
    const cr =
      apiBooking.cancellationReason != null && String(apiBooking.cancellationReason).trim()
        ? String(apiBooking.cancellationReason).trim()
        : row.cancellationReason || "";
    const cat = apiBooking.cancelledAt
      ? formatCancelledAtDisplay(apiBooking.cancelledAt)
      : row.cancelledAtLabel || "—";
    const addFromApi =
      apiBooking.additionalRequests != null ? String(apiBooking.additionalRequests).trim() : "";
    const apiTotalNum = parsePesoNum(apiBooking.totalAmount);
    const rowTotalNum = parsePesoNum(row.total);
    const totalsDiffer =
      Number.isFinite(apiTotalNum) &&
      Number.isFinite(rowTotalNum) &&
      Math.abs(apiTotalNum - rowTotalNum) > 0.009;
    /** After staff PATCH (e.g. add charges), `row` updates before refetched `apiBooking` — keep bill text in sync. */
    const addreqMerged = totalsDiffer
      ? String(row.addreq ?? "").trim() || addFromApi
      : addFromApi !== ""
        ? addFromApi
        : String(row.addreq ?? "").trim();
    const declineFromApi =
      apiBooking.declineReason != null ? String(apiBooking.declineReason).trim() : "";
    const credited = paymentCreditedTowardTotal(apiTotalNum, parsePesoNum(apiBooking.paymentAmount));
    const apiBal =
      Number.isFinite(apiTotalNum) && Number.isFinite(credited)
        ? Math.max(0, apiTotalNum - credited)
        : NaN;
    return {
      ...row,
      ...(totalsDiffer
        ? {
            total: row.total,
            downpayment: row.downpayment,
            balance: row.balance,
            price: row.price || row.total,
            paid: row.paid,
            amountpaid: row.amountpaid,
          }
        : {
            total: fmtPeso(apiTotalNum),
            downpayment: fmtPeso(credited),
            balance: fmtPeso(apiBal),
            price: fmtPeso(apiTotalNum),
            paid: fmtPeso(credited),
            amountpaid: fmtPeso(credited),
          }),
      paymethod: apiBooking.paymentMethod || row.paymethod,
      transid: apiBooking.transactionId || row.transid,
      paydate,
      paymentProofData:
        apiBooking.paymentProofData != null && String(apiBooking.paymentProofData).trim() !== ""
          ? String(apiBooking.paymentProofData)
          : row.paymentProofData || "",
      cancellationReason: cr,
      cancelledAtLabel: cat,
      checkin: apiBooking.checkIn || row.checkin,
      checkout: apiBooking.checkOut || row.checkout,
      addguest:
        apiBooking.additionalGuests != null && apiBooking.additionalGuests !== ""
          ? String(apiBooking.additionalGuests)
          : row.addguest,
      addreq: addreqMerged,
      customer: bookingCustomerDisplayName(apiBooking) || row.customer,
      email: bookingEmailDisplay(apiBooking) || row.email,
      contact: bookingPhoneDisplay(apiBooking) || row.contact,
      declineReason: declineFromApi !== "" ? declineFromApi : row.declineReason || "",
    };
  }, [row, apiBooking]);

  const idPhotoData = useLazyBookingIdPhoto({
    open: open && !!row,
    bookingId: row?._bookingId,
    rowPhoto: row?.validIdPhotoData,
  });

  if (!row) return null;
  const isOccupied = String(row.status || "").toLowerCase() === "occupied";
  const r = display || row;
  const addreqParsed = parseAdditionalRequestChargeLines(r.addreq);
  const addOnsSubtotal = addreqParsed.charges.reduce((s, c) => s + c.amount, 0);
  const roomType = roomTitleFromPackageField(r.package);
  const idSrc =
    idPhotoData && String(idPhotoData).startsWith("data:") ? idPhotoData : IMAGES.guestId;
  const proofBooking = { paymentMethod: r.paymethod, paymentProofData: r.paymentProofData };
  const proofSrc = paymentProofFromBooking(proofBooking);
  const pmLabel = paymentMethodDisplayLabel(proofBooking);
  const payLine = derivePaymentStatusLine(
    { paymentMethod: r.paymethod, transactionId: r.transid },
    proofSrc,
  );
  const showCancellation =
    String(r.cancellationReason || "").trim() !== "" ||
    (r.cancelledAtLabel && r.cancelledAtLabel !== "—") ||
    String(r._apiStatus || "").toLowerCase() === "cancelled";
  const showDeclineReason =
    String(r._apiStatus || "").toLowerCase() === "rejected" && String(r.declineReason || "").trim() !== "";

  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title={isOccupied ? "Guest stay & check-out" : "Guest details & check-in"}
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
        {detailBusy ? <p className="rdm-loading">Loading booking details…</p> : null}
        <div className="rdm-status-bar">
          <div className="rdm-pill rdm-pill--booking">
            <span className="rdm-pill__k">Booking status</span>
            <span className="rdm-pill__v">
              <Badge status={r.status} />
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
            <h4 className="rdm-card__title">Booking information</h4>
            <dl className="rdm-dl">
              <div>
                <dt className="rdm-dt">Booking ref.</dt>
                <dd className="rdm-dd rdm-dd--muted">{String(r.refnum || r._bookingId || "—").trim() || "—"}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Room no.</dt>
                <dd className="rdm-dd">{r.roomno}</dd>
              </div>
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Room / package</dt>
                <dd className="rdm-dd">{r.package || roomType}</dd>
              </div>
              <div>
                <dt className="rdm-dt">{isOccupied ? "Stay total on bill" : "Quoted total"}</dt>
                <dd className="rdm-dd">{isOccupied ? r.total : r.price || r.total}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Status</dt>
                <dd className="rdm-dd">
                  <Badge status={r.status} />
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
                <dt className="rdm-dt">Check-in</dt>
                <dd className="rdm-dd">{r.checkin}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Check-out</dt>
                <dd className="rdm-dd">{r.checkout}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Additional guests</dt>
                <dd className="rdm-dd">{r.addguest}</dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card rdm-card--span2">
            <h4 className="rdm-card__title">{isOccupied ? "Current guest bill" : "Billing summary"}</h4>
            {isOccupied ? (
              <>
                <div className="rdm-billing" role="region" aria-label="Current guest bill">
                  <div className="rdm-billing__cell">
                    <div className="rdm-billing__label">Stay total (room and add-ons)</div>
                    <div className="rdm-billing__value">{r.total}</div>
                  </div>
                  <div className="rdm-billing__cell">
                    <div className="rdm-billing__label">Payments received</div>
                    <div className="rdm-billing__value">{r.downpayment}</div>
                  </div>
                  <div className="rdm-billing__cell rdm-billing__cell--highlight">
                    <div className="rdm-billing__label">Balance due</div>
                    <div className="rdm-billing__value">{r.balance}</div>
                  </div>
                </div>
                {addreqParsed.charges.length > 0 ? (
                  <div className="rdm-charge-lines" aria-label="Itemized additional charges">
                    <div className="rdm-charge-lines__title">Additional charges (itemized)</div>
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
                  Add-on charges increase the stay total and the guest&apos;s remaining balance (balance due). Collect
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
                  <dd className="rdm-dd">{r.downpayment}</dd>
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
                    ? "No separate free-text notes — priced add-ons are listed under Current guest bill."
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
          {showCancellation ? (
            <section className="rdm-card rdm-card--span2">
              <h4 className="rdm-card__title">Cancellation</h4>
              <dl className="rdm-dl">
                <div className="rdm-dl__full">
                  <dt className="rdm-dt">Reason</dt>
                  <dd className="rdm-dd">{String(r.cancellationReason || "").trim() || "—"}</dd>
                </div>
                <div>
                  <dt className="rdm-dt">Cancelled at</dt>
                  <dd className="rdm-dd">{r.cancelledAtLabel || "—"}</dd>
                </div>
              </dl>
            </section>
          ) : null}
          <section className="rdm-card">
            <h4 className="rdm-card__title">Payment information</h4>
            <dl className="rdm-dl">
              <div>
                <dt className="rdm-dt">Method</dt>
                <dd className="rdm-dd">{pmLabel}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Amount paid</dt>
                <dd className="rdm-dd">{r.amountpaid}</dd>
              </div>
              <div className="rdm-dl__full">
                <dt className="rdm-dt">Transaction ID</dt>
                <dd className="rdm-dd rdm-dd--muted">{r.transid}</dd>
              </div>
              <div>
                <dt className="rdm-dt">Payment date</dt>
                <dd className="rdm-dd">{r.paydate || "—"}</dd>
              </div>
            </dl>
          </section>
          <section className="rdm-card">
            <h4 className="rdm-card__title">Government ID</h4>
            <div className="rdm-media-frame rdm-media-frame--tall">
              <img src={idSrc} alt="Guest ID" className="rdm-media-img" decoding="async" />
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}

// ─── ADD CHARGES (occupied room — same UX as Events) ─────────
/** `currentTotalBalanceStr` = balance due (remaining). Optional stay total / payments for a full bill snapshot. */
function AddChargesModal({
  open,
  onClose,
  onAddItem,
  currentTotalBalanceStr = "—",
  currentStayTotalStr = "—",
  currentPaymentsStr = "—",
}) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState(1);
  const [chargeItems, setChargeItems] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (!open) return;
    setItem("");
    setAmount("");
    setQty(1);
    setChargeItems([]);
    setShowConfirm(false);
  }, [open]);

  const previewTotal =
    chargeItems.reduce((s, c) => s + c.amount * c.qty, 0) +
    (item && parseFloat(amount) > 0 ? parseFloat(amount) * qty : 0);
  const balanceDueNum = parsePesoNum(currentTotalBalanceStr);
  const stayTotalNum = parsePesoNum(currentStayTotalStr);
  const balanceAfterCharges = Number.isFinite(balanceDueNum)
    ? Math.max(0, balanceDueNum + previewTotal)
    : NaN;
  const stayTotalAfterCharges = Number.isFinite(stayTotalNum)
    ? Math.max(0, stayTotalNum + previewTotal)
    : NaN;
  const showStayLine = currentStayTotalStr && currentStayTotalStr !== "—" && Number.isFinite(stayTotalNum);
  const showPaidLine = currentPaymentsStr && currentPaymentsStr !== "—";
  if (!open) return null;

  const changeQty = (i, d) =>
    setChargeItems((prev) => prev.map((c, idx) => (idx === i ? { ...c, qty: Math.max(1, c.qty + d) } : c)));
  const remove = (i) => setChargeItems((prev) => prev.filter((_, idx) => idx !== i));
  const clear = () => {
    setItem("");
    setAmount("");
    setQty(1);
  };

  const doAdd = () => {
    const newItems = [...chargeItems, { item, amount: parseFloat(amount), qty }];
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
        title="Add room charges"
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
                if (!item.trim() || !parseFloat(amount)) return;
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
              <label className="detail-label">Items</label>
              <input
                type="text"
                className="charges-input"
                placeholder="e.g. towel, shampoo"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="detail-label">Amount</label>
              <input
                type="text"
                className="charges-input"
                placeholder="e.g. 50"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="detail-label">Quantity</label>
              <input
                type="number"
                className="charges-input"
                min="1"
                value={qty}
                onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)}
              />
            </div>
          </div>
          <div className="charges-list-wrap">
            <div className="charges-list-header">Item</div>
            <div className="charges-list">
              {chargeItems.map((c, i) => (
                <div key={i} className="charge-item-row">
                  <span className="charge-item-name">
                    {c.item}
                    <br />
                    <small>₱{c.amount.toFixed(2)}</small>
                  </span>
                  <div className="charge-qty-ctrl">
                    <button type="button" onClick={() => changeQty(i, -1)}>
                      −
                    </button>
                    <span>{c.qty}</span>
                    <button type="button" onClick={() => changeQty(i, 1)}>
                      +
                    </button>
                    <button type="button" className="charge-remove" onClick={() => remove(i)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
              {item && parseFloat(amount) > 0 && (
                <div className="charge-item-row charge-preview-row" style={{ opacity: 0.6 }}>
                  <span className="charge-item-name">
                    {item}
                    <br />
                    <small>₱{parseFloat(amount).toFixed(2)}</small>
                  </span>
                  <span className="charge-qty-ctrl">× {qty}</span>
                </div>
              )}
            </div>
            <div className="charges-total-row">
              <span>New charges total</span>
              <span>₱{previewTotal.toFixed(2)}</span>
            </div>
            <div className="charges-balance-hint charges-balance-hint--stack" aria-live="polite">
              <div className="charges-balance-hint__caption">Current bill (before this save)</div>
              {showStayLine ? (
                <div>
                  <span className="charges-balance-hint-label">Stay total on bill</span>
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
                  <span className="charges-balance-hint-label">Stay total on bill</span>
                  <span className="charges-balance-hint-value">
                    {Number.isFinite(stayTotalAfterCharges) ? fmtPeso(stayTotalAfterCharges) : "—"}
                  </span>
                </div>
              ) : null}
              <div>
                <span className="charges-balance-hint-label">Balance due</span>
                <span className="charges-balance-hint-value">
                  {Number.isFinite(balanceAfterCharges) ? fmtPeso(balanceAfterCharges) : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={showConfirm}
        tone="caution"
        headline="Add room charge"
        layout="booking"
        text="Add this item to the room bill and update the total balance?"
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

// ─── WALK-IN MODAL ───────────────────────────────────────────
const WALKIN_ROOM_FALLBACK = [
  { id: "", package: "Single Suites", roomNumber: "RM001", guests: 2 },
  { id: "", package: "Twin Bed", roomNumber: "RM002", guests: 2 },
  { id: "", package: "Double Standard", roomNumber: "RM003", guests: 4 },
  { id: "", package: "Family Room", roomNumber: "RM004", guests: 6 },
  { id: "", package: "Executive Suite", roomNumber: "RM005", guests: 4 },
];

function WalkinModal({ open, onClose, onSubmit }) {
  const initForm = {
    room: "",
    name: "",
    email: "",
    contact: "",
    address: "",
    nationality: "Philippines",
    addguest: "",
    checkin: "",
    checkout: "",
    requests: "",
    payment: "cash",
    termsCheck: false,
    privacyCheck: false,
    stayCheck: false,
  };
  const [form, setForm] = useState(initForm);
  const [errors, setErrors] = useState({});
  const [idPreview, setIdPreview] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [payForm, setPayForm] = useState({ amountpaid: "", paydate: "", transid: "", proof: null });
  const [payErrors, setPayErrors] = useState({});
  const [proofPreview, setProofPreview] = useState(null);
  const [roomCatalog, setRoomCatalog] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [wiLoading, setWiLoading] = useState(false);
  const [wiLoadErr, setWiLoadErr] = useState("");
  const [roomOccupancyRanges, setRoomOccupancyRanges] = useState([]);
  const [occLoading, setOccLoading] = useState(false);
  const [occErr, setOccErr] = useState("");
  /** Bumps merged occupancy refetch when bookings change elsewhere or tab regains focus. */
  const [walkinOccPing, setWalkinOccPing] = useState(0);

  const wiToday = useMemo(() => formatLocalTodayYmd(), [open]);
  const occupancyWindowTo = useMemo(() => addLocalDays(wiToday, 540), [wiToday]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };
  const setBool = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.checked }));
    setErrors((er) => ({ ...er, [k]: "" }));
  };
  const setP = (k, v) => {
    setPayForm((f) => ({ ...f, [k]: v }));
    setPayErrors((er) => ({ ...er, [k]: "" }));
  };

  const handleIdUpload = async (e) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setErrors((er) => ({ ...er, id: "" }));
    await handleImageFileInputChange(file, {
      uploadFn: uploadBookingGuestValidIdDirectBackend,
      setPreview: setIdPreview,
      setError: (msg) => {
        setIdPreview(null);
        setErrors((er) => ({ ...er, id: msg || "ID upload failed." }));
      },
    });
  };

  const roomOptions = useMemo(() => {
    const fromApi = (roomCatalog || [])
      .map((r) => ({
        id: String(r.id ?? "").trim(),
        label: `${String(r.package ?? r.title ?? "Room").trim()} - ${formatStoredRoomNumberForDisplay(r.roomNumber)}`,
        guests: Math.max(1, parseInt(String(r.guests ?? 1), 10) || 1),
      }))
      .filter((r) => r.id);
    const base = fromApi.length
      ? fromApi
      : WALKIN_ROOM_FALLBACK.map((r) => ({
          id: r.id,
          label: `${r.package || r.title} - ${formatStoredRoomNumberForDisplay(r.roomNumber)}`,
          guests: r.guests,
        }));
    const ci = form.checkin;
    const co = form.checkout;
    const guestN = 1 + Math.max(0, parseInt(String(form.addguest || "0"), 10) || 0);
    if (!ci || !co || co <= ci) return base;
    return base.filter((row) => {
      if (guestN > row.guests) return false;
      if (!row.id) return true;
      return isRoomAvailableForDates(row.id, ci, co, bookedRanges);
    });
  }, [roomCatalog, bookedRanges, form.checkin, form.checkout, form.addguest]);

  const selectedRoomId = useMemo(() => {
    const fromApi = (roomCatalog || [])
      .map((r) => ({
        id: String(r.id ?? "").trim(),
        label: `${String(r.package ?? r.title ?? "Room").trim()} - ${formatStoredRoomNumberForDisplay(r.roomNumber)}`,
      }))
      .filter((r) => r.id);
    const base = fromApi.length
      ? fromApi
      : WALKIN_ROOM_FALLBACK.map((r) => ({
          id: String(r.id ?? "").trim(),
          label: `${r.package || r.title} - ${formatStoredRoomNumberForDisplay(r.roomNumber)}`,
        }));
    const hit = base.find((r) => r.label === form.room);
    return hit?.id ? String(hit.id) : "";
  }, [roomCatalog, form.room]);

  const selectedCatalogRoom = useMemo(() => {
    if (!selectedRoomId) return null;
    return (roomCatalog || []).find((r) => String(r.id) === selectedRoomId) ?? null;
  }, [roomCatalog, selectedRoomId]);

  const walkinStayBill = useMemo(() => {
    if (!selectedCatalogRoom || !form.checkin || !form.checkout) return null;
    if (countStayNights(form.checkin, form.checkout) < 1) return null;
    const { packageLabel } = splitWalkinRoomSelection(form.room);
    return computeRoomBookingBill({
      roomTitle: packageLabel || form.room,
      nightlyRate: Number(selectedCatalogRoom.price) || 0,
      checkIn: form.checkin,
      checkOut: form.checkout,
      includedGuests: Math.max(1, parseInt(String(selectedCatalogRoom.guests ?? 1), 10) || 1),
      additionalGuests: form.addguest,
    });
  }, [selectedCatalogRoom, form.room, form.checkin, form.checkout, form.addguest]);

  const walkinLivePayment = useMemo(() => {
    if (!walkinStayBill) return null;
    const paidNum =
      form.payment === "gcash" && payForm.amountpaid.trim()
        ? parsePesoNum(payForm.amountpaid)
        : 0;
    return paymentSnapshotFromBill(walkinStayBill, paidNum);
  }, [walkinStayBill, form.payment, payForm.amountpaid]);

  const selectedRoomIdRef = useRef("");
  selectedRoomIdRef.current = selectedRoomId;

  const occupancyRangesForAvailability = useMemo(
    () =>
      roomOccupancyRanges.map((b) => ({
        roomId: selectedRoomId,
        checkIn: String(b.checkIn ?? "").trim(),
        checkOut: String(b.checkOut ?? "").trim(),
      })),
    [roomOccupancyRanges, selectedRoomId],
  );

  const blockedCheckInSet = useMemo(
    () => blockedCheckInSetFromRanges(roomOccupancyRanges),
    [roomOccupancyRanges],
  );

  const { occupiedNightSet, reservedNightSet } = useMemo(
    () => splitGuestStayNightsByTone(roomOccupancyRanges),
    [roomOccupancyRanges],
  );

  const bookingCalendarLabels = useMemo(
    () => ({
      labelDayButton(date, modifiers, options, dateLib) {
        let label = defaultLabelDayButton(date, modifiers, options, dateLib);
        const key = formatLocalYmd(date);
        if (selectedRoomId && blockedCheckInSet.has(key)) {
          const detail = occupiedNightSet.has(key)
            ? " In-house stay (checked in)."
            : " This night is already reserved for the selected room.";
          label = `${label}.${detail} Not available as walk-in check-in.`;
        }
        return label;
      },
    }),
    [blockedCheckInSet, occupiedNightSet, selectedRoomId],
  );

  const checkInDisabledMatchers = useMemo(() => {
    const t0 = parseLocalYmd(wiToday);
    return [
      t0 ? { before: t0 } : { before: new Date() },
      (date) => !selectedRoomId || blockedCheckInSet.has(formatLocalYmd(date)),
    ];
  }, [blockedCheckInSet, selectedRoomId, wiToday]);

  const checkoutDisabledMatcher = useCallback(
    (date) => {
      if (!form.checkin) return true;
      const s = formatLocalYmd(date);
      if (s <= form.checkin) return true;
      if (!selectedRoomId) return true;
      return !isRoomAvailableForDates(selectedRoomId, form.checkin, s, occupancyRangesForAvailability);
    },
    [form.checkin, selectedRoomId, occupancyRangesForAvailability],
  );

  useEffect(() => {
    if (!open || !selectedRoomId) {
      setRoomOccupancyRanges([]);
      setOccErr("");
      return undefined;
    }
    let cancelled = false;
    setOccLoading(true);
    setOccErr("");
    (async () => {
      const ridAtStart = selectedRoomIdRef.current;
      try {
        const { ranges, primaryErr } = await fetchRoomBookedRangesMerged(ridAtStart, wiToday, occupancyWindowTo);
        if (!cancelled && selectedRoomIdRef.current === ridAtStart) {
          setRoomOccupancyRanges(ranges);
          setOccErr(ranges.length === 0 && primaryErr ? primaryErr : "");
        }
      } catch (e) {
        if (!cancelled && selectedRoomIdRef.current === ridAtStart) {
          setRoomOccupancyRanges([]);
          setOccErr(e?.message || "Could not load booked dates for this room.");
        }
      } finally {
        if (!cancelled && selectedRoomIdRef.current === ridAtStart) {
          setOccLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selectedRoomId, wiToday, occupancyWindowTo, walkinOccPing]);

  useEffect(() => {
    function bump() {
      setWalkinOccPing((n) => n + 1);
    }
    window.addEventListener("abela-guest-bookings-ping", bump);
    function onStorage(e) {
      if (e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) bump();
    }
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("abela-guest-bookings-ping", bump);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onVis = () => {
      if (document.visibilityState === "visible") setWalkinOccPing((n) => n + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      setWiLoading(true);
      setWiLoadErr("");
      try {
        const cat = await fetchRoomsCatalog().catch(() => []);
        let ranges = [];
        if (getStoredAuthToken()) {
          const list = await fetchBookingsBackend().catch(() => []);
          if (Array.isArray(list)) ranges = roomBookedRangesFromBookings(list);
        }
        if (!cancelled) {
          setRoomCatalog(Array.isArray(cat) ? cat : []);
          setBookedRanges(ranges);
        }
      } catch (e) {
        if (!cancelled) setWiLoadErr(e?.message || "Could not load availability.");
      } finally {
        if (!cancelled) setWiLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  useEffect(() => {
    if (!form.room) return;
    const ok = roomOptions.some((o) => o.label === form.room);
    if (!ok) setForm((f) => ({ ...f, room: "" }));
  }, [roomOptions, form.room]);

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

  const handleProofFile = async (e) => {
    const f = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!f) return;
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
  };

  function selectPayment(val) {
    setForm(f => ({ ...f, payment: val }));
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

  function handleSelectCheckIn(d) {
    const s = d ? formatLocalYmd(d) : "";
    setForm((f) => {
      const next = { ...f, checkin: s };
      if (
        f.checkout &&
        (f.checkout <= s ||
          (selectedRoomId &&
            !isRoomAvailableForDates(selectedRoomId, s, f.checkout, occupancyRangesForAvailability)))
      ) {
        next.checkout = "";
      }
      return next;
    });
    setErrors((er) => ({ ...er, checkin: "", checkout: "" }));
  }

  function handleSelectCheckOut(d) {
    const s = d ? formatLocalYmd(d) : "";
    setForm((f) => ({ ...f, checkout: s }));
    setErrors((er) => ({ ...er, checkout: "" }));
  }

  const validatePayment = () => {
    const errs = {};
    if (!payForm.amountpaid.trim()) errs.amountpaid = "Required";
    if (!payForm.paydate) errs.paydate = "Required";
    if (!payForm.transid.trim()) errs.transid = "Required";
    if (!isStoredImageRef(proofPreview)) errs.proof = "Please upload proof";
    return errs;
  };

  const validate = () => {
    const errs = {};
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!form.room) errs.room = "Please select a room.";
    if (!form.name.trim()) errs.name = "Full name is required.";
    if (!form.email.trim()) errs.email = "Email is required.";
    else if (!emailRx.test(form.email.trim())) errs.email = "Please enter a valid email.";
    if (!form.contact.trim()) errs.contact = "Contact number is required.";
    if (!form.address.trim()) errs.address = "Address is required.";
    if (!form.checkin) errs.checkin = "Check-in date is required.";
    if (!form.checkout) errs.checkout = "Check-out date is required.";
    else if (form.checkin && form.checkout <= form.checkin) errs.checkout = "Check-out must be after check-in.";
    if (selectedRoomId && form.checkin && blockedCheckInSet.has(form.checkin)) {
      errs.checkin = "This check-in overlaps an existing stay for the selected room.";
    }
    if (
      selectedRoomId &&
      form.checkin &&
      form.checkout &&
      form.checkout > form.checkin &&
      !isRoomAvailableForDates(selectedRoomId, form.checkin, form.checkout, occupancyRangesForAvailability)
    ) {
      errs.checkout = "These dates overlap an existing stay for this room.";
    }
    if (!isStoredImageRef(idPreview)) errs.id = "Please upload a valid government ID.";
    if (!form.termsCheck) errs.termsCheck = "You must accept the Terms and Conditions.";
    if (!form.privacyCheck) errs.privacyCheck = "Please agree to the Data Privacy Policy.";
    if (!form.stayCheck) errs.stayCheck = "Please agree to the Terms & Conditions of Stay.";
    if (
      form.checkin &&
      form.checkout &&
      form.checkout > form.checkin &&
      form.room &&
      (!walkinStayBill || !(walkinStayBill.total > 0))
    ) {
      errs.checkout = "Could not calculate the stay total. Please verify dates and room.";
    }
    setErrors(errs);
    if (form.payment === "gcash") {
      const pe = validatePayment();
      setPayErrors(pe);
      return Object.keys(errs).length === 0 && Object.keys(pe).length === 0;
    }
    return Object.keys(errs).length === 0;
  };

  const submitPayment = () => {
    const pe = validatePayment();
    const paid = parsePesoNum(payForm.amountpaid);
    const stayTotal = walkinStayBill?.total ?? 0;
    const minDown = walkinStayBill?.minimumDownPayment ?? 0;
    if (stayTotal > 0 && paid > stayTotal) {
      pe.amountpaid = `Amount cannot exceed stay total (${formatPeso(stayTotal)}).`;
    }
    if (minDown > 0 && paid < minDown) {
      pe.amountpaid = `Minimum down payment is ${formatPeso(minDown)}.`;
    }
    setPayErrors(pe);
    if (Object.keys(pe).length) return;
    setShowPayment(false);
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSubmit({
      ...form,
      roomId: selectedRoomId,
      bill: walkinStayBill,
      idDataUrl: idPreview,
      govIdNote: idPreview ? "Government ID attached (walk-in)" : "",
      paySnapshot:
        form.payment === "gcash"
          ? { ...payForm, proofPreview: isStoredImageRef(proofPreview) ? proofPreview : "" }
          : null,
    });
  };
  const handleClear = () => {
    setForm(initForm);
    setErrors({});
    setIdPreview(null);
    setShowPayment(false);
    clearPayForm();
    setRoomOccupancyRanges([]);
    setOccErr("");
    setOccLoading(false);
  };

  if (!open) return null;
  return (
    <>
      <div
        className="walkin-room-booking-root modal-backdrop active"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="modal modal--booking" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="modal-header modal-header--booking">
            <h2 className="modal-title">Room walk-in reservation</h2>
            <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="modal-body modal-body--booking">
            <div className="booking-form">
              <div className="form-row">
                <div className="form-group full-width">
                  <label htmlFor="wi-room-select">
                    Select room <span className="required">*</span>
                  </label>
                  {wiLoadErr ? <p className="field-error" style={{ marginBottom: 6 }}>{wiLoadErr}</p> : null}
                  <p className="walkin-load-hint">
                    {wiLoading
                      ? "Loading room catalog and bookings…"
                      : "Rooms update from your catalog and current bookings. Pick check-in and check-out to hide rooms that overlap those dates."}
                  </p>
                  <p className="walkin-cal-server-hint">
                    Gold and red nights reflect <strong>saved server bookings</strong> for the selected room. Walk-in
                    reservations are saved to the database when you are signed in and the API is running.
                  </p>
                  <select
                    id="wi-room-select"
                    className={errors.room ? "input-error" : ""}
                    value={form.room}
                    onChange={set("room")}
                    disabled={wiLoading}
                  >
                    <option value="">— Select a room —</option>
                    {roomOptions.map((o) => (
                      <option key={`${o.id}|${o.label}`} value={o.label}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {!wiLoading && roomOptions.length === 0 && form.checkin && form.checkout && form.checkout > form.checkin ? (
                    <span className="field-error">
                      No rooms available for guest count and dates — adjust dates or additional guests.
                    </span>
                  ) : null}
                  {errors.room ? <span className="field-error">{errors.room}</span> : null}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="wi-cust-name">
                    Customer name <span className="required">*</span>
                  </label>
                  <input
                    id="wi-cust-name"
                    type="text"
                    value={form.name}
                    onChange={set("name")}
                    placeholder="Full name"
                    className={errors.name ? "input-error" : ""}
                  />
                  {errors.name ? <span className="field-error">{errors.name}</span> : null}
                </div>
                <div className="form-group">
                  <label htmlFor="wi-email">
                    Email address <span className="required">*</span>
                  </label>
                  <input
                    id="wi-email"
                    type="email"
                    value={form.email}
                    onChange={set("email")}
                    placeholder="name@email.com"
                    className={errors.email ? "input-error" : ""}
                  />
                  {errors.email ? <span className="field-error">{errors.email}</span> : null}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="wi-contact">
                    Contact number <span className="required">*</span>
                  </label>
                  <input
                    id="wi-contact"
                    type="text"
                    value={form.contact}
                    onChange={set("contact")}
                    placeholder="09XXXXXXXXX"
                    className={errors.contact ? "input-error" : ""}
                  />
                  {errors.contact ? <span className="field-error">{errors.contact}</span> : null}
                </div>
                <div className="form-group">
                  <label htmlFor="wi-address">
                    Address <span className="required">*</span>
                  </label>
                  <input
                    id="wi-address"
                    type="text"
                    value={form.address}
                    onChange={set("address")}
                    placeholder="City, Province"
                    className={errors.address ? "input-error" : ""}
                  />
                  {errors.address ? <span className="field-error">{errors.address}</span> : null}
                </div>
              </div>

              <div className="form-row form-row--stay-calendars">
                <p className="booking-cal-unavailable-hint">
                  <strong>How to pick dates:</strong> use the <strong>left</strong> calendar for check-in (avoid gold/red
                  nights). The <strong>right</strong> calendar for check-out stays disabled until check-in is chosen.
                </p>
                <div className="form-group">
                  <span className="form-label-static" id="wi-checkin-label">
                    Check-in date <span className="required">*</span>
                  </span>
                  <div className={errors.checkin ? "booking-day-picker-wrap booking-day-picker-wrap--error" : "booking-day-picker-wrap"}>
                    <DayPicker
                      key={`wi-ci-${selectedRoomId}`}
                      mode="single"
                      selected={form.checkin ? parseLocalYmd(form.checkin) : undefined}
                      onSelect={handleSelectCheckIn}
                      startMonth={parseLocalYmd(wiToday) ?? undefined}
                      endMonth={parseLocalYmd(occupancyWindowTo) ?? undefined}
                      defaultMonth={parseLocalYmd(form.checkin) ?? parseLocalYmd(wiToday) ?? undefined}
                      disabled={checkInDisabledMatchers}
                      labels={bookingCalendarLabels}
                      modifiers={{
                        stayOccupied: (date) => occupiedNightSet.has(formatLocalYmd(date)),
                        stayReserved: (date) => reservedNightSet.has(formatLocalYmd(date)),
                      }}
                      modifiersClassNames={{
                        stayOccupied: "fd-cal-cell fd-cal-cell--occupied",
                        stayReserved: "fd-cal-cell fd-cal-cell--reserved",
                      }}
                      className="booking-day-picker"
                      id="wi-checkin-calendar"
                      aria-labelledby="wi-checkin-label"
                    />
                  </div>
                  {occLoading ? <span className="booking-cal-hint">Loading availability…</span> : null}
                  {!selectedRoomId ? (
                    <span className="booking-cal-hint">Select a room above — check-in dates stay disabled until a room is chosen.</span>
                  ) : null}
                  {errors.checkin ? <span className="field-error">{errors.checkin}</span> : null}
                </div>
                <div className="form-group">
                  <span className="form-label-static" id="wi-checkout-label">
                    Check-out date <span className="required">*</span>
                    {!form.checkin ? (
                      <span className="booking-checkout-locked-label"> — choose check-in first</span>
                    ) : null}
                  </span>
                  <div
                    className={`${errors.checkout ? "booking-day-picker-wrap booking-day-picker-wrap--error" : "booking-day-picker-wrap"}${!form.checkin ? " booking-day-picker-wrap--checkout-locked" : ""}`}
                  >
                    <DayPicker
                      key={`wi-co-${selectedRoomId}-${form.checkin || "none"}`}
                      mode="single"
                      selected={form.checkout ? parseLocalYmd(form.checkout) : undefined}
                      onSelect={handleSelectCheckOut}
                      startMonth={parseLocalYmd(wiToday) ?? undefined}
                      endMonth={parseLocalYmd(occupancyWindowTo) ?? undefined}
                      defaultMonth={
                        parseLocalYmd(form.checkout) ??
                        parseLocalYmd(form.checkin) ??
                        parseLocalYmd(wiToday) ??
                        undefined
                      }
                      disabled={checkoutDisabledMatcher}
                      labels={bookingCalendarLabels}
                      modifiers={{
                        stayOccupied: (date) => occupiedNightSet.has(formatLocalYmd(date)),
                        stayReserved: (date) => reservedNightSet.has(formatLocalYmd(date)),
                      }}
                      modifiersClassNames={{
                        stayOccupied: "fd-cal-cell fd-cal-cell--occupied",
                        stayReserved: "fd-cal-cell fd-cal-cell--reserved",
                      }}
                      className="booking-day-picker"
                      id="wi-checkout-calendar"
                      aria-labelledby="wi-checkout-label"
                    />
                  </div>
                  {!form.checkin ? (
                    <span className="booking-cal-hint">
                      Check-out stays <strong>inactive</strong> until you pick check-in on the left — the numbers are not
                      broken; the right calendar is locked by design.
                    </span>
                  ) : null}
                  {errors.checkout ? <span className="field-error">{errors.checkout}</span> : null}
                </div>
              </div>
              {occErr && roomOccupancyRanges.length === 0 ? (
                <p className="booking-occupancy-warn" role="status">
                  Could not load booked dates for this room ({occErr}). You can still submit; the front desk will confirm availability. Double booking is possible until dates load — try again or pick dates you know are open.
                </p>
              ) : null}
              <div className="booking-form-fd-cal-legend">
                <div className="fd-cal-legend" aria-label="Calendar legend">
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--available" aria-hidden /> Available
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--reserved" aria-hidden /> Reserved / Pending
                  </span>
                  <span className="fd-cal-legend-item">
                    <span className="fd-cal-legend-swatch fd-cal-legend-swatch--occupied" aria-hidden /> Occupied
                  </span>
                </div>
                <p className="booking-cal-legend-help">
                  Each night shows this room&apos;s status. <strong>Gold</strong> covers pending and approved stays.{" "}
                  <strong>Red</strong> means a guest is in-house.
                </p>
              </div>
              <p className="booking-schedule-note" role="note">
                <strong>Note:</strong> Check-in time is 2:00 PM and check-out time is 12:00 PM. Colors match the front desk calendar: <strong>Occupied</strong> (red) and <strong>Reserved</strong> (gold) nights cannot be used as check-in. The next guest may check in from 2:00 PM on the departure date of an existing stay.
              </p>

              {walkinStayBill ? (
                <div className="booking-form-billing-block">
                  <BillingSummary bill={walkinStayBill} title="Billing summary" showMinimumDown />
                  {walkinLivePayment ? (
                    <BillingPaymentPills
                      total={walkinLivePayment.total}
                      amountPaid={walkinLivePayment.amountPaid}
                      balanceDue={walkinLivePayment.balanceDue}
                      minimumDownPayment={walkinLivePayment.minimumDownPayment}
                    />
                  ) : null}
                </div>
              ) : null}

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="wi-nationality">Nationality</label>
                  <select id="wi-nationality" value={form.nationality} onChange={set("nationality")}>
                    <option>Philippines</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="wi-addguest">Additional guests</label>
                  <input
                    id="wi-addguest"
                    type="number"
                    value={form.addguest}
                    onChange={set("addguest")}
                    placeholder="0"
                    min={0}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group full-width">
                  <span className="form-label-static">
                    Guest ID <span className="required">*</span>
                  </span>
                  <label
                    htmlFor="wi-room-id-file"
                    className={`upload-box upload-box--booking-id${errors.id ? " box-error" : ""}`}
                  >
                    <input id="wi-room-id-file" type="file" accept="image/*" onChange={handleIdUpload} />
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
                <label className="form-section__label" htmlFor="wi-requests">
                  Additional requests
                </label>
                <textarea
                  id="wi-requests"
                  rows={4}
                  value={form.requests}
                  onChange={set("requests")}
                  placeholder="Special requests or notes (optional)"
                />
              </div>

              <div className="form-section form-section--payment">
                <div className="form-section__head">
                  <CardIcon aria-hidden />
                  <h3 className="form-section__title">Payment options</h3>
                </div>
                <p className="form-section__desc">
                  Pay with cash on arrival, or choose GCash to scan and save payment details here. Saving GCash details does not finalize the walk-in until you confirm on the next screen.
                </p>
                <div className="payment-options">
                  <label
                    className={`payment-card${form.payment === "cash" ? " selected" : ""}`}
                    onClick={() => selectPayment("cash")}
                  >
                    <input type="radio" name="wi-room-walkin-payment" value="cash" readOnly checked={form.payment === "cash"} />
                    <div className="payment-card-inner">
                      <CashPayIcon />
                      <strong>Cash</strong>
                      <span>Pay at the front desk — no online form needed</span>
                    </div>
                  </label>
                  <label
                    className={`payment-card${form.payment === "gcash" ? " selected" : ""}`}
                    onClick={() => selectPayment("gcash")}
                  >
                    <input type="radio" name="wi-room-walkin-payment" value="gcash" readOnly checked={form.payment === "gcash"} />
                    <div className="payment-card-inner">
                      <div className="payment-gcash-icon-wrap">
                        <img
                          src={IMAGES.gcashCard}
                          alt=""
                          className="payment-logo-gcash"
                          width={32}
                          height={32}
                          decoding="async"
                        />
                      </div>
                      <strong>GCash</strong>
                      <span>Scan QR and fill in amount, date, and proof</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="terms-block">
                <h3 className="terms-title">Terms and Conditions</h3>
                <div className="terms-body">
                  <ol>
                    <li>
                      <strong>Valid ID requirement</strong>
                      <ul>
                        <li>A clear photo of a valid government-issued ID must be uploaded with this walk-in request.</li>
                        <li>The reservation name should match the name on the ID.</li>
                      </ul>
                    </li>
                    <li>
                      <strong>Verification</strong>
                      <ul>
                        <li>The front desk may verify submitted identification before approval.</li>
                      </ul>
                    </li>
                  </ol>
                </div>
                <label className={`checkbox-label${errors.termsCheck ? " check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.termsCheck} onChange={setBool("termsCheck")} />
                  I have read and accept the <a href="#">Terms and Conditions</a>
                </label>
                {errors.termsCheck ? <span className="field-error">{errors.termsCheck}</span> : null}
              </div>

              <div className="agreements-block">
                <h3 className="agreements-title">Required agreements</h3>
                <label className={`checkbox-label${errors.privacyCheck ? " check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.privacyCheck} onChange={setBool("privacyCheck")} />
                  I have read and agree to the <a href="#">Data Privacy &amp; Policy</a>
                </label>
                {errors.privacyCheck ? <span className="field-error">{errors.privacyCheck}</span> : null}
                <label className={`checkbox-label${errors.stayCheck ? " check-error" : ""}`}>
                  <input type="checkbox" checked={!!form.stayCheck} onChange={setBool("stayCheck")} />
                  I have read and agree to the <a href="#">Terms &amp; Conditions of Stay</a>
                </label>
                {errors.stayCheck ? <span className="field-error">{errors.stayCheck}</span> : null}
              </div>

              {form.room || form.checkin || form.checkout || form.name.trim() ? (
                <div className="booking-review-summary" aria-labelledby="wi-room-booking-summary-title">
                  <h3 id="wi-room-booking-summary-title" className="booking-review-summary__title">
                    Booking summary
                  </h3>
                  <ul className="booking-review-summary__list">
                    <li>
                      <span className="booking-review-summary__k">Room</span>
                      <span className="booking-review-summary__v">{form.room || "—"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Check-in</span>
                      <span className="booking-review-summary__v">{form.checkin || "—"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Check-out</span>
                      <span className="booking-review-summary__v">{form.checkout || "—"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Additional guests</span>
                      <span className="booking-review-summary__v">{form.addguest || "0"}</span>
                    </li>
                    <li>
                      <span className="booking-review-summary__k">Guest</span>
                      <span className="booking-review-summary__v">{form.name.trim() || "—"}</span>
                    </li>
                    {walkinStayBill ? (
                      <>
                        <li>
                          <span className="booking-review-summary__k">Nights</span>
                          <span className="booking-review-summary__v">{walkinStayBill.nights}</span>
                        </li>
                        <li>
                          <span className="booking-review-summary__k">Total amount</span>
                          <span className="booking-review-summary__v">{formatPeso(walkinStayBill.total)}</span>
                        </li>
                        <li>
                          <span className="booking-review-summary__k">Remaining balance</span>
                          <span className="booking-review-summary__v">
                            {formatPeso(walkinLivePayment?.balanceDue ?? walkinStayBill.total)}
                          </span>
                        </li>
                      </>
                    ) : null}
                    <li>
                      <span className="booking-review-summary__k">Payment</span>
                      <span className="booking-review-summary__v">{form.payment === "gcash" ? "GCash" : "Cash on arrival"}</span>
                    </li>
                    {form.payment === "gcash" && payForm.amountpaid.trim() && payForm.paydate ? (
                      <li>
                        <span className="booking-review-summary__k">GCash</span>
                        <span className="booking-review-summary__v">
                          {payForm.amountpaid} on {payForm.paydate}, ref. {payForm.transid || "—"}
                          {payForm.proof ? " · Proof attached" : ""}
                        </span>
                      </li>
                    ) : form.payment === "gcash" ? (
                      <li>
                        <span className="booking-review-summary__k">GCash</span>
                        <span className="booking-review-summary__v booking-review-summary__v--muted">
                          Complete the payment form when it opens, then submit here.
                        </span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {form.payment === "gcash" && payForm.amountpaid.trim() && payForm.paydate ? (
                <p className="booking-gcash-draft-note" role="status">
                  GCash details are saved in this form only. Review the summary above, then click Submit Reservation to continue.
                </p>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="btn-clear" onClick={handleClear}>
                  Clear
                </button>
                <button type="button" className="btn-submit-reservation" onClick={handleSubmit}>
                  Submit reservation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <div
          className="walkin-room-booking-root modal-backdrop active"
          style={{ zIndex: 10001 }}
          onClick={(e) => e.target === e.currentTarget && closePayModal()}
        >
          <div className="modal payment-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h2 className="modal-title">GCash payment</h2>
              <button type="button" className="modal-close" onClick={closePayModal} aria-label="Close">
                ✕
              </button>
            </div>
            <div className="modal-body payment-modal-body">
              <p className="payment-modal-lead">
                Enter transfer details and proof here. This saves them in the walk-in form only — the reservation is not added until you confirm on the next screen.
              </p>
              <div className="payment-modal-columns">
                <div className="payment-qr-side">
                  <div className="payment-qr-brand">
                    <div className={`qr-payment-frame${payQrMissing ? " qr-payment-frame--empty" : ""}`}>
                      {!payQrMissing && (
                        <img
                          src={IMAGES.gcashPaymentQr}
                          alt=""
                          className="qr-img qr-img-payment"
                          decoding="async"
                          onError={() => setPayQrMissing(true)}
                        />
                      )}
                      {payQrMissing && (
                        <div className="qr-payment-placeholder" aria-hidden>
                          <span className="qr-payment-placeholder-label">QR code</span>
                        </div>
                      )}
                    </div>
                    <p className="qr-name">GCash</p>
                  </div>
                  <p className="qr-handle">@Abela Suites</p>
                </div>
                <div className="payment-form-side">
                  <h3 className="payment-form-title">Fill this form</h3>
                  <div className="payment-form-grid">
                    <div className="form-group">
                      <label>
                        Amount paid <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 1,666"
                        value={payForm.amountpaid}
                        onChange={(e) => setP("amountpaid", e.target.value)}
                        className={payErrors.amountpaid ? "input-error" : ""}
                      />
                      {payErrors.amountpaid ? <span className="field-error">{payErrors.amountpaid}</span> : null}
                    </div>
                    <div className="form-group">
                      <label>
                        Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        value={payForm.paydate}
                        onChange={(e) => setP("paydate", e.target.value)}
                        className={payErrors.paydate ? "input-error" : ""}
                      />
                      {payErrors.paydate ? <span className="field-error">{payErrors.paydate}</span> : null}
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: 10 }}>
                    <label>
                      Transaction ID <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter transaction ID"
                      value={payForm.transid}
                      onChange={(e) => setP("transid", e.target.value)}
                      className={payErrors.transid ? "input-error" : ""}
                    />
                    {payErrors.transid ? <span className="field-error">{payErrors.transid}</span> : null}
                  </div>
                  <div className="form-group" style={{ marginTop: 10 }}>
                    <label>
                      Proof of payment <span className="required">*</span>
                    </label>
                    <label className={`upload-box proof-upload${payErrors.proof ? " box-error" : ""}`}>
                      <input type="file" accept="image/*" onChange={handleProofFile} />
                      {payForm.proof && proofPreview ? (
                        <img src={proofPreview} className="upload-preview" alt="Proof preview" />
                      ) : (
                        <div className="upload-placeholder">
                          <UploadIcon />
                          <span>Upload your proof of payment here…</span>
                        </div>
                      )}
                    </label>
                    {payErrors.proof ? <span className="field-error">{payErrors.proof}</span> : null}
                  </div>
                  <div className="payment-form-actions">
                    <button type="button" className="btn-clear" onClick={clearPayForm}>
                      Clear
                    </button>
                    <button type="button" className="btn-submit-reservation" onClick={submitPayment}>
                      Save payment details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function visibleClientPageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function RoomReservation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [tab, setTab] = useState("reservation");
  const [reservations, setReservations] = useState(initialReservations);
  /** Reservation tab: `all` | `pending` | `approved` | `rejected` | `occupied` | `cancelled` */
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [reservationsLoad, setReservationsLoad] = useState(false);
  const [reservationsErr, setReservationsErr] = useState("");
  const [search, setSearch] = useState("");
  /** Client-side table pagination only; same reservation fetch / state as before (no API or DB change). */
  const [roomsTablePage, setRoomsTablePage] = useState(1);
  const [roomsTablePageSize, setRoomsTablePageSize] = useState(10);
  const { pendingCount, displayNotifications, loadPending, markStaffNotificationsSeen } =
    useFrontdeskPendingNotifications({
      bookingType: "room",
    });
  const { mainStyle } = useFrontdeskShell();
  // toast
  const [toast, setToast] = useState({ show: false, msg: "" });
  const showToast = (msg) => { setToast({ show: true, msg }); setTimeout(() => setToast({ show: false, msg: "" }), 3000); };

  /** Room catalog id → room number (for remapping after PATCH). */
  const roomCatalogMapRef = useRef(new Map());

  const loadReservationsFromApi = useCallback(async () => {
    setReservationsLoad(true);
    setReservationsErr("");
    if (!getStoredAuthToken()) {
      setReservations((prev) => {
        const walkins = prev.filter((r) => r._walkin);
        return [...initialReservations, ...walkins];
      });
      setReservationsLoad(false);
      return;
    }
    try {
      const [list, catalog] = await Promise.all([
        fetchBookingsBackend(),
        fetchRoomsCatalog().catch(() => []),
      ]);
      const ridMap = buildRoomIdToNumberMap(catalog);
      roomCatalogMapRef.current = ridMap;
      const roomBookings = Array.isArray(list) ? list.filter((b) => b.type === "room") : [];
      const apiRows = roomBookings.map((b) => mapApiRoomBookingToRow(b, ridMap));
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
    const onToken = () => loadReservationsFromApi();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadReservationsFromApi]);

  // modals state
  const [addChargesOpen, setAddChargesOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [checkRow, setCheckRow] = useState(null);
  useEffect(() => {
    if (!checkRow) setAddChargesOpen(false);
  }, [checkRow]);
  const [walkinOpen, setWalkinOpen] = useState(false);

  // confirm dialogs
  const [approveConfirm, setApproveConfirm] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [checkinConfirm, setCheckinConfirm] = useState(false);
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);
  const [editUpdateConfirm, setEditUpdateConfirm] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [walkinConfirm, setWalkinConfirm] = useState(false);
  const [walkinSuccess, setWalkinSuccess] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [pendingWalkin, setPendingWalkin] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [bookingOutcomeSuccess, setBookingOutcomeSuccess] = useState(null);
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

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
    return reservationMonitorRows.filter((r) => reservationFilterBucket(r) === reservationStatusFilter);
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
        r.checkout,
        r._bookingId,
        r.cancellationReason,
      ].some((v) => String(v ?? "").toLowerCase().includes(q));
    });
  }, [filteredResAfterStatus, search]);

  /** Same data as Reservation — approved+ stays only (on-site / check-in). */
  const guestRows = useMemo(
    () =>
      reservations
        .filter((r) => {
          const api = String(r._apiStatus || "").toLowerCase();
          if (api === "completed" || api === "cancelled") return false;
          const s = String(r.status || "").toLowerCase();
          if (s === "pending" || s === "rejected") return false;
          if (s === "cancelledbooking" || s === "cancelled") return false;
          if (s === "checked-out" || s === "completed") return false;
          return true;
        })
        .map((r) => ({
          ...r,
          guest: r.customer,
          roomno: r.roomno != null && String(r.roomno).trim() !== "" ? r.roomno : r.number,
        })),
    [reservations],
  );

  const filteredGuestRows = useMemo(() => {
    const q = search.toLowerCase();
    return guestRows.filter((g) =>
      [g.number, g.roomno, g.type, g.customer, g.package, g.status, g.email, g.contact, g.refnum, g.guest, g.checkin, g.checkout].some((v) =>
        String(v ?? "").toLowerCase().includes(q),
      ),
    );
  }, [guestRows, search]);

  const roomsActiveFiltered = tab === "reservation" ? filteredRes : filteredGuestRows;
  const roomsPageSizeSafe = Math.min(100, Math.max(5, Number(roomsTablePageSize) || 10));
  const roomsTotalPages = Math.max(1, Math.ceil(roomsActiveFiltered.length / roomsPageSizeSafe));
  const roomsPageSafe = Math.min(Math.max(1, roomsTablePage), roomsTotalPages);

  const roomsPagedRows = useMemo(() => {
    const start = (roomsPageSafe - 1) * roomsPageSizeSafe;
    return roomsActiveFiltered.slice(start, start + roomsPageSizeSafe);
  }, [roomsActiveFiltered, roomsPageSafe, roomsPageSizeSafe]);

  useEffect(() => {
    setRoomsTablePage(1);
  }, [search, tab, reservationStatusFilter]);

  useEffect(() => {
    setRoomsTablePage((p) => Math.min(Math.max(1, p), roomsTotalPages));
  }, [roomsTotalPages]);

  /** Snapshot for Add Charges modal: stay total, payments, balance due (matches Check modal / table). */
  const addChargesBillingSnapshot = useMemo(() => {
    if (!checkRow) return null;
    const key = rowMatchKey(checkRow);
    const r = reservations.find((x) => rowMatchKey(x) === key);
    const src = r ?? checkRow;
    return {
      balanceDue: src?.balance ?? checkRow.balance ?? "—",
      stayTotal: src?.total ?? checkRow.total ?? "—",
      payments: src?.downpayment ?? checkRow.downpayment ?? "—",
    };
  }, [checkRow, reservations]);

  const staffTopbarRef = useRef(null);

  const openNotificationBooking = useCallback((notif) => {
    const bookingId = String(notif?.bookingId || "").trim();
    if (!bookingId) return;
    const path = getFrontdeskNotificationBookingPath(notif);
    staffTopbarRef.current?.hideMenusOnly?.();
    if (!path) return;
    if (path.includes("/frontdesk-events")) {
      navigate(path);
      return;
    }
    const row = reservations.find((r) => mongoIdFromRow(r) === bookingId);
    if (row) {
      setTab("reservation");
      setDetailsRow(row);
      setRejectOpen(false);
      setApproveConfirm(false);
      return;
    }
    navigate(path);
  }, [navigate, reservations]);

  useEffect(() => {
    const bookingId = new URLSearchParams(location.search).get("bookingId");
    if (!bookingId) return;
    const row = reservations.find((r) => mongoIdFromRow(r) === String(bookingId).trim());
    if (!row) return;
    setTab("reservation");
    setDetailsRow(row);
    setRejectOpen(false);
    setApproveConfirm(false);
    navigate("/frontdesk-rooms", { replace: true });
  }, [location.search, navigate, reservations]);

  function mongoIdFromRow(row) {
    const raw = String(row?._bookingId ?? row?.refnum ?? "").trim();
    return /^[a-f0-9]{24}$/i.test(raw) ? raw : "";
  }

  // approve
  const confirmApprove = async () => {
    const row = detailsRow;
    if (!row) return;
    const bookingId = mongoIdFromRow(row);
    if (bookingId) {
      try {
        await approveBookingBackend(bookingId);
        setApproveConfirm(false);
        setDetailsRow(null);
        dispatchHousekeepingTasksRefresh();
        dispatchHousekeepingInboxRefresh();
        dispatchGuestBookingsRefreshPing();
        dispatchFrontdeskNotificationsRefresh();
        await loadReservationsFromApi();
        await loadPending();
        setBookingOutcomeSuccess("approve");
      } catch (e) {
        const msg = e.message || "Approve failed";
        if (e?.status === 409 || /only pending/i.test(msg)) {
          window.alert("This reservation is no longer pending. Refreshing the list.");
          await loadReservationsFromApi();
          await loadPending();
          setDetailsRow(null);
        } else {
          window.alert(msg);
          showToast(msg);
        }
        setApproveConfirm(false);
      }
      return;
    }
    setReservations((rs) => rs.map((r) => (String(r.id) === String(row.id) ? { ...r, status: "approved" } : r)));
    setApproveConfirm(false);
    setDetailsRow(null);
    dispatchGuestBookingsRefreshPing();
    setBookingOutcomeSuccess("approve-demo");
  };

  // reject
  const confirmReject = async () => {
    const row = detailsRow;
    if (!row) return;
    const bookingId = mongoIdFromRow(row);
    if (bookingId) {
      try {
        await rejectBookingBackend(bookingId, rejectReason.trim() || undefined);
        setRejectConfirm(false);
        setRejectOpen(false);
        setDetailsRow(null);
        setRejectReason("");
        dispatchGuestBookingsRefreshPing();
        dispatchFrontdeskNotificationsRefresh();
        await loadReservationsFromApi();
        await loadPending();
        setBookingOutcomeSuccess("reject");
      } catch (e) {
        const msg = e.message || "Reject failed";
        if (e?.status === 409 || /only pending/i.test(msg)) {
          window.alert("This reservation is no longer pending. Refreshing the list.");
          await loadReservationsFromApi();
          await loadPending();
          setDetailsRow(null);
        } else {
          window.alert(msg);
          showToast(msg);
        }
        setRejectConfirm(false);
      }
      return;
    }
    setReservations((rs) => rs.map((r) => (String(r.id) === String(row.id) ? { ...r, status: "rejected" } : r)));
    setRejectConfirm(false);
    setRejectOpen(false);
    setDetailsRow(null);
    setRejectReason("");
    dispatchGuestBookingsRefreshPing();
    setBookingOutcomeSuccess("reject-demo");
  };

  // check-in — persist `occupied` on the server so Check Details shows Add Charges + Check-Out after reload
  const doCheckin = async () => {
    if (!checkRow) return;
    const key = rowMatchKey(checkRow);
    const bookingId = mongoIdFromRow(checkRow);
    setCheckinConfirm(false);

    if (bookingId) {
      try {
        const folioTitle = roomTitleFromPackageField(checkRow.package || "").trim();
        const rn = snapshotRoomNumberForBookingPatch(checkRow.roomno || checkRow.number);
        const patch = { status: "occupied" };
        if (folioTitle) patch.roomTitle = folioTitle;
        if (rn) patch.roomNumber = rn;
        await patchBookingBackend(bookingId, patch);
        dispatchGuestBookingsRefreshPing();
        dispatchHousekeepingTasksRefresh();
        dispatchHousekeepingInboxRefresh();
        dispatchFrontdeskNotificationsRefresh();
        await loadReservationsFromApi();
      } catch (e) {
        window.alert(e?.message || "Check-in failed.");
        return;
      }
    } else {
      setReservations((rs) =>
        rs.map((r) => (rowMatchKey(r) === key ? { ...r, status: "occupied" } : r)),
      );
    }
    setCheckRow(null);
    showToast("Guest Checked In!");
  };

  // check-out — persist completed in Mongo; remove from Reserved Guest (history still lists the booking)
  const doCheckout = async () => {
    if (!checkRow) return;
    const key = rowMatchKey(checkRow);
    const bookingId = mongoIdFromRow(checkRow);
    if (bookingId) {
      try {
        const folioTitle = roomTitleFromPackageField(checkRow.package || "").trim();
        const rn = snapshotRoomNumberForBookingPatch(checkRow.roomno || checkRow.number);
        const patch = { status: "completed" };
        if (folioTitle) patch.roomTitle = folioTitle;
        if (rn) patch.roomNumber = rn;
        await patchBookingBackend(bookingId, patch);
        dispatchGuestBookingsRefreshPing();
        dispatchHousekeepingTasksRefresh();
        dispatchHousekeepingInboxRefresh();
        dispatchFrontdeskNotificationsRefresh();
        await loadReservationsFromApi();
      } catch (e) {
        window.alert(e?.message || "Checkout failed.");
        return;
      }
    } else {
      setReservations((rs) =>
        rs.map((r) => (rowMatchKey(r) === key ? { ...r, status: "checked-out" } : r)),
      );
    }
    setCheckoutConfirm(false);
    setAddChargesOpen(false);
    setCheckRow(null);
    showToast("Guest Checked Out!");
    navigate("/frontdesk-history");
  };

  const handleRoomAddItem = async (items) => {
    if (!checkRow) return;
    const key = rowMatchKey(checkRow);
    const r = reservations.find((x) => rowMatchKey(x) === key);
    if (!r) {
      setAddChargesOpen(false);
      return;
    }
    const extra = items.reduce((s, c) => s + (Number(c.amount) || 0) * (Number(c.qty) || 0), 0);
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
    const chargeLine = formatChargeLinesForAdditionalRequests(items);
    const prevReq = String(r.addreq || "").trim();
    const addreqMerged = [prevReq && prevReq !== "N/A" ? prevReq : "", chargeLine].filter(Boolean).join("; ");
    const totalAmountStr = Number.isFinite(newTotal)
      ? (Math.round(newTotal * 100) / 100).toFixed(2)
      : "0.00";

    const bookingId = mongoIdFromRow(r);
    setAddChargesOpen(false);

    if (bookingId) {
      try {
        const fresh = await patchBookingBackend(bookingId, {
          totalAmount: totalAmountStr,
          additionalRequests: addreqMerged || prevReq,
        });
        const updatedRow = mapApiRoomBookingToRow(fresh, roomCatalogMapRef.current);
        setReservations((prev) => prev.map((x) => (rowMatchKey(x) === bookingId ? updatedRow : x)));
        setCheckRow(mergeCheckRowFromReservationRow(updatedRow));
        dispatchGuestBookingsRefreshPing();
        showToast(`Charges added to this guest bill. Stay total ${updatedRow.total} — balance ${updatedRow.balance}.`);
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
    setReservations((prev) => prev.map((x) => (rowMatchKey(x) === key ? localRow : x)));
    setCheckRow(mergeCheckRowFromReservationRow(localRow));
    showToast("Charges updated (demo — not saved to API).");
  };

  // edit save — persist to API when we have a Mongo booking id so housekeeping sees `roomTitle` / totals
  const doEditUpdate = async () => {
    if (!pendingEdit) {
      setEditUpdateConfirm(false);
      return;
    }
    const bookingId = mongoIdFromRow(pendingEdit);
    if (bookingId) {
      try {
        const { roomTitle, totalAmount } = parseEditRoomPackageSelect(pendingEdit.package);
        const patch = {
          customerName: String(pendingEdit.customer || "").trim(),
          email: String(pendingEdit.email || "").trim(),
          contactNumber: String(pendingEdit.contact || "").trim(),
          checkIn: pendingEdit.checkin,
          checkOut: pendingEdit.checkout,
          additionalGuests: Math.max(0, parseInt(String(pendingEdit.addguest ?? "0"), 10) || 0),
          additionalRequests: String(pendingEdit.addreq || "").trim(),
        };
        if (roomTitle) patch.roomTitle = roomTitle;
        if (totalAmount !== "" && Number.isFinite(Number(totalAmount))) {
          patch.totalAmount = (Math.round(Number(totalAmount) * 100) / 100).toFixed(2);
        }
        const fresh = await patchBookingBackend(bookingId, patch);
        const updatedRow = mapApiRoomBookingToRow(fresh, roomCatalogMapRef.current);
        setReservations((rs) => rs.map((r) => (mongoIdFromRow(r) === bookingId ? updatedRow : r)));
        dispatchGuestBookingsRefreshPing();
        dispatchHousekeepingTasksRefresh();
      } catch (e) {
        window.alert(e?.message || "Could not save reservation.");
        setEditUpdateConfirm(false);
        return;
      }
    } else {
      setReservations((rs) => rs.map((r) => (r.id === pendingEdit?.id ? { ...r, ...pendingEdit } : r)));
    }
    setEditUpdateConfirm(false);
    setEditRow(null);
    setDetailsRow(null);
    setEditSuccess(true);
    setTimeout(() => setEditSuccess(false), 2000);
  };

  // walk-in submit
  const doWalkin = async () => {
    if (!pendingWalkin) return;
    const snap = pendingWalkin.paySnapshot;
    const gcash = pendingWalkin.payment === "gcash" && snap;
    const bill = pendingWalkin.bill;
    const total = bill?.total ?? 0;
    const paidNum = gcash ? parsePesoNum(snap.amountpaid) : 0;
    const credited = paymentCreditedTowardTotal(total, paidNum);
    const bal = Number.isFinite(total) && Number.isFinite(credited) ? Math.max(0, total - credited) : 0;
    const { roomno, packageLabel } = splitWalkinRoomSelection(pendingWalkin.room);
    const title = packageLabel || pendingWalkin.room || "Room";
    const addreq =
      [pendingWalkin.requests, pendingWalkin.govIdNote].filter((x) => x && String(x).trim()).join(" — ") || "None";
    const hasId = isStoredImageRef(pendingWalkin.idDataUrl);
    const hasProof = gcash && isStoredImageRef(snap?.proofPreview);

    const finishWalkin = (newRes) => {
      setReservations((rs) => [...rs, newRes]);
      setWalkinConfirm(false);
      setPendingWalkin(null);
      setWalkinOpen(false);
      setWalkinSuccess(true);
      setTimeout(() => setWalkinSuccess(false), 2000);
      showToast("Walk-in reservation added.");
    };

    if (getStoredAuthToken() && pendingWalkin.roomId && bill && total > 0) {
      try {
        const payload = {
          type: "room",
          customerName: String(pendingWalkin.name || "").trim(),
          email: String(pendingWalkin.email || "").trim().toLowerCase(),
          contactNumber: String(pendingWalkin.contact || "").trim(),
          address: String(pendingWalkin.address || "").trim(),
          roomId: String(pendingWalkin.roomId),
          roomNumber: roomno !== "—" ? roomno.replace(/^RM-?/i, "") : "",
          roomTitle: title,
          checkIn: pendingWalkin.checkin,
          checkOut: pendingWalkin.checkout,
          additionalGuests: Math.max(0, parseInt(String(pendingWalkin.addguest ?? "0"), 10) || 0),
          guestIdPhotoName: hasId ? "uploaded" : "default.png",
          guestIdPhotoData: hasId ? pendingWalkin.idDataUrl : "",
          additionalRequests: addreq,
          totalAmount: total.toFixed(2),
          paymentAmount: String(paidNum),
          paymentMethod: gcash ? "Gcash" : "Cash",
          transactionId: gcash ? String(snap.transid || "").trim() : "",
          paymentDate: gcash ? String(snap.paydate || "").trim() : "",
          paymentProofData: hasProof ? snap.proofPreview : "",
          paymentProofName: hasProof ? "uploaded" : "",
        };
        const fresh = await createBookingBackend(payload);
        const newRow = mapApiRoomBookingToRow(fresh, roomCatalogMapRef.current);
        dispatchGuestBookingsRefreshPing();
        dispatchFrontdeskNotificationsRefresh();
        finishWalkin(newRow);
        return;
      } catch (e) {
        window.alert(e?.message || "Could not save walk-in booking to the server.");
        return;
      }
    }

    const nextId = reservations.length + 1;
    const numLabel = `RES-00${nextId}`;
    finishWalkin({
      _walkin: true,
      id: nextId,
      number: numLabel,
      type: "Walk-in",
      customer: pendingWalkin.name,
      package: formatRoomPackageWithNumber(numLabel, title),
      total: fmtPeso(total),
      downpayment: fmtPeso(credited),
      balance: fmtPeso(bal),
      status: "pending",
      roomno,
      price: fmtPeso(total),
      email: pendingWalkin.email,
      contact: pendingWalkin.contact,
      checkin: pendingWalkin.checkin,
      checkout: pendingWalkin.checkout,
      addguest: pendingWalkin.addguest || "0",
      paid: fmtPeso(credited),
      refnum: "—",
      amountpaid: fmtPeso(credited),
      paydate: gcash ? snap.paydate : "—",
      transid: gcash ? snap.transid : "—",
      addreq,
      paymethod: gcash ? "GCash" : "Cash",
    });
  };

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout rooms-page frontdesk-app"
        mainStyle={mainStyle}
        sidebar={
          <FrontdeskSidebar
            navItems={[
              { label: "Dashboard", icon: <DashboardIcon />, href: "/frontdesk-dashboard" },
              { label: "Rooms", icon: <RoomsIcon />, href: "/frontdesk-rooms" },
              { label: "Events", icon: <EventsIcon />, href: "/frontdesk-events" },
              { label: "Housekeeping", icon: <HouseIcon />, href: "/frontdesk-housekeeping" },
              { label: "Bills", icon: <BillsIcon />, href: "/frontdesk-bills" },
              { label: "Reservation History", icon: <HistoryIcon />, href: "/frontdesk-history" },
              { label: "Settings", icon: <SettingsIcon />, href: "/frontdesk-settings" },
            ]}
            logoSrc={IMAGES.sidebarLogo}
            onLogoError={(e) => {
              e.target.style.background = "white";
              e.target.style.padding = "8px";
            }}
          />
        }
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Rooms</span>
          </div>
          <StaffTopbarActions
            ref={staffTopbarRef}
            roleKey="frontdesk"
            notifications={displayNotifications}
            dot={pendingCount > 0 ? "active" : null}
            dotTitle="Pending or unread alerts"
            onNotificationsPanelOpen={() => void markStaffNotificationsSeen()}
            onNotificationItemClick={(n) => {
              openStaffNotification(n);
            }}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── CONTENT ── */}
        <main className="content">

          {/* HEADING */}
          <div className="page-heading">
            <h1 className="page-title">Reservation Request & Management</h1>
            <p className="page-sub">Review, approve, and manage customer reservations</p>
          </div>

          {/* TOAST */}
          <div className={`res-toast${toast.show ? " active" : ""}`}>
            <div className="res-toast-icon"><CheckIcon/></div>
            <span>{toast.msg}</span>
            <span className="res-toast-sub">Review more reservations!</span>
          </div>

          {/* TOOLBAR */}
          <div className="rooms-res-toolbar">
            <div className="rooms-tab-bar">
              <button type="button" className={`rooms-tab-btn${tab === "reservation" ? " active" : ""}`} onClick={() => setTab("reservation")}>Reservation</button>
              <button type="button" className={`rooms-tab-btn${tab === "guest" ? " active" : ""}`} onClick={() => setTab("guest")}>Reserved Guest</button>
            </div>
            <button className="rooms-walkin-btn" onClick={() => setWalkinOpen(true)}>
              <PlusUserIcon/> Walk-in Reservation
            </button>
          </div>

          {/* SEARCH */}
          <div className="rooms-search-wrap">
            <SearchIcon/>
            <input type="text" className="rooms-search-input" placeholder="Search reservations..." value={search} onChange={e => setSearch(e.target.value)}/>
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
              (run <code style={{ fontSize: 13 }}>npm run seed-demo</code> in <code style={{ fontSize: 13 }}>be/abela-be</code> first). Only
              server-side approvals create housekeeping cleaning tasks.
            </div>
          )}

          {tab === "reservation" && reservationsLoad && (
            <p style={{ margin: "8px 0 0", color: "#9a8060", fontSize: 14 }}>Loading reservations…</p>
          )}
          {tab === "reservation" && reservationsErr && (
            <div style={{ margin: "8px 0 0", color: "#c0392b", fontSize: 14, background: reservationsErr.includes("Not signed") ? "#fdecea" : "transparent", padding: reservationsErr.includes("Not signed") ? "0.75rem 1rem" : 0, borderRadius: 8 }}>
              {reservationsErr.includes("Not signed") ? (
                <>
                  <strong>No API token.</strong> Log in at <strong>/login</strong> with a staff user that exists in MongoDB (run <code style={{ fontSize: 13 }}>npm run seed-demo</code> in <code style={{ fontSize: 13 }}>be/abela-be</code>, then <code style={{ fontSize: 13 }}>frontdesk@abela.demo</code> / <code style={{ fontSize: 13 }}>12345678</code>).
                </>
              ) : (
                reservationsErr
              )}
            </div>
          )}

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
                  <col className="rooms-col-fdr-action" />
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
                    <th className="rooms-th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRes.length === 0 ? (
                    <tr>
                      <td colSpan="9" style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>No reservations found.</td>
                    </tr>
                  ) : (
                    roomsPagedRows.map((r) => (
                      <tr key={String(r.id)}>
                        <td className="rooms-td-nowrap">{formatStoredRoomNumberForDisplay(r.number)}</td>
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
                        <td className="rooms-td-status">
                          <Badge status={r.status} />
                        </td>
                        <td className="rooms-td-action">
                          <div className="rooms-action-cell rooms-action-cell--trailing">
                            <div className="rooms-action-lead rooms-action-lead--review">
                              <button
                                type="button"
                                className="rooms-action-btn rooms-review-btn"
                                onClick={() => setDetailsRow(r)}
                              >
                                Review
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

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
                      <td colSpan="7" style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>No guests found. Approve a reservation first, or use sample data while logged out.</td>
                    </tr>
                  ) : (
                    roomsPagedRows.map((g) => (
                      <tr key={rowMatchKey(g)}>
                        <td className="rooms-td-customer" title={String(g.customer || g.guest || "").trim()}>
                          {String(g.customer || g.guest || "").trim() || "—"}
                        </td>
                        <td>{packageLabelForReservedGuestRow(g.package, g.status)}</td>
                        <td className="rooms-td-num">{g.total}</td>
                        <td className="rooms-td-num">{g.downpayment}</td>
                        <td className="rooms-td-num">{g.balance}</td>
                        <td className="rooms-td-status">
                          <Badge status={g.status} />
                        </td>
                        <td className="rooms-td-action">
                          <div className="rooms-action-cell rooms-action-cell--trailing">
                            <div className="rooms-action-lead rooms-action-lead--checkin">
                              {String(g.status || "").toLowerCase() === "occupied" ? (
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
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {roomsActiveFiltered.length > 0 ? (
          <div
            className="rooms-pagination-row rooms-pagination-row--below-table"
            role="navigation"
            aria-label={tab === "reservation" ? "Reservation table pages" : "Reserved guest table pages"}
          >
            <div className="rooms-pagination-meta">
              <span className="rooms-pagination-info">
                Showing{" "}
                <strong>
                  {roomsActiveFiltered.length === 0 ? 0 : (roomsPageSafe - 1) * roomsPageSizeSafe + 1}
                </strong>
                –
                <strong>{Math.min(roomsPageSafe * roomsPageSizeSafe, roomsActiveFiltered.length)}</strong> of{" "}
                <strong>{roomsActiveFiltered.length}</strong>
                {tab === "reservation" ? " reservations" : " guests"}
              </span>
              <label className="rooms-pagination-per">
                <span>Rows per page</span>
                <select
                  className="rooms-pagination-select"
                  value={roomsPageSizeSafe}
                  onChange={(e) => {
                    setRoomsTablePageSize(Number(e.target.value));
                    setRoomsTablePage(1);
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
                disabled={roomsPageSafe <= 1}
                onClick={() =>
                  setRoomsTablePage((p) => {
                    const cur = Math.min(Math.max(1, p), roomsTotalPages);
                    return Math.max(1, cur - 1);
                  })
                }
              >
                Prev
              </button>
              {visibleClientPageNumbers(roomsPageSafe, roomsTotalPages).map((pNum, idx, arr) => {
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
                      className={`rooms-pg-num${pNum === roomsPageSafe ? " rooms-pg-num--active" : ""}`}
                      aria-label={`Page ${pNum}`}
                      {...(pNum === roomsPageSafe ? { "aria-current": "page" } : {})}
                      onClick={() => setRoomsTablePage(pNum)}
                    >
                      {pNum}
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                className="rooms-pg-btn"
                disabled={roomsPageSafe >= roomsTotalPages}
                onClick={() =>
                  setRoomsTablePage((p) => {
                    const cur = Math.min(Math.max(1, p), roomsTotalPages);
                    return Math.min(roomsTotalPages, cur + 1);
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

      {/* Details (pending review) */}
      <DetailsModal
        open={!!detailsRow}
        row={detailsRow}
        onClose={() => setDetailsRow(null)}
        onApprove={() => setApproveConfirm(true)}
        onReject={() => {
          setRejectReason("");
          setRejectOpen(true);
        }}
        onEdit={() => {
          if (!detailsRow) return;
          setEditRow(detailsRow);
          setDetailsRow(null);
        }}
      />

      {/* Edit form */}
      <EditModal
        open={!!editRow} row={editRow}
        onClose={() => setEditRow(null)}
        onSave={(form) => { setPendingEdit(form); setEditUpdateConfirm(true); }}
      />

      {/* Reject reason */}
      <RejectModal
        open={rejectOpen}
        initialReason={rejectReason}
        onClose={() => {
          setRejectOpen(false);
          setRejectReason("");
        }}
        onSubmit={(reason) => {
          setRejectReason(reason);
          setRejectOpen(false);
          setRejectConfirm(true);
        }}
      />

      {/* Check (Reserved Guest) */}
      <CheckModal
        open={!!checkRow}
        row={checkRow}
        onClose={() => setCheckRow(null)}
        onCheckin={() => setCheckinConfirm(true)}
        onCheckout={() => setCheckoutConfirm(true)}
        onAddCharges={() => setAddChargesOpen(true)}
      />

      <AddChargesModal
        open={addChargesOpen}
        onClose={() => setAddChargesOpen(false)}
        onAddItem={handleRoomAddItem}
        currentTotalBalanceStr={addChargesBillingSnapshot?.balanceDue ?? "—"}
        currentStayTotalStr={addChargesBillingSnapshot?.stayTotal ?? "—"}
        currentPaymentsStr={addChargesBillingSnapshot?.payments ?? "—"}
      />

      {/* Walk-in */}
      <WalkinModal
        open={walkinOpen}
        onClose={() => {
          setWalkinOpen(false);
          setWalkinConfirm(false);
          setPendingWalkin(null);
        }}
        onSubmit={(form) => {
          setPendingWalkin(form);
          setWalkinOpen(false);
          setWalkinConfirm(true);
        }}
      />

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={approveConfirm}
        tone="approve"
        headline="Confirm approval"
        layout="booking"
        text={APPROVE_BOOKING_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setApproveConfirm(false)}
        onConfirm={confirmApprove}
        confirmLabel="Approve"
      />
      <ConfirmDialog
        open={rejectConfirm}
        tone="reject"
        headline="Confirm rejection"
        layout="booking"
        text={`${REJECT_BOOKING_CONFIRM_INTRO}\n\nReason the guest will see:\n${rejectReason.trim()}`}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => {
          setRejectConfirm(false);
          setRejectOpen(true);
        }}
        onConfirm={confirmReject}
        confirmLabel="Yes, reject"
      />
      <ConfirmDialog
        open={checkinConfirm}
        tone="approve"
        headline="Confirm check-in"
        layout="booking"
        text={CHECKIN_BOOKING_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setCheckinConfirm(false)}
        onConfirm={doCheckin}
        confirmLabel="Check in"
      />
      <ConfirmDialog
        open={checkoutConfirm}
        tone="reject"
        headline="Confirm check-out"
        layout="booking"
        text={CHECKOUT_BOOKING_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setCheckoutConfirm(false)}
        onConfirm={doCheckout}
        confirmLabel="Check out"
      />
      <ConfirmDialog
        open={editUpdateConfirm}
        tone="caution"
        headline="Update reservation"
        layout="booking"
        text={EDIT_RESERVATION_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => setEditUpdateConfirm(false)}
        onConfirm={doEditUpdate}
        confirmLabel="Save changes"
      />
      <ConfirmDialog
        open={editSuccess}
        text="Updated Successfully!"
        isSuccess
        onCancel={() => setEditSuccess(false)}
      />
      <ConfirmDialog
        open={walkinConfirm && pendingWalkin != null}
        tone="caution"
        headline="Submit walk-in"
        layout="booking"
        text={WALKIN_SUBMIT_CONFIRM_TEXT}
        size="md"
        panelClassName="confirm-box confirm-box--booking-decision"
        onCancel={() => {
          setWalkinConfirm(false);
          setPendingWalkin(null);
        }}
        onConfirm={doWalkin}
        confirmLabel="Submit"
      />
      <ConfirmDialog
        open={walkinSuccess}
        text="Reservation Added!"
        isSuccess
        onCancel={() => setWalkinSuccess(false)}
      />

      <ConfirmDialog
        open={bookingOutcomeSuccess != null}
        isSuccess
        text=""
        successHeading={
          bookingOutcomeSuccess == null
            ? ""
            : String(bookingOutcomeSuccess).startsWith("approve")
              ? "Booking approved!"
              : "Booking rejected"
        }
        successBody={
          bookingOutcomeSuccess === "approve"
            ? APPROVE_SUCCESS_BODY
            : bookingOutcomeSuccess === "approve-demo"
              ? APPROVE_SUCCESS_BODY_DEMO
              : bookingOutcomeSuccess === "reject"
                ? REJECT_SUCCESS_BODY
                : bookingOutcomeSuccess === "reject-demo"
                  ? REJECT_SUCCESS_BODY_DEMO
                  : ""
        }
        successSealTone={
          bookingOutcomeSuccess != null && String(bookingOutcomeSuccess).startsWith("reject")
            ? "reject"
            : "success"
        }
        onCancel={() => setBookingOutcomeSuccess(null)}
      />

      <StaffNotificationDetailModal
        notification={staffNotification}
        onClose={closeStaffNotification}
        onOpenReservation={(n) => {
          openNotificationBooking(n);
          closeStaffNotification();
        }}
      />

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}