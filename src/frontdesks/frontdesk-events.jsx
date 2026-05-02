import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { TopbarUserIcon } from "./frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import {
  fetchBookingsBackend,
  fetchEventVenuesBackend,
  approveBookingBackend,
  rejectBookingBackend,
  dispatchHousekeepingTasksRefresh,
  dispatchHousekeepingInboxRefresh,
  dispatchGuestBookingsRefreshPing,
  patchBookingBackend,
} from "../api/guestApi";
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
import { isVenueAvailableForDates, eventBookedRangesFromBookings } from "../guests/guestAvailability";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { StaffNotificationDetailModal, useStaffNotificationDetail } from "./StaffNotificationDetailModal";
import { getFrontdeskNotificationBookingPath } from "./staffNotificationUtils";
import "../guests/idUploadedCard.css";
import "./frontdesk-rooms.css";
import "./frontdesk-events.css";

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

/* ── INITIAL DATA (Reserved Guest tab uses approved+ rows from this same list) ── */
const INITIAL_RESERVATIONS = [
  { id: 1, number: "1", venueName: "Mini Sky Bar", type: "Event", customer: "Jimie Macarulay", package: formatEventPackageWithNumber("1", "Mini Sky Bar"), total: "₱2,205.00", downpayment: "₱661.50", balance: "₱1,543.50", status: "pending", venueNo: "1", price: "₱2,205.00", email: "jimiemacarulay@gmail.com", contact: "09976645323", checkin: "14-02-2026", timeslot: "8:00AM-6:00PM", addguest: "0", paid: "₱661.50", refnum: "ABR-20260221-4598", amountpaid: "₱661.50", paydate: "16/02/2026", transid: "GC1234567890", addreq: "N/A", paymethod: "GCash" },
  { id: 2, number: "2", venueName: "Function Hall", type: "Event", customer: "Marie Santos", package: formatEventPackageWithNumber("2", "Function Hall"), total: "₱2,205.00", downpayment: "₱1,543.00", balance: "₱661.00", status: "pending", venueNo: "2", price: "₱2,205.00", email: "marie@email.com", contact: "09111222333", checkin: "11-02-2026", timeslot: "9:00AM-5:00PM", addguest: "0", paid: "₱1,543", refnum: "ABR-20260221-0012", amountpaid: "₱1,543", paydate: "14/02/2026", transid: "GC0987654321", addreq: "N/A", paymethod: "GCash" },
  { id: 401, number: "1", venueName: "Single Suites", type: "Event", customer: "Alma Reyes", package: formatEventPackageWithNumber("1", "Single Suites"), total: "₱924.00", downpayment: "₱576.00", balance: "₱247.00", status: "approved", venueNo: "1", price: "₱924.00", email: "alma@email.com", contact: "09170000001", checkin: "14-02-2026", timeslot: "2:00 PM - 6:00 PM", addguest: "0", paid: "₱576.00", refnum: "EVT-DEMO-401", amountpaid: "₱576.00", paydate: "10/02/2026", transid: "—", addreq: "N/A", paymethod: "GCash" },
  { id: 402, number: "2", venueName: "Single Suites", type: "Event", customer: "Ben Cruz", package: formatEventPackageWithNumber("2", "Single Suites"), total: "₱1,148.00", downpayment: "₱803.00", balance: "₱334.00", status: "approved", venueNo: "2", price: "₱1,148.00", email: "ben@email.com", contact: "09170000002", checkin: "15-02-2026", timeslot: "10:00 AM - 2:00 PM", addguest: "1", paid: "₱803.00", refnum: "EVT-DEMO-402", amountpaid: "₱803.00", paydate: "11/02/2026", transid: "—", addreq: "N/A", paymethod: "GCash" },
  { id: 403, number: "3", venueName: "Single Suites", type: "Event", customer: "Carla Dizon", package: formatEventPackageWithNumber("3", "Single Suites"), total: "₱924.00", downpayment: "₱576.00", balance: "₱334.00", status: "approved", venueNo: "3", price: "₱924.00", email: "carla@email.com", contact: "09170000003", checkin: "16-02-2026", timeslot: "7:00 PM - 10:00 PM", addguest: "0", paid: "₱576.00", refnum: "EVT-DEMO-403", amountpaid: "₱576.00", paydate: "12/02/2026", transid: "—", addreq: "N/A", paymethod: "GCash" },
];

const EVENT_TYPES = ["Birthday", "Wedding", "Corporate", "Anniversary", "Other"];
const SUPERVISORS = ["Juan Dela Cruz", "Maria Santos", "Pedro Reyes"];

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
    completed: "badge-completed",
    "checked-out": "badge-checkedout",
    other: "badge-pending",
  };
  const label = {
    approved: "Approved",
    rejected: "Rejected",
    pending: "Pending",
    occupied: "Occupied",
    completed: "Completed",
    "checked-out": "Checked Out",
    other: "Other",
  };
  const key = (() => {
    const s = String(status || "").toLowerCase();
    if (s === "confirmed") return "approved";
    if (s === "declined" || s === "cancelled") return "rejected";
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

function statusForBadgeFromApi(status) {
  const s = String(status || "").toLowerCase();
  if (s === "occupied") return "occupied";
  if (s === "confirmed" || s === "approved") return "approved";
  if (s === "rejected" || s === "declined") return "rejected";
  if (s === "pending") return "pending";
  if (s === "cancelled") return "rejected";
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
    if (api === "rejected" || api === "declined" || api === "cancelled") return "rejected";
    if (api === "occupied") return "occupied";
    if (api === "approved" || api === "confirmed") return "approved";
    return "other";
  }
  const st = String(row.status || "").toLowerCase();
  if (st === "pending") return "pending";
  if (st === "rejected") return "rejected";
  if (st === "occupied") return "occupied";
  if (st === "approved" || st === "checked-out") return "approved";
  return "other";
}

/** Review visible for pending / approved / occupied; disabled when not pending. */
function showFrontdeskEventReservationReviewButton(row) {
  if (!row) return false;
  const b = eventReservationFilterBucket(row);
  return b === "pending" || b === "approved" || b === "occupied";
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
    paydate: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString("en-PH") : "",
    transid: b.transactionId || "—",
    addreq: b.additionalRequests || "N/A",
    paymethod: b.paymentMethod || "—",
    validIdPhotoData: g.validIdPhotoData || "",
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
function ConfirmDialog({ open, text, onCancel, onConfirm, confirmLabel = "Confirm" }) {
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
          Cancel
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
   DETAILS MODAL (Review)
══════════════════════════════════════════ */
function DetailsModal({ r, open, onClose, onApprove, onReject }) {
  if (!r) return null;
  return (
    <Modal
      open={open && !!r}
      onClose={onClose}
      title="Event reservation"
      size="lg"
      placement="top"
      panelClassName="fd-event-modal fd-event-details-modal"
      bodyClassName="modal-body-scroll"
      footer={
        <div className="modal-footer modal-footer-actions">
          {isFrontdeskBookingPending(r) ? (
            <>
              <button type="button" className="btn-reject" onClick={onReject}>
                Reject
              </button>
              <button type="button" className="btn-approve" onClick={onApprove}>
                Approve
              </button>
            </>
          ) : (
            <button type="button" className="btn-approve" onClick={onClose}>
              Close
            </button>
          )}
        </div>
      }
    >
          <div className="modal-two-col">
            <div className="modal-card">
              <h4 className="modal-card-title">Event Details</h4>
              <div className="detail-list">
                <div><span className="detail-label">Venue No.</span><span className="detail-value">{r.venueNo}</span></div>
                <div><span className="detail-label">Package</span><span className="detail-value">{r.package}</span></div>
                <div><span className="detail-label">Price</span><span className="detail-value">{r.price}</span></div>
                <div><span className="detail-label">Status</span><span className="detail-value">{statusBadge(r.status)}</span></div>
              </div>
            </div>
            <div className="modal-card">
              <h4 className="modal-card-title">Guest Information</h4>
              <div className="detail-list">
                <div><span className="detail-label">Guest</span><span className="detail-value">{r.customer}</span></div>
                <div><span className="detail-label">Email</span><span className="detail-value">{r.email}</span></div>
                <div><span className="detail-label">Contact</span><span className="detail-value">{r.contact}</span></div>
                <div><span className="detail-label">Check-In</span><span className="detail-value">{r.checkin}</span></div>
                <div><span className="detail-label">Time Slot</span><span className="detail-value">{r.timeslot}</span></div>
                <div><span className="detail-label">Estimated Guest</span><span className="detail-value">{r.addguest}</span></div>
              </div>
            </div>
          </div>
          <div className="modal-card">
            <h4 className="modal-card-title">Billing Summary</h4>
            <div className="billing-grid">
              <div><span className="detail-label">Total Amount</span><span className="detail-value">{r.total}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{r.downpayment}</span></div>
              <div><span className="detail-label remaining">Remaining Balance</span><span className="detail-value remaining">{r.balance}</span></div>
              <div><span className="detail-label paid">Total Paid</span><span className="detail-value paid">{r.paid}</span></div>
            </div>
          </div>
          <div className="modal-two-col">
            <div className="modal-col-stack">
              <div className="modal-card"><h4 className="modal-card-title">Reference Number</h4><span className="detail-value">{r.refnum}</span></div>
              <div className="modal-card">
                <h4 className="modal-card-title">Payment Details</h4>
                <div className="detail-list">
                  <div><span className="detail-label">Amount Paid</span><span className="detail-value">{r.amountpaid}</span></div>
                  <div><span className="detail-label">Date</span><span className="detail-value">{r.paydate}</span></div>
                  <div><span className="detail-label">Transaction ID</span><span className="detail-value">{r.transid}</span></div>
                </div>
              </div>
            </div>
            <div className="modal-col-stack">
              <div className="id-uploaded-card">
                <h4 className="id-uploaded-card-title">ID Uploaded</h4>
                <div className="id-uploaded-frame">
                  <img
                    src={r.validIdPhotoData && String(r.validIdPhotoData).startsWith("data:") ? r.validIdPhotoData : IMAGES.guestId}
                    alt="Guest ID"
                    className="id-img"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════
   VIEW MODAL
══════════════════════════════════════════ */
function ViewModal({ r, open, onClose, onEdit }) {
  if (!r) return null;
  return (
    <Modal
      open={open && !!r}
      onClose={onClose}
      title="Event reservation"
      size="lg"
      placement="top"
      panelClassName="fd-event-modal fd-event-details-modal"
      bodyClassName="modal-body-scroll"
      footer={
        <div className="modal-footer modal-footer-actions">
          <button type="button" className="btn-approve" onClick={onEdit}>
            Edit
          </button>
        </div>
      }
    >
          <div className="modal-two-col">
            <div className="modal-card">
              <h4 className="modal-card-title">Event Details</h4>
              <div className="detail-list">
                <div><span className="detail-label">Venue No.</span><span className="detail-value">{r.venueNo}</span></div>
                <div><span className="detail-label">Package</span><span className="detail-value">{r.package}</span></div>
                <div><span className="detail-label">Price</span><span className="detail-value">{r.price}</span></div>
                <div><span className="detail-label">Status</span><span className="detail-value">{statusBadge(r.status)}</span></div>
              </div>
            </div>
            <div className="modal-card">
              <h4 className="modal-card-title">Guest Information</h4>
              <div className="detail-list">
                <div><span className="detail-label">Guest</span><span className="detail-value">{r.customer}</span></div>
                <div><span className="detail-label">Email</span><span className="detail-value">{r.email}</span></div>
                <div><span className="detail-label">Contact</span><span className="detail-value">{r.contact}</span></div>
                <div><span className="detail-label">Check-In</span><span className="detail-value">{r.checkin}</span></div>
                <div><span className="detail-label">Time Slot</span><span className="detail-value">{r.timeslot}</span></div>
                <div><span className="detail-label">Estimated Guest</span><span className="detail-value">{r.addguest}</span></div>
              </div>
            </div>
          </div>
          <div className="modal-card">
            <h4 className="modal-card-title">Billing Summary</h4>
            <div className="billing-grid">
              <div><span className="detail-label">Total Amount</span><span className="detail-value">{r.total}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{r.downpayment}</span></div>
              <div><span className="detail-label remaining">Remaining Balance</span><span className="detail-value remaining">{r.balance}</span></div>
              <div><span className="detail-label paid">Total Paid</span><span className="detail-value paid">{r.paid}</span></div>
            </div>
          </div>
          <div className="modal-two-col">
            <div className="modal-col-stack">
              <div className="modal-card"><h4 className="modal-card-title">Reference Number</h4><span className="detail-value">{r.refnum}</span></div>
              <div className="modal-card">
                <h4 className="modal-card-title">Payment Details</h4>
                <div className="detail-list">
                  <div><span className="detail-label">Amount Paid</span><span className="detail-value">{r.amountpaid}</span></div>
                  <div><span className="detail-label">Date</span><span className="detail-value">{r.paydate}</span></div>
                  <div><span className="detail-label">Transaction ID</span><span className="detail-value">{r.transid}</span></div>
                </div>
              </div>
            </div>
            <div className="modal-col-stack">
              <div className="id-uploaded-card">
                <h4 className="id-uploaded-card-title">ID Uploaded</h4>
                <div className="id-uploaded-frame">
                  <img
                    src={r.validIdPhotoData && String(r.validIdPhotoData).startsWith("data:") ? r.validIdPhotoData : IMAGES.guestId}
                    alt="Guest ID"
                    className="id-img"
                    decoding="async"
                  />
                </div>
              </div>
            </div>
          </div>
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
   CHECK MODAL (Check-In / Check-Out) — same pattern as frontdesk-rooms CheckModal
══════════════════════════════════════════ */
function CheckModal({ open, row, onClose, onCheckin, onCheckout, onAddCharges }) {
  if (!row) return null;
  const isOccupied = String(row.status || "").toLowerCase() === "occupied";
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Check Details"
      size="sm"
      placement="top"
      footer={
        <div className="modal-footer modal-footer-actions">
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
          <div className="check-info-card">
            <h4 className="modal-card-title">Guest Information</h4>
            <div className="check-grid">
              <div><span className="detail-label">Guest</span><span className="detail-value">{row.guest}</span></div>
              <div><span className="detail-label">Date</span><span className="detail-value">{row.date}</span></div>
              <div><span className="detail-label">Balance</span><span className="detail-value">{row.balance}</span></div>
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
              <div><span className="detail-label">Balance</span><span className="detail-value">{row.balance}</span></div>
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
   ADD CHARGES MODAL
══════════════════════════════════════════ */
function AddChargesModal({ open, onClose, onAddItem }) {
  const [item, setItem] = useState("");
  const [amount, setAmount] = useState("");
  const [qty, setQty] = useState(1);
  const [chargeItems, setChargeItems] = useState([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const previewTotal = chargeItems.reduce((s, c) => s + c.amount * c.qty, 0) + (item && parseFloat(amount) > 0 ? parseFloat(amount) * qty : 0);
  if (!open) return null;

  const changeQty = (i, d) => setChargeItems((prev) => prev.map((c, idx) => idx === i ? { ...c, qty: Math.max(1, c.qty + d) } : c));
  const remove = (i) => setChargeItems((prev) => prev.filter((_, idx) => idx !== i));
  const clear = () => { setItem(""); setAmount(""); setQty(1); };

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
        title="Add Additional Request"
        size="md"
        placement="top"
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
                  <input type="text" className="charges-input" placeholder="e.g. towel, shampoo" value={item} onChange={(e) => setItem(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="detail-label">Amount</label>
                  <input type="text" className="charges-input" placeholder="e.g. 50" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="detail-label">Quantity</label>
                  <input type="number" className="charges-input" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} />
                </div>
              </div>
              <div className="charges-list-wrap">
                <div className="charges-list-header">Item</div>
                <div className="charges-list">
                  {chargeItems.map((c, i) => (
                    <div key={i} className="charge-item-row">
                      <span className="charge-item-name">{c.item}<br /><small>₱{c.amount.toFixed(2)}</small></span>
                      <div className="charge-qty-ctrl">
                        <button onClick={() => changeQty(i, -1)}>−</button>
                        <span>{c.qty}</span>
                        <button onClick={() => changeQty(i, 1)}>+</button>
                        <button className="charge-remove" onClick={() => remove(i)}>✕</button>
                      </div>
                    </div>
                  ))}
                  {item && parseFloat(amount) > 0 && (
                    <div className="charge-item-row charge-preview-row" style={{ opacity: 0.6 }}>
                      <span className="charge-item-name">{item}<br /><small>₱{parseFloat(amount).toFixed(2)}</small></span>
                      <span className="charge-qty-ctrl">× {qty}</span>
                    </div>
                  )}
                </div>
                <div className="charges-total-row">
                  <span>Total</span>
                  <span>₱{previewTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
      </Modal>
      <ConfirmDialog open={showConfirm} text="Add Item?" onCancel={() => setShowConfirm(false)} onConfirm={doAdd} />
    </>
  );
}

/* ══════════════════════════════════════════
   WALK-IN MODAL
══════════════════════════════════════════ */
const WALKIN_EVENT_FALLBACK = [
  { id: "", name: "Mini Sky Bar", eventNum: "EV001" },
  { id: "", name: "Function Hall", eventNum: "EV002" },
  { id: "", name: "Garden Venue", eventNum: "EV003" },
  { id: "", name: "Grand Ballroom", eventNum: "EV004" },
];

function WalkinModal({ open, onClose, onSubmit }) {
  const emptyForm = { package: "", returning: "", eventname: "", eventtype: "", date: "", timeslot: "", guest: "", bookby: "", contact: "", address: "", supervisor: "", totalcost: "", requests: "", payment: "cash" };
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [idPreview, setIdPreview] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [payForm, setPayForm] = useState({ amountpaid: "", paydate: "", transid: "", proof: null });
  const [payErrors, setPayErrors] = useState({});
  const [proofPreview, setProofPreview] = useState(null);
  const [venueCatalog, setVenueCatalog] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [wiLoading, setWiLoading] = useState(false);
  const [wiLoadErr, setWiLoadErr] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setP = (k, v) => setPayForm((f) => ({ ...f, [k]: v }));

  const venueOptions = useMemo(() => {
    const fromApi = (venueCatalog || [])
      .map((v) => ({
        id: String(v.id ?? "").trim(),
        label: `${String(v.name ?? v.title ?? v.package ?? "Venue").trim()} - ${formatStoredEventNumberForDisplay(v.eventNum)}`,
      }))
      .filter((r) => r.id);
    const base = fromApi.length
      ? fromApi
      : WALKIN_EVENT_FALLBACK.map((v) => ({
          id: v.id,
          label: `${v.name} - ${formatStoredEventNumberForDisplay(v.eventNum)}`,
        }));
    const d = form.date;
    if (!d) return base;
    return base.filter((row) => {
      if (!row.id) return true;
      return isVenueAvailableForDates(row.id, d, d, bookedRanges);
    });
  }, [venueCatalog, bookedRanges, form.date]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    (async () => {
      setWiLoading(true);
      setWiLoadErr("");
      try {
        let venues = [];
        if (getStoredAuthToken()) {
          try {
            venues = await fetchEventVenuesBackend();
          } catch {
            venues = [];
          }
        }
        let ranges = [];
        if (getStoredAuthToken()) {
          const list = await fetchBookingsBackend().catch(() => []);
          if (Array.isArray(list)) ranges = eventBookedRangesFromBookings(list);
        }
        if (!cancelled) {
          setVenueCatalog(Array.isArray(venues) ? venues : []);
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
    if (!form.package) return;
    const ok = venueOptions.some((o) => o.label === form.package);
    if (!ok) setForm((f) => ({ ...f, package: "" }));
  }, [venueOptions, form.package]);

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

  const handleProofFile = (e) => {
    const f = e.target.files?.[0];
    if (!f || (f.type && !f.type.startsWith("image/"))) return;
    setProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(f);
    });
    setPayForm((p) => ({ ...p, proof: f }));
    setPayErrors((er) => ({ ...er, proof: "" }));
  };

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

  const handleIdFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setIdPreview(ev.target.result);
    reader.readAsDataURL(file);
    setErrors((er) => ({ ...er, id: "" }));
  };

  const validate = () => {
    const errs = {};
    if (!form.package) errs.package = "Please select a venue.";
    if (!form.eventname.trim()) errs.eventname = "Event name is required.";
    if (!form.eventtype) errs.eventtype = "Please select event type.";
    if (!form.date) errs.date = "Date is required.";
    if (!form.timeslot.trim()) errs.timeslot = "Time slot is required.";
    if (!form.guest.trim()) errs.guest = "Guest name is required.";
    if (!form.bookby.trim()) errs.bookby = "Book by is required.";
    if (!form.contact.trim()) errs.contact = "Contact number is required.";
    if (!form.supervisor) errs.supervisor = "Please select a supervisor.";
    return errs;
  };

  const handleSubmitClick = () => {
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (form.payment === "gcash") {
      const pe = validatePayment();
      setPayErrors(pe);
      if (Object.keys(pe).length) return;
    }
    /* Hide GCash sheet so it does not sit above the confirm overlay (z-index 10001 vs 10000). */
    setShowPayment(false);
    setShowConfirm(true);
  };

  const doSubmit = () => {
    setShowConfirm(false);
    const paidNum = form.payment === "gcash"
      ? parseFloat(String(payForm.amountpaid).replace(/[^0-9.]/g, "")) || 0
      : 0;
    let totalNum = parseFloat(String(form.totalcost).replace(/[^0-9.]/g, "")) || 0;
    if (!totalNum && paidNum) totalNum = paidNum;
    const downNum = paidNum;
    const balNum = Math.max(0, totalNum - downNum);
    const opt = venueOptions.find((o) => o.label === form.package);
    const eventVenueId = opt?.id ? String(opt.id) : "";
    const { eventno, venueLabel } = splitWalkinEventSelection(form.package);
    const pkgFormatted = formatEventPackageWithNumber(eventno, venueLabel, venueLabel);
    onSubmit({
      type: "Event",
      customer: form.guest,
      package: pkgFormatted,
      venueName: venueLabel,
      eventVenueId,
      total: fmt(totalNum), downpayment: fmt(downNum), balance: fmt(balNum),
      status: "pending", venueNo: eventno !== "—" ? eventno : String(Date.now()).slice(-2),
      price: fmt(totalNum), email: "", contact: form.contact,
      checkin: form.date, timeslot: form.timeslot,
      addguest: "0", paid: fmt(downNum),
      refnum: "ABR-EVENT-" + Date.now(),
      amountpaid: fmt(downNum), paydate: payForm.paydate,
      transid: payForm.transid, addreq: form.requests || "N/A",
    });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setForm(emptyForm);
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
    if (!payForm.proof) errs.proof = "Please upload proof.";
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
    setErrors({});
    clearPayForm();
    setForm(emptyForm);
    setIdPreview(null);
    onClose();
  }

  useEffect(() => {
    if (open) return;
    setShowConfirm(false);
    setShowSuccess(false);
    setShowPayment(false);
    setPayQrMissing(false);
    setPayErrors({});
    setProofPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPayForm({ amountpaid: "", paydate: "", transid: "", proof: null });
    setForm(emptyForm);
    setIdPreview(null);
    setErrors({});
  }, [open]);

  if (!open && !showConfirm && !showSuccess) return null;

  return (
    <>
      {open && !showConfirm && !showSuccess && (
      <div className="wi-backdrop active" onClick={(e) => e.target === e.currentTarget && dismissWalkin()}>
        <div className="wi-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wi-header">
            <h2 className="wi-title">Add Reservation</h2>
            <button type="button" className="wi-close" onClick={dismissWalkin}>✕</button>
          </div>
          <div className="wi-body">
            <div className="wi-row">
              <div className="wi-group full">
                <label>Select Venue <span className="wi-req">*</span></label>
                {wiLoadErr ? <p className="wi-err" style={{ margin: "0 0 6px" }}>{wiLoadErr}</p> : null}
                <p className="wi-payment-sub" style={{ margin: "0 0 8px", fontSize: "12px" }}>
                  {wiLoading ? "Loading venues and bookings…" : "Venues update from your catalog and current event bookings. Choose the event date to hide venues already booked that day."}
                </p>
                <div className="wi-select-wrap">
                  <select
                    className={`wi-input${errors.package ? " wi-input-error" : ""}`}
                    value={form.package}
                    onChange={(e) => set("package", e.target.value)}
                    disabled={wiLoading}
                  >
                    <option value="">Select venue</option>
                    {venueOptions.map((o) => (
                      <option key={`${o.id}|${o.label}`} value={o.label}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {!wiLoading && venueOptions.length === 0 && form.date ? (
                  <span className="wi-err">No venues available for this date — pick another day.</span>
                ) : null}
                {errors.package && <span className="wi-err">{errors.package}</span>}
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group full">
                <label>Returning Customer?</label>
                <div className="wi-search-row">
                  <input type="text" className="wi-input" placeholder="Search by name, email, or phone number" value={form.returning} onChange={(e) => set("returning", e.target.value)} />
                  <button className="wi-search-btn">Search</button>
                </div>
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Event Name <span className="wi-req">*</span></label>
                <input type="text" className={`wi-input${errors.eventname ? " wi-input-error" : ""}`} placeholder="Event Name" value={form.eventname} onChange={(e) => set("eventname", e.target.value)} />
                {errors.eventname && <span className="wi-err">{errors.eventname}</span>}
              </div>
              <div className="wi-group">
                <label>Event Type <span className="wi-req">*</span></label>
                <div className="wi-select-wrap">
                  <select className="wi-input" value={form.eventtype} onChange={(e) => set("eventtype", e.target.value)}>
                    <option value="">Event Type</option>
                    {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {errors.eventtype && <span className="wi-err">{errors.eventtype}</span>}
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Date <span className="wi-req">*</span></label>
                <input type="date" className="wi-input" value={form.date} onChange={(e) => set("date", e.target.value)} />
                {errors.date && <span className="wi-err">{errors.date}</span>}
              </div>
              <div className="wi-group">
                <label>Time Slot <span className="wi-req">*</span></label>
                <input type="text" className={`wi-input${errors.timeslot ? " wi-input-error" : ""}`} placeholder="Time" value={form.timeslot} onChange={(e) => set("timeslot", e.target.value)} />
                {errors.timeslot && <span className="wi-err">{errors.timeslot}</span>}
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Guest <span className="wi-req">*</span></label>
                <input type="text" className={`wi-input${errors.guest ? " wi-input-error" : ""}`} placeholder="Guest" value={form.guest} onChange={(e) => set("guest", e.target.value)} />
                {errors.guest && <span className="wi-err">{errors.guest}</span>}
              </div>
              <div className="wi-group">
                <label>Book By <span className="wi-req">*</span></label>
                <input type="text" className={`wi-input${errors.bookby ? " wi-input-error" : ""}`} placeholder="Book by" value={form.bookby} onChange={(e) => set("bookby", e.target.value)} />
                {errors.bookby && <span className="wi-err">{errors.bookby}</span>}
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Contact Number <span className="wi-req">*</span></label>
                <input type="text" className={`wi-input${errors.contact ? " wi-input-error" : ""}`} placeholder="Contact Number" value={form.contact} onChange={(e) => set("contact", e.target.value)} />
                {errors.contact && <span className="wi-err">{errors.contact}</span>}
              </div>
              <div className="wi-group">
                <label>Address</label>
                <input type="text" className="wi-input" placeholder="Address" value={form.address} onChange={(e) => set("address", e.target.value)} />
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Select Supervisor <span className="wi-req">*</span></label>
                <div className="wi-select-wrap">
                  <select className="wi-input" value={form.supervisor} onChange={(e) => set("supervisor", e.target.value)}>
                    <option value="">Supervisor Name</option>
                    {SUPERVISORS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {errors.supervisor && <span className="wi-err">{errors.supervisor}</span>}
              </div>
              <div className="wi-group">
                <label>Total Cost</label>
                <input type="number" className="wi-input" placeholder="0" min="0" value={form.totalcost} onChange={(e) => set("totalcost", e.target.value)} />
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Upload ID <span className="wi-req">*</span></label>
                <label className="wi-upload">
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleIdFile} />
                  {idPreview
                    ? <img src={idPreview} className="wi-upload-preview" alt="ID" />
                    : <div className="wi-upload-inner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="12" cy="10" r="3" /><path d="M7 21v-1a5 5 0 0 1 10 0v1" /></svg>
                        <span>Click to upload ID image</span>
                      </div>
                  }
                </label>
                {errors.id && <span className="wi-err">{errors.id}</span>}
              </div>
              <div className="wi-group">
                <label>Additional Requests</label>
                <textarea className="wi-input wi-textarea" placeholder="Additional Requests" value={form.requests} onChange={(e) => set("requests", e.target.value)} />
              </div>
            </div>
            <div className="wi-payment-block">
              <div className="wi-payment-heading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                <strong>Payment Options</strong>
              </div>
              <p className="wi-payment-sub">Pay with cash on arrival, or choose GCash to scan and complete the payment form. A deposit may be required per venue policy.</p>
              <div className="wi-payment-opts">
                <label className={`wi-pay-card${form.payment === "cash" ? " selected" : ""}`} onClick={() => selectPayment("cash")}>
                  <input type="radio" name="wi-payment" value="cash" checked={form.payment === "cash"} onChange={() => {}} readOnly />
                  <div className="wi-pay-inner">
                    <CashPayIcon />
                    <strong>Cash</strong>
                    <span>Pay at the venue — no online form needed</span>
                  </div>
                </label>
                <label className={`wi-pay-card${form.payment === "gcash" ? " selected" : ""}`} onClick={() => selectPayment("gcash")}>
                  <input type="radio" name="wi-payment" value="gcash" checked={form.payment === "gcash"} onChange={() => {}} readOnly />
                  <div className="wi-pay-inner">
                    <div className="wi-payment-gcash-icon-wrap">
                      <img
                        src={IMAGES.gcashCard}
                        alt="GCash"
                        className="wi-payment-logo-gcash"
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
            <div className="wi-actions">
              <button type="button" className="wi-btn-clear" onClick={() => { setForm(emptyForm); setIdPreview(null); setErrors({}); setShowPayment(false); clearPayForm(); }}>Clear</button>
              <button type="button" className="wi-btn-submit" onClick={handleSubmitClick}>Submit Reservation</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {open && showPayment && (
        <div className="wi-backdrop active" style={{ zIndex: 10001 }} onClick={(e) => e.target === e.currentTarget && closePayModal()}>
          <div className="wi-modal wi-payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="wi-header">
              <h2 className="wi-title">GCash Payment</h2>
              <button type="button" className="wi-close" onClick={closePayModal}>✕</button>
            </div>
            <div className="wi-body wi-payment-body">
              <div className="wi-qr-side">
                <div className="wi-payment-qr-brand">
                  <div className={`wi-qr-payment-frame${payQrMissing ? " wi-qr-payment-frame--empty" : ""}`}>
                    {!payQrMissing && (
                      <img
                        src={IMAGES.gcashPaymentQr}
                        alt="GCash QR code"
                        className="wi-qr-img wi-qr-img-payment"
                        decoding="async"
                        onError={() => setPayQrMissing(true)}
                      />
                    )}
                    {payQrMissing && (
                      <div className="wi-qr-payment-placeholder" aria-hidden>
                        <span className="wi-qr-payment-placeholder-label">QR code</span>
                      </div>
                    )}
                  </div>
                  <p className="wi-qr-name">GCash</p>
                </div>
                <p className="wi-qr-handle">@Abela Suites</p>
              </div>
              <div className="wi-pay-form-side">
                <h3 className="wi-pay-form-title">Fill this Form</h3>
                <div className="wi-row">
                  <div className="wi-group">
                    <label>Amount Paid <span className="wi-req">*</span></label>
                    <input type="text" className="wi-input" placeholder="e.g. 1,666" value={payForm.amountpaid} onChange={(e) => setP("amountpaid", e.target.value)} />
                    {payErrors.amountpaid && <span className="wi-err">{payErrors.amountpaid}</span>}
                  </div>
                  <div className="wi-group">
                    <label>Date <span className="wi-req">*</span></label>
                    <input type="date" className="wi-input" value={payForm.paydate} onChange={(e) => setP("paydate", e.target.value)} />
                    {payErrors.paydate && <span className="wi-err">{payErrors.paydate}</span>}
                  </div>
                </div>
                <div className="wi-group" style={{ marginTop: 8 }}>
                  <label>Transaction ID <span className="wi-req">*</span></label>
                  <input type="text" className="wi-input" placeholder="Enter transaction ID" value={payForm.transid} onChange={(e) => setP("transid", e.target.value)} />
                  {payErrors.transid && <span className="wi-err">{payErrors.transid}</span>}
                </div>
                <div className="wi-group" style={{ marginTop: 8 }}>
                  <label>Proof of Payment <span className="wi-req">*</span></label>
                  <label className="wi-upload wi-proof-upload">
                    <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleProofFile} />
                    {payForm.proof && proofPreview ? (
                      <div className="wi-proof-preview-wrap">
                        <img src={proofPreview} alt="Proof of payment preview" className="wi-upload-preview wi-proof-preview-img" />
                        <span className="wi-proof-filename">{payForm.proof.name}</span>
                      </div>
                    ) : (
                      <div className="wi-upload-inner">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                        <span>Upload your proof of payment here...</span>
                      </div>
                    )}
                  </label>
                  {payErrors.proof && <span className="wi-err">{payErrors.proof}</span>}
                </div>
                <div className="wi-actions" style={{ marginTop: 14 }}>
                  <button type="button" className="wi-btn-clear" onClick={clearPayForm}>Clear</button>
                  <button type="button" className="wi-btn-submit" onClick={submitPayment}>Submit</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="wi-center-overlay" style={{ display: "flex" }}>
          <div className="wi-confirm-box">
            <div className="wi-confirm-icon">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /></svg>
              <span className="wi-confirm-exclaim">!</span>
            </div>
            <p className="wi-confirm-text">Submit Reservation?</p>
            <div className="wi-confirm-btns">
              <button type="button" className="wi-btn-cancel" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button type="button" className="wi-btn-ok" onClick={doSubmit}>Submit</button>
            </div>
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
function EventReservation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [tab, setTab] = useState("reservation");
  /** Reservation tab: `all` | `pending` | `approved` | `rejected` | `occupied` — same as Rooms. */
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({ visible: false, msg: "", type: "approved" });

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveConfirm, setApproveConfirm] = useState(false);
  const [checkinConfirm, setCheckinConfirm] = useState(false);
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);
  const [addChargesOpen, setAddChargesOpen] = useState(false);
  const [walkinOpen, setWalkinOpen] = useState(false);
  const [reservationsLoad, setReservationsLoad] = useState(false);
  const [reservationsErr, setReservationsErr] = useState("");
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
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  const notifRef = useRef(null);
  const userRef = useRef(null);
  /** Latest venue id → eventNum map from API (for mapping patched bookings). */
  const venueMapRef = useRef(new Map());
  const venueNameMapRef = useRef(new Map());
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { topbarProfile } = useTopbarUserProfile("frontdesk");
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
          if (api === "completed") return false;
          const s = String(r.status || "").toLowerCase();
          if (s === "pending" || s === "rejected") return false;
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

  useEffect(() => {
    if (!checkRow) setAddChargesOpen(false);
  }, [checkRow]);

  const applyNotificationBookingNavigation = useCallback(
    (notif) => {
      const bookingId = String(notif?.bookingId || "").trim();
      if (!bookingId) return;
      const path = getFrontdeskNotificationBookingPath(notif);
      setNotifOpen(false);
      setUserOpen(false);
      if (!path) return;
      if (path.includes("/frontdesk-events")) {
        const row = reservations.find((r) => mongoIdFromRow(r) === bookingId);
        if (row) {
          setTab("reservation");
          setCurrentId(row.id);
          setDetailsRow(row);
          setDetailsOpen(true);
          setRejectOpen(false);
          setApproveConfirm(false);
          navigate("/frontdesk-events", { replace: true });
          return;
        }
      }
      navigate(path);
    },
    [navigate, reservations],
  );

  const loadReservationsFromApi = useCallback(async () => {
    setReservationsLoad(true);
    setReservationsErr("");
    if (!getStoredAuthToken()) {
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
    const onToken = () => loadReservationsFromApi();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onToken);
  }, [loadReservationsFromApi]);

  useEffect(() => {
    function handleClick(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

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
    setReservations((prev) => prev.map((r) => String(r.id) === String(updated.id) ? updated : r));
    setEditOpen(false); setViewOpen(true);
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
    setCheckoutConfirm(false);
    setAddChargesOpen(false);
    setCheckRow(null);
    showToast("Guest Checked Out!", "approved");
    navigate("/frontdesk-history");
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
    const chargeLine = items.map((c) => `${c.item} (₱${Number(c.amount).toFixed(2)})`).join(", ");
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

  const handleWalkinSubmit = (data) => {
    const newId = reservations.length + 1;
    setReservations((prev) => [...prev, { ...data, id: newId, number: String(newId), _walkin: true }]);
    setWalkinOpen(false); setTab("reservation");
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

  const q = search.toLowerCase();
  const filteredRes = reservations.filter((r) => {
    const api = String(r._apiStatus || "").toLowerCase();
    const st = String(r.status || "").toLowerCase();
    if (api === "completed" || st === "completed") return false;
    if (reservationStatusFilter !== "all") {
      if (eventReservationFilterBucket(r) !== reservationStatusFilter) return false;
    }
    return [r.customer, r.package, String(r.id), r.email, r.contact, r.refnum, r.venueName, r.checkin, r.timeslot]
      .some((v) => String(v ?? "").toLowerCase().includes(q));
  });
  const filteredGuestRows = guestRows.filter((g) =>
    [g.guest, g.customer, g.package, String(g.number), g.venueNo, g.venueno, g.venueName, g.refnum, g.email, g.checkin, g.timeslot]
      .some((v) => String(v ?? "").toLowerCase().includes(q)),
  );

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
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setUserOpen(false);
                setNotifOpen((o) => {
                  if (!o) void markStaffNotificationsSeen();
                  return !o;
                });
              }}
              notifications={displayNotifications}
              dot={pendingCount > 0 ? "active" : null}
              dotTitle="Pending or unread alerts"
              onItemClick={(n) => {
                setNotifOpen(false);
                setUserOpen(false);
                openStaffNotification(n);
              }}
            />
            <div
              className="icon-btn"
              ref={userRef}
              onClick={(e) => {
                e.stopPropagation();
                setNotifOpen(false);
                setUserOpen((o) => !o);
              }}
            >
              <TopbarUserIcon />
              <span
                className="user-arrow"
                style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.frontdesk.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
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
                Reserved Guest
              </button>
            </div>
            <button type="button" className="rooms-walkin-btn" onClick={() => setWalkinOpen(true)}>
              <PlusUserIcon />
              Walk-in Reservation
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

          {/* RESERVATION TABLE */}
          {tab === "reservation" && (
            <div className="rooms-table-scroll-wrap">
              <table className="rooms-table">
                <thead>
                  <tr>
                    <th className="rooms-th-nowrap">Number</th>
                    <th>Type</th>
                    <th className="rooms-th-customer">Customer</th>
                    <th>Package</th>
                    <th className="rooms-th-num">Total</th>
                    <th className="rooms-th-num">Downpayment</th>
                    <th className="rooms-th-num">Balance</th>
                    <th className="rooms-th-status">Status</th>
                    <th className="rooms-th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRes.length === 0 ? (
                    <tr>
                      <td colSpan={9} style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>
                        No reservations found.
                      </td>
                    </tr>
                  ) : (
                  filteredRes.map((r) => (
                    <tr key={String(r.id)}>
                      <td className="rooms-td-nowrap">{formatStoredEventNumberForDisplay(r.number ?? r.refnum ?? r.id)}</td>
                      <td>{r.type}</td>
                      <td className="rooms-td-customer" title={String(r.customer ?? "")}>{r.customer}</td>
                      <td>{r.package}</td>
                      <td className="rooms-td-num">{r.total}</td>
                      <td className="rooms-td-num">{r.downpayment}</td>
                      <td className="rooms-td-num">{r.balance}</td>
                      <td className="rooms-td-status"><ReservationBadge status={r.status} /></td>
                      <td className="rooms-td-action">
                        <div className="rooms-action-cell rooms-action-cell--trailing">
                          <div className="rooms-action-lead rooms-action-lead--review">
                            {showFrontdeskEventReservationReviewButton(r) ? (
                              <button
                                type="button"
                                className="rooms-action-btn rooms-review-btn"
                                disabled={!isFrontdeskBookingPending(r)}
                                title={
                                  isFrontdeskBookingPending(r)
                                    ? undefined
                                    : "Already approved — use View to open this reservation"
                                }
                                onClick={() => {
                                  if (!isFrontdeskBookingPending(r)) return;
                                  setDetailsRow(r);
                                  setCurrentId(r.id);
                                  setDetailsOpen(true);
                                }}
                              >
                                Review
                              </button>
                            ) : null}
                          </div>
                          <button
                            type="button"
                            className="rooms-action-btn rooms-view-btn"
                            onClick={() => { setCurrentId(r.id); setViewOpen(true); }}
                          >
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* GUEST — same 6 data columns as product reference: Package through Action (Check In|Out + View only). */}
          {tab === "guest" && (
            <div className="rooms-table-scroll-wrap">
              <table className="rooms-table rooms-table--guest">
                <thead>
                  <tr>
                    <th>Package</th>
                    <th className="rooms-th-num">Total</th>
                    <th className="rooms-th-num">Downpayment</th>
                    <th className="rooms-th-num">Balance</th>
                    <th className="rooms-th-status">Status</th>
                    <th className="rooms-th-action">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuestRows.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>
                        No approved guests yet. Approve a reservation on the Reservation tab first.
                      </td>
                    </tr>
                  ) : filteredGuestRows.map((g) => {
                    const isOccupied = String(g.status || "").toLowerCase() === "occupied";
                    return (
                      <tr key={eventRowMatchKey(g)}>
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
                            <button
                              type="button"
                              className="rooms-action-btn rooms-view-btn"
                              onClick={() => setGuestViewRow(g)}
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* PAGINATION */}
          <div className="rooms-pagination-row">
            <span className="rooms-pagination-info">
              Showing {tab === "reservation" ? filteredRes.length : filteredGuestRows.length} of {tab === "reservation" ? reservations.length : guestRows.length} reservations
            </span>
            <div className="rooms-pagination-btns">
              <span className="rooms-pg-btn">Prev</span>
              <span className="rooms-pg-sep">Page 1 of 1</span>
              <span className="rooms-pg-btn">Next</span>
            </div>
          </div>
        </main>
      </RailPortalShell>

      {/* ── MODALS ── */}
      <DetailsModal
        r={detailsRow}
        open={detailsOpen}
        onClose={() => { setDetailsOpen(false); setDetailsRow(null); }}
        onApprove={() => setApproveConfirm(true)}
        onReject={() => setRejectOpen(true)}
      />

      <ConfirmDialog open={approveConfirm} text="Approve Reservation?"
        onCancel={() => setApproveConfirm(false)} onConfirm={handleApprove} />

      <RejectModal open={rejectOpen} onClose={() => setRejectOpen(false)} onSubmit={handleReject} />

      <ViewModal r={curRes} open={viewOpen} onClose={() => setViewOpen(false)}
        onEdit={() => { setViewOpen(false); setEditOpen(true); }} />

      {editOpen && (
        <EditModal r={curRes} open={editOpen}
          onClose={() => { setEditOpen(false); setViewOpen(true); }}
          onSave={handleEditSave}
          onCancel={() => { setEditOpen(false); setViewOpen(true); }}
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

      <ConfirmDialog open={checkinConfirm} text="Confirm Check-In?"
        onCancel={() => setCheckinConfirm(false)} onConfirm={handleCheckin} />
      <ConfirmDialog open={checkoutConfirm} text="Confirm Check-Out?"
        onCancel={() => setCheckoutConfirm(false)} onConfirm={handleCheckout} />

      <AddChargesModal open={addChargesOpen} onClose={() => setAddChargesOpen(false)} onAddItem={handleAddItem} />

      <WalkinModal open={walkinOpen} onClose={() => setWalkinOpen(false)} onSubmit={handleWalkinSubmit} />

      <StaffNotificationDetailModal
        notification={staffNotification}
        onClose={closeStaffNotification}
        onOpenReservation={(n) => {
          applyNotificationBookingNavigation(n);
          closeStaffNotification();
        }}
      />

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

export default EventReservation;