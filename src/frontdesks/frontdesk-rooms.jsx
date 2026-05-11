import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TopbarUserIcon } from "./frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
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
  fetchRoomsCatalog,
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
  buildRoomIdToNumberMap,
  formatRoomPackageWithNumber,
  formatRoomTableNumber,
  formatStoredRoomNumberForDisplay,
  packageLabelForReservedGuestRow,
} from "../guests/bookingRoomDisplay";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { isRoomAvailableForDates, roomBookedRangesFromBookings } from "../guests/guestAvailability";
import "../guests/idUploadedCard.css";
import "./frontdesk-rooms.css";

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
  if (s === "cancelled") return "rejected";
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

/** Review column: show for pending / approved / occupied; not for rejected or unknown. */
function showFrontdeskReservationReviewButton(row) {
  if (!row) return false;
  const b = reservationFilterBucket(row);
  return b === "pending" || b === "approved" || b === "occupied";
}

/** Status bucket for reservation tab filters (Pending / Approved / Rejected / Occupied). */
function reservationFilterBucket(row) {
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

/** Parse ISO or dd-mm-yyyy stay dates for night count. */
function parseStayDateMs(s) {
  const str = String(s || "").trim();
  if (!str || str === "—") return NaN;
  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) return iso;
  const m = str.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
  return NaN;
}

/** e.g. "2 nights" — room stays only (events use time slots instead). */
function nightsStayLabel(checkin, checkout) {
  const t0 = parseStayDateMs(checkin);
  const t1 = parseStayDateMs(checkout);
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) return "—";
  const days = Math.ceil((t1 - t0) / 86400000);
  const n = Math.max(0, days);
  if (n === 0) return "Same day";
  return `${n} night${n === 1 ? "" : "s"}`;
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
    roomno: displayRoom,
    price: fmtPeso(total),
    checkin: b.checkIn || "—",
    checkout: b.checkOut || "—",
    addguest: String(b.additionalGuests ?? 0),
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

// ─── BADGE ───────────────────────────────────────────────────
function Badge({ status }) {
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
  return <span className={`badge ${map[status] || ""}`}>{label[status] || status}</span>;
}

// ─── CONFIRM DIALOG ──────────────────────────────────────────
function ConfirmDialog({ open, text, onCancel, onConfirm, isSuccess, cancelLabel = "Cancel", confirmLabel = "Confirm" }) {
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
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={isSuccess ? "#27ae60" : "#e74c3c"} strokeWidth="1.8">
          <circle cx="12" cy="12" r="10" />
        </svg>
        {isSuccess ? (
          <span style={{ position: "absolute", fontSize: 32, fontWeight: 900, color: "#27ae60", left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            ✓
          </span>
        ) : (
          <span className="confirm-exclaim">!</span>
        )}
      </div>
      <p className="confirm-text">{text}</p>
      {!isSuccess && (
        <div className="confirm-btns">
          <button type="button" className="btn-confirm-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className="btn-confirm-submit" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      )}
    </Modal>
  );
}

// ─── DETAILS MODAL (Reservation) ────────────────────────────
function DetailsModal({ open, row, onClose, onApprove, onReject }) {
  const idPhotoData = useLazyBookingIdPhoto({
    open: open && !!row,
    bookingId: row?._bookingId,
    rowPhoto: row?.validIdPhotoData,
  });
  if (!row) return null;
  const roomType = roomTitleFromPackageField(row.package);
  const idSrc =
    idPhotoData && String(idPhotoData).startsWith("data:")
      ? idPhotoData
      : IMAGES.guestId;
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Reservation Details"
      size="lg"
      placement="top"
      panelClassName="fd-room-modal fd-room-details-modal"
      bodyClassName="modal-body-scroll"
    >
          <div className="modal-two-col fd-details-hero">
            <div className="modal-card">
              <h4 className="modal-card-title">Room Details</h4>
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Room No.</span>
                  <span className="detail-value">{row.roomno}</span>
                </div>
                <div>
                  <span className="detail-label">Package</span>
                  <span className="detail-value">{roomType}</span>
                </div>
                <div>
                  <span className="detail-label">Price</span>
                  <span className="detail-value">{row.price}</span>
                </div>
                <div>
                  <span className="detail-label">Status</span>
                  <span className="detail-value detail-value--badge">
                    <Badge status={row.status} />
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-card">
              <h4 className="modal-card-title">Guest Information</h4>
              <div className="detail-list">
                <div><span className="detail-label">Guest</span><span className="detail-value">{row.customer}</span></div>
                <div><span className="detail-label">Email</span><span className="detail-value">{row.email}</span></div>
                <div><span className="detail-label">Contact</span><span className="detail-value">{row.contact}</span></div>
                <div><span className="detail-label">Check-In</span><span className="detail-value">{row.checkin}</span></div>
                <div><span className="detail-label">Check-Out</span><span className="detail-value">{row.checkout}</span></div>
                <div><span className="detail-label">Additional Guest</span><span className="detail-value">{row.addguest}</span></div>
              </div>
            </div>
          </div>
          <div className="modal-card fd-billing-summary-card">
            <h4 className="modal-card-title">Billing Summary</h4>
            <div className="billing-grid">
              <div><span className="detail-label">Total Amount</span><span className="detail-value">{row.total}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{row.downpayment}</span></div>
              <div><span className="detail-label remaining">Remaining Balance</span><span className="detail-value remaining">{row.balance}</span></div>
              <div><span className="detail-label paid">Total Paid</span><span className="detail-value paid">{row.paid}</span></div>
            </div>
          </div>
          <div className="modal-two-col fd-details-mid">
            <div className="modal-card">
              <h4 className="modal-card-title">Reference Number</h4>
              <span className="detail-value detail-value--ref">{row.refnum}</span>
            </div>
            <div className="modal-card">
              <h4 className="modal-card-title">Additional Request</h4>
              <span className="detail-value">{row.addreq && String(row.addreq).trim() ? row.addreq : "N/A"}</span>
            </div>
          </div>
          <div className="modal-two-col fd-details-payment">
            <div className="modal-card">
              <h4 className="modal-card-title">Payment Details</h4>
              <div className="detail-grid detail-grid--payment-block">
                <div><span className="detail-label">Amount Paid</span><span className="detail-value">{row.amountpaid}</span></div>
                <div><span className="detail-label">Date</span><span className="detail-value">{row.paydate}</span></div>
                <div className="detail-grid__full">
                  <span className="detail-label">Transaction ID</span>
                  <span className="detail-value">{row.transid}</span>
                </div>
              </div>
            </div>
            <div className="modal-card id-card">
              <h4 className="modal-card-title">ID Uploaded</h4>
              <img src={idSrc} alt="Guest ID" className="id-img" decoding="async" />
            </div>
          </div>
          <div className="modal-footer modal-footer-actions fd-room-details-actions">
            {isFrontdeskBookingPending(row) ? (
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
    </Modal>
  );
}

// ─── VIEW MODAL (Read-only + Edit) ──────────────────────────
function ViewModal({ open, row, onClose, onEdit }) {
  const idPhotoData = useLazyBookingIdPhoto({
    open: open && !!row,
    bookingId: row?._bookingId,
    rowPhoto: row?.validIdPhotoData,
  });
  if (!row) return null;
  const roomType = roomTitleFromPackageField(row.package);
  const idSrc =
    idPhotoData && String(idPhotoData).startsWith("data:")
      ? idPhotoData
      : IMAGES.guestId;
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Reservation Details"
      size="lg"
      placement="top"
      panelClassName="fd-room-modal fd-room-details-modal"
      bodyClassName="modal-body-scroll"
    >
          <div className="modal-two-col fd-details-hero">
            <div className="modal-card">
              <h4 className="modal-card-title">Room Details</h4>
              <div className="detail-grid">
                <div>
                  <span className="detail-label">Room No.</span>
                  <span className="detail-value">{row.roomno}</span>
                </div>
                <div>
                  <span className="detail-label">Package</span>
                  <span className="detail-value">{roomType}</span>
                </div>
                <div>
                  <span className="detail-label">Price</span>
                  <span className="detail-value">{row.price}</span>
                </div>
                <div>
                  <span className="detail-label">Status</span>
                  <span className="detail-value detail-value--badge">
                    <Badge status={row.status} />
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-card">
              <h4 className="modal-card-title">Guest Information</h4>
              <div className="detail-list">
                <div><span className="detail-label">Guest</span><span className="detail-value">{row.customer}</span></div>
                <div><span className="detail-label">Email</span><span className="detail-value">{row.email}</span></div>
                <div><span className="detail-label">Contact</span><span className="detail-value">{row.contact}</span></div>
                <div><span className="detail-label">Check-In</span><span className="detail-value">{row.checkin}</span></div>
                <div><span className="detail-label">Check-Out</span><span className="detail-value">{row.checkout}</span></div>
                <div><span className="detail-label">Additional Guest</span><span className="detail-value">{row.addguest}</span></div>
              </div>
            </div>
          </div>
          <div className="modal-card fd-billing-summary-card">
            <h4 className="modal-card-title">Billing Summary</h4>
            <div className="billing-grid">
              <div><span className="detail-label">Total Amount</span><span className="detail-value">{row.total}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{row.downpayment}</span></div>
              <div><span className="detail-label remaining">Remaining Balance</span><span className="detail-value remaining">{row.balance}</span></div>
              <div><span className="detail-label paid">Total Paid</span><span className="detail-value paid">{row.paid}</span></div>
            </div>
          </div>
          <div className="modal-two-col fd-details-mid">
            <div className="modal-card">
              <h4 className="modal-card-title">Reference Number</h4>
              <span className="detail-value detail-value--ref">{row.refnum}</span>
            </div>
            <div className="modal-card">
              <h4 className="modal-card-title">Additional Request</h4>
              <span className="detail-value">{row.addreq && String(row.addreq).trim() ? row.addreq : "N/A"}</span>
            </div>
          </div>
          <div className="modal-two-col fd-details-payment">
            <div className="modal-card">
              <h4 className="modal-card-title">Payment Details</h4>
              <div className="detail-grid detail-grid--payment-block">
                <div><span className="detail-label">Amount Paid</span><span className="detail-value">{row.amountpaid}</span></div>
                <div><span className="detail-label">Date</span><span className="detail-value">{row.paydate}</span></div>
                <div className="detail-grid__full">
                  <span className="detail-label">Transaction ID</span>
                  <span className="detail-value">{row.transid}</span>
                </div>
              </div>
            </div>
            <div className="modal-card id-card">
              <h4 className="modal-card-title">ID Uploaded</h4>
              <img src={idSrc} alt="Guest ID" className="id-img" decoding="async" />
            </div>
          </div>
          <div className="modal-footer modal-footer-actions fd-room-details-actions">
            <button type="button" className="btn-approve" onClick={onEdit}>
              Edit
            </button>
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
function RejectModal({ open, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reject Reservation"
      size="sm"
      placement="top"
      panelClassName="fd-room-modal"
      footer={
        <div className="modal-footer modal-footer-actions">
          <button type="button" className="btn-confirm-cancel" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="btn-confirm-submit" onClick={() => onSubmit(reason)}>
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
  );
}

// ─── CHECK MODAL ─────────────────────────────────────────────
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
      panelClassName="fd-room-modal"
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
              <div><span className="detail-label">Check-In</span><span className="detail-value">{row.checkin}</span></div>
              <div><span className="detail-label">Total Balance</span><span className="detail-value">{row.balance}</span></div>
              <div><span className="detail-label">Room No.</span><span className="detail-value">{row.roomno}</span></div>
              <div><span className="detail-label">Check-Out</span><span className="detail-value">{row.checkout}</span></div>
              <div><span className="detail-label">Payment Method</span><span className="detail-value">{row.paymethod}</span></div>
              <div><span className="detail-label">Additional Guest</span><span className="detail-value">{row.addguest}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{row.downpayment}</span></div>
              <div><span className="detail-label">Additional Request</span><span className="detail-value">{row.addreq}</span></div>
            </div>
          </div>
    </Modal>
  );
}

// ─── ADD CHARGES (occupied room — same UX as Events) ─────────
function AddChargesModal({ open, onClose, onAddItem, currentTotalBalanceStr = "—" }) {
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

  const previewTotal = chargeItems.reduce((s, c) => s + c.amount * c.qty, 0) + (item && parseFloat(amount) > 0 ? parseFloat(amount) * qty : 0);
  const baseBal = parsePesoNum(currentTotalBalanceStr);
  const balanceAfterCharges = Number.isFinite(baseBal) ? Math.max(0, baseBal + previewTotal) : NaN;
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
                  <input type="text" className="charges-input" placeholder="e.g. towel, shampoo" value={item} onChange={(e) => setItem(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="detail-label">Amount</label>
                  <input type="text" className="charges-input" placeholder="e.g. 50" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="detail-label">Quantity</label>
                  <input type="number" className="charges-input" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value, 10) || 1)} />
                </div>
              </div>
              <div className="charges-list-wrap">
                <div className="charges-list-header">Item</div>
                <div className="charges-list">
                  {chargeItems.map((c, i) => (
                    <div key={i} className="charge-item-row">
                      <span className="charge-item-name">{c.item}<br /><small>₱{c.amount.toFixed(2)}</small></span>
                      <div className="charge-qty-ctrl">
                        <button type="button" onClick={() => changeQty(i, -1)}>−</button>
                        <span>{c.qty}</span>
                        <button type="button" onClick={() => changeQty(i, 1)}>+</button>
                        <button type="button" className="charge-remove" onClick={() => remove(i)}>✕</button>
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
                  <span>New charges total</span>
                  <span>₱{previewTotal.toFixed(2)}</span>
                </div>
                <div className="charges-balance-hint" aria-live="polite">
                  <div>
                    <span className="charges-balance-hint-label">Current total balance</span>
                    <span className="charges-balance-hint-value">{currentTotalBalanceStr}</span>
                  </div>
                  <div>
                    <span className="charges-balance-hint-label">Total balance after save</span>
                    <span className="charges-balance-hint-value">
                      {Number.isFinite(balanceAfterCharges) ? fmtPeso(balanceAfterCharges) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
      </Modal>
      <ConfirmDialog open={showConfirm} text="Add Item?" onCancel={() => setShowConfirm(false)} onConfirm={doAdd} />
    </>
  );
}

// ─── GUEST VIEW MODAL ────────────────────────────────────────
function GuestViewModal({ open, row, onClose, onEdit }) {
  if (!row) return null;
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Check Details"
      size="lg"
      placement="top"
      panelClassName="fd-room-modal"
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
              <div><span className="detail-label">Check-In</span><span className="detail-value">{row.checkin}</span></div>
              <div><span className="detail-label">Total Balance</span><span className="detail-value">{row.balance}</span></div>
              <div><span className="detail-label">Room No.</span><span className="detail-value">{row.roomno}</span></div>
              <div><span className="detail-label">Check-Out</span><span className="detail-value">{row.checkout}</span></div>
              <div><span className="detail-label">Payment Method</span><span className="detail-value">{row.paymethod}</span></div>
              <div><span className="detail-label">Additional Guest</span><span className="detail-value">{row.addguest}</span></div>
              <div><span className="detail-label">Downpayment</span><span className="detail-value">{row.downpayment}</span></div>
              <div><span className="detail-label">Additional Request</span><span className="detail-value">{row.addreq}</span></div>
            </div>
          </div>
    </Modal>
  );
}

// ─── GUEST EDIT MODAL ────────────────────────────────────────
function GuestEditModal({ open, row, onClose, onSave }) {
  const [form, setForm] = useState({});
  useEffect(() => { if (row) setForm({ ...row }); }, [row]);
  if (!row) return null;
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <Modal
      open={open && !!row}
      onClose={onClose}
      title="Edit guest stay"
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
          <div className="form-row">
            <div className="form-group"><label className="form-label">Guest Name</label><input type="text" className="edit-input" value={form.guest || ""} onChange={set("guest")}/></div>
            <div className="form-group"><label className="form-label">Room No.</label><input type="text" className="edit-input" value={form.roomno || ""} onChange={set("roomno")}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Check-In Date</label><input type="date" className="edit-input" value={form.checkin || ""} onChange={set("checkin")}/></div>
            <div className="form-group"><label className="form-label">Check-Out Date</label><input type="date" className="edit-input" value={form.checkout || ""} onChange={set("checkout")}/></div>
          </div>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Additional Guest</label><input type="number" className="edit-input" value={form.addguest || ""} onChange={set("addguest")} min="0"/></div>
            <div className="form-group"><label className="form-label">Payment Method</label><input type="text" className="edit-input" value={form.paymethod || ""} onChange={set("paymethod")}/></div>
          </div>
          <div className="form-group">
            <label className="form-label">Additional Request</label>
            <textarea className="edit-input edit-textarea" value={form.addreq || ""} onChange={set("addreq")} placeholder="Additional Requests"/>
          </div>
    </Modal>
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
  const initForm = { room: "", name: "", email: "", contact: "", address: "", nationality: "Philippines", addguest: "", checkin: "", checkout: "", requests: "", payment: "cash" };
  const [form, setForm] = useState(initForm);
  const [errors, setErrors] = useState({});
  const [showPayment, setShowPayment] = useState(false);
  const [payQrMissing, setPayQrMissing] = useState(false);
  const [payForm, setPayForm] = useState({ amountpaid: "", paydate: "", transid: "", proof: null });
  const [payErrors, setPayErrors] = useState({});
  const [proofPreview, setProofPreview] = useState(null);
  const [roomCatalog, setRoomCatalog] = useState([]);
  const [bookedRanges, setBookedRanges] = useState([]);
  const [wiLoading, setWiLoading] = useState(false);
  const [wiLoadErr, setWiLoadErr] = useState("");

  const set = (k) => (e) => { setForm(f => ({ ...f, [k]: e.target.value })); setErrors(er => ({ ...er, [k]: "" })); };
  const setP = (k, v) => { setPayForm(f => ({ ...f, [k]: v })); setPayErrors(er => ({ ...er, [k]: "" })); };

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

  const validatePayment = () => {
    const errs = {};
    if (!payForm.amountpaid.trim()) errs.amountpaid = "Required";
    if (!payForm.paydate) errs.paydate = "Required";
    if (!payForm.transid.trim()) errs.transid = "Required";
    if (!payForm.proof) errs.proof = "Please upload proof";
    return errs;
  };

  const validate = () => {
    const errs = {};
    if (!form.room) errs.room = "Required";
    if (!form.name) errs.name = "Required";
    if (!form.email) errs.email = "Required";
    if (!form.contact) errs.contact = "Required";
    if (!form.checkin) errs.checkin = "Required";
    if (!form.checkout) errs.checkout = "Required";
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
    setPayErrors(pe);
    if (Object.keys(pe).length) return;
    setShowPayment(false);
  };

  const handleSubmit = () => { if (validate()) onSubmit({ ...form, paySnapshot: form.payment === "gcash" ? { ...payForm } : null }); };
  const handleClear = () => { setForm(initForm); setErrors({}); setShowPayment(false); clearPayForm(); };

  if (!open) return null;
  return (
    <>
      <div className="wi-backdrop active" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="wi-modal" onClick={(e) => e.stopPropagation()}>
          <div className="wi-header">
            <h2 className="wi-title">Room Reservation</h2>
            <button type="button" className="wi-close" onClick={onClose}>✕</button>
          </div>
          <div className="wi-body">
            <div className="wi-row">
              <div className="wi-group full">
                <label>Select Room <span className="wi-req">*</span></label>
                {wiLoadErr ? <p className="wi-err" style={{ margin: "0 0 6px" }}>{wiLoadErr}</p> : null}
                <p className="wi-payment-sub" style={{ margin: "0 0 8px", fontSize: "12px" }}>
                  {wiLoading ? "Loading room catalog and bookings…" : "Rooms update from your catalog and current bookings. Pick check-in and check-out to hide rooms that overlap those dates."}
                </p>
                <div className="wi-select-wrap">
                  <select
                    className={`wi-input${errors.room ? " wi-input-error" : ""}`}
                    value={form.room}
                    onChange={set("room")}
                    disabled={wiLoading}
                  >
                    <option value="">-- Select a room --</option>
                    {roomOptions.map((o) => (
                      <option key={`${o.id}|${o.label}`} value={o.label}>{o.label}</option>
                    ))}
                  </select>
                </div>
                {!wiLoading && roomOptions.length === 0 && form.checkin && form.checkout && form.checkout > form.checkin ? (
                  <span className="wi-err">No rooms available for guest count and dates — adjust dates or additional guests.</span>
                ) : null}
                <span className="wi-err">{errors.room}</span>
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Customer Name <span className="wi-req">*</span></label>
                <input className={`wi-input${errors.name ? " wi-input-error" : ""}`} value={form.name} onChange={set("name")} placeholder="Full name"/>
                <span className="wi-err">{errors.name}</span>
              </div>
              <div className="wi-group">
                <label>Email Address <span className="wi-req">*</span></label>
                <input type="email" className={`wi-input${errors.email ? " wi-input-error" : ""}`} value={form.email} onChange={set("email")} placeholder="name@email.com"/>
                <span className="wi-err">{errors.email}</span>
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Contact Number <span className="wi-req">*</span></label>
                <input className={`wi-input${errors.contact ? " wi-input-error" : ""}`} value={form.contact} onChange={set("contact")} placeholder="09XXXXXXXXX"/>
                <span className="wi-err">{errors.contact}</span>
              </div>
              <div className="wi-group">
                <label>Address</label>
                <input className="wi-input" value={form.address} onChange={set("address")} placeholder="City, Province"/>
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Nationality</label>
                <div className="wi-select-wrap">
                  <select className="wi-input" value={form.nationality} onChange={set("nationality")}>
                    <option>Philippines</option><option>Other</option>
                  </select>
                </div>
              </div>
              <div className="wi-group">
                <label>Additional Guest</label>
                <input type="number" className="wi-input" value={form.addguest} onChange={set("addguest")} placeholder="0" min="0"/>
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group">
                <label>Check-In Date <span className="wi-req">*</span></label>
                <input type="date" className={`wi-input${errors.checkin ? " wi-input-error" : ""}`} value={form.checkin} onChange={set("checkin")}/>
                <span className="wi-err">{errors.checkin}</span>
              </div>
              <div className="wi-group">
                <label>Check-Out Date <span className="wi-req">*</span></label>
                <input type="date" className={`wi-input${errors.checkout ? " wi-input-error" : ""}`} value={form.checkout} onChange={set("checkout")}/>
                <span className="wi-err">{errors.checkout}</span>
              </div>
            </div>
            <div className="wi-row">
              <div className="wi-group full">
                <label>Additional Requests</label>
                <textarea className="wi-input wi-textarea" value={form.requests} onChange={set("requests")} placeholder="Special requests..."/>
              </div>
            </div>
            <div className="wi-payment-block">
              <div className="wi-payment-heading">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                <strong>Payment Options</strong>
              </div>
              <p className="wi-payment-sub">Pay with cash on arrival, or choose GCash to scan and complete the payment form.</p>
              <div className="wi-payment-opts">
                <label className={`wi-pay-card${form.payment === "cash" ? " selected" : ""}`} onClick={() => selectPayment("cash")}>
                  <input type="radio" name="wi-room-payment" value="cash" checked={form.payment === "cash"} onChange={() => {}} readOnly />
                  <div className="wi-pay-inner">
                    <CashPayIcon />
                    <strong>Cash</strong>
                    <span>Pay at the front desk — no online form needed</span>
                  </div>
                </label>
                <label className={`wi-pay-card${form.payment === "gcash" ? " selected" : ""}`} onClick={() => selectPayment("gcash")}>
                  <input type="radio" name="wi-room-payment" value="gcash" checked={form.payment === "gcash"} onChange={() => {}} readOnly />
                  <div className="wi-pay-inner">
                    <div className="wi-payment-gcash-icon-wrap">
                      <img src={IMAGES.gcashCard} alt="GCash" className="wi-payment-logo-gcash" width={32} height={32} decoding="async" />
                    </div>
                    <strong>GCash</strong>
                    <span>Scan QR and fill in amount, date, and proof</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="wi-actions">
              <button type="button" className="wi-btn-clear" onClick={handleClear}>Clear</button>
              <button type="button" className="wi-btn-submit" onClick={handleSubmit}>Submit Reservation</button>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
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
                      <img src={IMAGES.gcashPaymentQr} alt="GCash QR code" className="wi-qr-img wi-qr-img-payment" decoding="async" onError={() => setPayQrMissing(true)} />
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
                    <input type="text" className={`wi-input${payErrors.amountpaid ? " wi-input-error" : ""}`} placeholder="e.g. 1,666" value={payForm.amountpaid} onChange={(e) => setP("amountpaid", e.target.value)} />
                    {payErrors.amountpaid && <span className="wi-err">{payErrors.amountpaid}</span>}
                  </div>
                  <div className="wi-group">
                    <label>Date <span className="wi-req">*</span></label>
                    <input type="date" className={`wi-input${payErrors.paydate ? " wi-input-error" : ""}`} value={payForm.paydate} onChange={(e) => setP("paydate", e.target.value)} />
                    {payErrors.paydate && <span className="wi-err">{payErrors.paydate}</span>}
                  </div>
                </div>
                <div className="wi-group" style={{ marginTop: 8 }}>
                  <label>Transaction ID <span className="wi-req">*</span></label>
                  <input type="text" className={`wi-input${payErrors.transid ? " wi-input-error" : ""}`} placeholder="Enter transaction ID" value={payForm.transid} onChange={(e) => setP("transid", e.target.value)} />
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
    </>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function RoomReservation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [tab, setTab] = useState("reservation");
  const [reservations, setReservations] = useState(initialReservations);
  /** Reservation tab: `all` | `pending` | `approved` | `rejected` | `occupied` */
  const [reservationStatusFilter, setReservationStatusFilter] = useState("all");
  const [reservationsLoad, setReservationsLoad] = useState(false);
  const [reservationsErr, setReservationsErr] = useState("");
  const [search, setSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { pendingCount, displayNotifications, loadPending, markStaffNotificationsSeen } =
    useFrontdeskPendingNotifications({
      bookingType: "room",
    });
  const { topbarProfile } = useTopbarUserProfile("frontdesk");
  const { mainStyle } = useFrontdeskShell();
  const userRef = useRef(null);
  const notifRef = useRef(null);
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
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [checkRow, setCheckRow] = useState(null);
  useEffect(() => {
    if (!checkRow) setAddChargesOpen(false);
  }, [checkRow]);
  const [guestViewRow, setGuestViewRow] = useState(null);
  const [guestEditRow, setGuestEditRow] = useState(null);
  const [walkinOpen, setWalkinOpen] = useState(false);

  // confirm dialogs
  const [approveConfirm, setApproveConfirm] = useState(false);
  const [rejectConfirm, setRejectConfirm] = useState(false);
  const [checkinConfirm, setCheckinConfirm] = useState(false);
  const [checkoutConfirm, setCheckoutConfirm] = useState(false);
  const [editUpdateConfirm, setEditUpdateConfirm] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);
  const [guestUpdateConfirm, setGuestUpdateConfirm] = useState(false);
  const [guestSuccess, setGuestSuccess] = useState(false);
  const [walkinConfirm, setWalkinConfirm] = useState(false);
  const [walkinSuccess, setWalkinSuccess] = useState(false);
  const [pendingEdit, setPendingEdit] = useState(null);
  const [pendingGuestEdit, setPendingGuestEdit] = useState(null);
  const [pendingWalkin, setPendingWalkin] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  useEffect(() => {
    function handler(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // filter
  const q = search.toLowerCase();
  const filteredRes = reservations.filter((r) => {
    const api = String(r._apiStatus || "").toLowerCase();
    const st = String(r.status || "").toLowerCase();
    if (api === "completed" || st === "completed") return false;
    if (reservationStatusFilter !== "all") {
      if (reservationFilterBucket(r) !== reservationStatusFilter) return false;
    }
    return [r.number, r.type, r.customer, r.package, r.status, r.email, r.contact, r.refnum, r.checkin, r.checkout]
      .some((v) => String(v ?? "").toLowerCase().includes(q));
  });

  /** Same data as Reservation — approved+ stays only (on-site / check-in). */
  const guestRows = useMemo(
    () =>
      reservations
        .filter((r) => {
          const api = String(r._apiStatus || "").toLowerCase();
          if (api === "completed") return false;
          const s = String(r.status || "").toLowerCase();
          if (s === "pending" || s === "rejected") return false;
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

  const filteredGuestRows = guestRows.filter((g) =>
    [g.number, g.roomno, g.type, g.customer, g.package, g.status, g.email, g.contact, g.refnum, g.guest, g.checkin, g.checkout]
      .some((v) => String(v ?? "").toLowerCase().includes(q)),
  );

  const addChargesTotalBalanceStr = useMemo(() => {
    if (!checkRow) return "—";
    const key = rowMatchKey(checkRow);
    const r = reservations.find((x) => rowMatchKey(x) === key);
    return r?.balance ?? checkRow.balance ?? "—";
  }, [checkRow, reservations]);

  const openNotificationBooking = useCallback((notif) => {
    const bookingId = String(notif?.bookingId || "").trim();
    if (!bookingId) return;
    const path = getFrontdeskNotificationBookingPath(notif);
    if (!path) return;
    setNotifOpen(false);
    setUserOpen(false);
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
        showToast("Reservation Approved!");
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
    showToast("Reservation Approved!");
    window.alert(
      "This approval was saved only in the browser (sample data or no server booking id). It was NOT sent to the API, so housekeeping will not see a cleaning task.\n\n" +
        "To queue real work: log in with frontdesk@abela.demo (after npm run seed-demo in be/abela-be), then approve a reservation that shows a MongoDB id (24-character hex), or approve a guest booking submitted online.",
    );
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
        showToast("Reservation Rejected.");
        dispatchGuestBookingsRefreshPing();
        await loadReservationsFromApi();
        await loadPending();
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
    showToast("Reservation Rejected.");
  };

  // check-in — persist `occupied` on the server so Check Details shows Add Charges + Check-Out after reload
  const doCheckin = async () => {
    if (!checkRow) return;
    const key = rowMatchKey(checkRow);
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
        await patchBookingBackend(bookingId, { status: "completed" });
        dispatchGuestBookingsRefreshPing();
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

    const bookingId = mongoIdFromRow(r);
    setAddChargesOpen(false);

    if (bookingId) {
      try {
        const fresh = await patchBookingBackend(bookingId, {
          totalAmount: String(newTotal),
          additionalRequests: addreqMerged || prevReq,
        });
        const updatedRow = mapApiRoomBookingToRow(fresh, roomCatalogMapRef.current);
        setReservations((prev) => prev.map((x) => (rowMatchKey(x) === bookingId ? updatedRow : x)));
        setCheckRow(mergeCheckRowFromReservationRow(updatedRow));
        dispatchGuestBookingsRefreshPing();
        showToast("Charges saved to booking.");
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

  // edit save
  const doEditUpdate = () => {
    setReservations(rs => rs.map(r => r.id === pendingEdit?.id ? { ...r, ...pendingEdit } : r));
    setEditUpdateConfirm(false); setEditRow(null); setViewRow(null);
    setEditSuccess(true); setTimeout(() => setEditSuccess(false), 2000);
  };

  // guest edit save (keeps `reservations` in sync — same rows as Reservation tab)
  const doGuestUpdate = () => {
    if (!pendingGuestEdit) return;
    const key = rowMatchKey(pendingGuestEdit);
    const title = roomTitleFromPackageField(pendingGuestEdit.package);
    setReservations((rs) =>
      rs.map((r) => {
        if (rowMatchKey(r) !== key) return r;
        const guest = String(pendingGuestEdit.guest || "").trim();
        const roomno = String(pendingGuestEdit.roomno || "").trim();
        const num = roomno || r.number;
        return {
          ...r,
          customer: guest,
          roomno: roomno || r.roomno,
          number: num,
          package: formatRoomPackageWithNumber(num, title),
          checkin: pendingGuestEdit.checkin,
          checkout: pendingGuestEdit.checkout,
          addguest: String(pendingGuestEdit.addguest ?? r.addguest),
          paymethod: pendingGuestEdit.paymethod,
          addreq: pendingGuestEdit.addreq,
        };
      }),
    );
    setGuestUpdateConfirm(false);
    setGuestEditRow(null);
    setGuestViewRow(null);
    setGuestSuccess(true);
    setTimeout(() => setGuestSuccess(false), 2000);
  };

  // walk-in submit
  const doWalkin = () => {
    const snap = pendingWalkin.paySnapshot;
    const gcash = pendingWalkin.payment === "gcash" && snap;
    const { roomno, packageLabel } = splitWalkinRoomSelection(pendingWalkin.room);
    const nextId = reservations.length + 1;
    const numLabel = `RES-00${nextId}`;
    const title = packageLabel || pendingWalkin.room || "Room";
    const newRes = {
      _walkin: true,
      id: nextId,
      number: numLabel,
      type: "Walk-in",
      customer: pendingWalkin.name,
      package: formatRoomPackageWithNumber(numLabel, title),
      total: "₱0", downpayment: "₱0", balance: "₱0", status: "pending",
      roomno,
      price: "₱0", email: pendingWalkin.email,
      contact: pendingWalkin.contact, checkin: pendingWalkin.checkin,
      checkout: pendingWalkin.checkout, addguest: pendingWalkin.addguest || "0",
      paid: gcash ? (snap.amountpaid || "₱0") : "₱0",
      refnum: "—",
      amountpaid: gcash ? (snap.amountpaid || "₱0") : "₱0",
      paydate: gcash ? snap.paydate : "—",
      transid: gcash ? snap.transid : "—",
      addreq: pendingWalkin.requests || "None",
      paymethod: gcash ? "GCash" : "Cash"
    };
    setReservations(rs => [...rs, newRes]);
    setWalkinConfirm(false);
    setPendingWalkin(null);
    setWalkinOpen(false);
    setWalkinSuccess(true); setTimeout(() => setWalkinSuccess(false), 2000);
    showToast("Walk-in Reservation Added!");
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
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => {
                  if (!v) void markStaffNotificationsSeen();
                  return !v;
                });
                setUserOpen(false);
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
            <div className="icon-btn" ref={userRef} onClick={() => setUserOpen((v) => !v)}>
              <TopbarUserIcon />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                &#9662;
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
              <table className="rooms-table">
                <thead>
                  <tr>
                    <th className="rooms-th-nowrap">Number</th>
                    <th>Type</th>
                    <th className="rooms-th-customer">Customer</th>
                    <th>Package</th>
                    <th className="rooms-th-num">Total</th>
                    <th className="rooms-th-num">Downpayment</th>
                    <th className="rooms-th-num">Total Balance</th>
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
                    filteredRes.map((r) => (
                      <tr key={String(r.id)}>
                        <td className="rooms-td-nowrap">{formatStoredRoomNumberForDisplay(r.number)}</td>
                        <td>{r.type}</td>
                        <td className="rooms-td-customer" title={String(r.customer ?? "")}>{r.customer}</td>
                        <td>{r.package}</td>
                        <td className="rooms-td-num">{r.total}</td>
                        <td className="rooms-td-num">{r.downpayment}</td>
                        <td className="rooms-td-num">{r.balance}</td>
                        <td className="rooms-td-status"><Badge status={r.status} /></td>
                        <td className="rooms-td-action">
                          <div className="rooms-action-cell rooms-action-cell--trailing">
                            <div className="rooms-action-lead rooms-action-lead--review">
                              {showFrontdeskReservationReviewButton(r) ? (
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
                                    if (isFrontdeskBookingPending(r)) setDetailsRow(r);
                                  }}
                                >
                                  Review
                                </button>
                              ) : null}
                            </div>
                            <button type="button" className="rooms-action-btn rooms-view-btn" onClick={() => setViewRow(r)}>
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

          {tab === "guest" && (
            <div className="rooms-table-scroll-wrap">
              <table className="rooms-table rooms-table--guest">
                <thead>
                  <tr>
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
                      <td colSpan="6" style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>No guests found. Approve a reservation first, or use sample data while logged out.</td>
                    </tr>
                  ) : (
                    filteredGuestRows.map((g) => (
                      <tr key={rowMatchKey(g)}>
                        <td>{packageLabelForReservedGuestRow(g.package, g.status)}</td>
                        <td className="rooms-td-num">{g.total}</td>
                        <td className="rooms-td-num">{g.downpayment}</td>
                        <td className="rooms-td-num">{g.balance}</td>
                        <td className="rooms-td-status"><Badge status={g.status} /></td>
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
                            <button type="button" className="rooms-action-btn rooms-view-btn" onClick={() => setGuestViewRow(g)}>
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

      {/* Details (pending review) */}
      <DetailsModal
        open={!!detailsRow} row={detailsRow}
        onClose={() => setDetailsRow(null)}
        onApprove={() => setApproveConfirm(true)}
        onReject={() => setRejectOpen(true)}
      />

      {/* View (approved/rejected) */}
      <ViewModal
        open={!!viewRow} row={viewRow}
        onClose={() => setViewRow(null)}
        onEdit={() => { setEditRow(viewRow); }}
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
        onClose={() => setRejectOpen(false)}
        onSubmit={(reason) => { setRejectReason(reason); setRejectConfirm(true); }}
      />

      {/* Check (Reserved Guest) */}
      <CheckModal
        open={!!checkRow} row={checkRow}
        onClose={() => setCheckRow(null)}
        onCheckin={() => setCheckinConfirm(true)}
        onCheckout={() => setCheckoutConfirm(true)}
        onAddCharges={() => setAddChargesOpen(true)}
      />

      <AddChargesModal
        open={addChargesOpen}
        onClose={() => setAddChargesOpen(false)}
        onAddItem={handleRoomAddItem}
        currentTotalBalanceStr={addChargesTotalBalanceStr}
      />

      <GuestViewModal
        open={!!guestViewRow}
        row={guestViewRow}
        onClose={() => setGuestViewRow(null)}
        onEdit={() => { setGuestEditRow(guestViewRow); }}
      />

      <GuestEditModal
        open={!!guestEditRow}
        row={guestEditRow}
        onClose={() => setGuestEditRow(null)}
        onSave={(form) => { setPendingGuestEdit(form); setGuestUpdateConfirm(true); }}
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
      <ConfirmDialog open={approveConfirm} text="Approve Reservation?" onCancel={() => setApproveConfirm(false)} onConfirm={confirmApprove}/>
      <ConfirmDialog open={rejectConfirm} text="Reject Reservation?" onCancel={() => setRejectConfirm(false)} onConfirm={confirmReject}/>
      <ConfirmDialog open={checkinConfirm} text="Confirm Check-In?" onCancel={() => setCheckinConfirm(false)} onConfirm={doCheckin}/>
      <ConfirmDialog open={checkoutConfirm} text="Confirm Check-Out?" onCancel={() => setCheckoutConfirm(false)} onConfirm={doCheckout}/>
      <ConfirmDialog open={editUpdateConfirm} text="Update Reservation?" onCancel={() => setEditUpdateConfirm(false)} onConfirm={doEditUpdate}/>
      <ConfirmDialog open={editSuccess} text="Updated Successfully!" isSuccess/>
      <ConfirmDialog open={guestUpdateConfirm} text="Update Reservation?" onCancel={() => setGuestUpdateConfirm(false)} onConfirm={doGuestUpdate}/>
      <ConfirmDialog open={guestSuccess} text="Updated Successfully!" isSuccess/>
      <ConfirmDialog
        open={walkinConfirm && pendingWalkin != null}
        text="Submit Walk-in Reservation?"
        onCancel={() => { setWalkinConfirm(false); setPendingWalkin(null); }}
        onConfirm={doWalkin}
      />
      <ConfirmDialog open={walkinSuccess} text="Reservation Added!" isSuccess/>

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