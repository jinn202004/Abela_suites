import { useState, useEffect, useCallback, useMemo } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { fetchBookingsBackend, fetchRoomsCatalog, deleteBookingBackend } from "../api/guestApi";
import {
  bookingAddressDisplay,
  bookingCustomerDisplayName,
  bookingEmailDisplay,
  bookingPhoneDisplay,
  buildRoomIdToNumberMap,
  formatRoomTableNumber,
} from "../guests/bookingRoomDisplay";
import "../guests/idUploadedCard.css";
import "./booking-management.css";

/** Served from `public/logo.jpg` (swap file to customize print header). */
const BM_PRINT_LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpg`;

function parseMoneyStr(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fmtPeso(n) {
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function statusToBadgeLabel(st) {
  const k = String(st || "").toLowerCase();
  if (k === "approved" || k === "confirmed") return "Approved";
  if (k === "pending") return "Pending Approval";
  if (k === "rejected" || k === "declined") return "Rejected";
  if (k === "cancelled") return "Cancelled";
  if (k === "completed") return "Completed";
  return st || "Pending Approval";
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parseDateForMonthFilter(d) {
  if (d == null || d === "" || d === "—") return null;
  const s = String(d);
  const dt = s.includes("T") ? new Date(s) : new Date(`${s}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** When month is "" (YYYY-MM), include all rows; otherwise filter by check-in / event date. */
function rowInSelectedMonth(sortDate, monthYyyyMm) {
  if (!monthYyyyMm) return true;
  const dt = parseDateForMonthFilter(sortDate);
  if (!dt) return false;
  const [y, m] = monthYyyyMm.split("-").map(Number);
  return dt.getFullYear() === y && dt.getMonth() + 1 === m;
}

function mapRoomBookingRow(b, roomIdToNumber) {
  const total = parseMoneyStr(b.totalAmount);
  let down = parseMoneyStr(b.paymentAmount);
  if (total > 0 && down > total) down = total;
  const bal = Math.max(0, total - down);
  const ridMap = roomIdToNumber instanceof Map ? roomIdToNumber : new Map();
  const num = formatRoomTableNumber(b, ridMap);
  return {
    sortDate: b.checkIn || b.updatedAt || "",
    number: num,
    type: b.roomTitle || "Room",
    customer: bookingCustomerDisplayName(b),
    price: fmtPeso(total),
    checkin: b.checkIn || "—",
    checkout: b.checkOut || "—",
    status: statusToBadgeLabel(b.status),
    downpayment: fmtPeso(down),
    balance: fmtPeso(bal),
    contact: bookingPhoneDisplay(b),
    email: bookingEmailDisplay(b),
    address: bookingAddressDisplay(b),
    requests: b.additionalRequests || "",
    refnum: String(b.id),
    amountpaid: fmtPeso(down),
    paydate: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString("en-PH") : "",
    transid: b.transactionId || "",
    guestcount: String(b.additionalGuests ?? 0),
    bookingId: String(b.id || ""),
  };
}

function mapEventBookingRow(b) {
  const total = parseMoneyStr(b.venuePrice) || parseMoneyStr(b.totalAmount);
  let down = parseMoneyStr(b.paymentAmount);
  if (total > 0 && down > total) down = total;
  const bal = Math.max(0, total - down);
  return {
    sortDate: b.eventDate || b.eventEndDate || b.updatedAt || "",
    customer: bookingCustomerDisplayName(b),
    event: b.eventTitle || b.venueName || "Event",
    checkin: b.eventDate || "—",
    checkout: b.eventEndDate || b.eventDate || "—",
    downpayment: fmtPeso(down),
    balance: fmtPeso(bal),
    status: statusToBadgeLabel(b.status),
    contact: bookingPhoneDisplay(b),
    email: bookingEmailDisplay(b),
    timeslot: b.timeSlot || "",
    attendees: String(b.expectedPax ?? ""),
    requests: b.additionalRequests || "",
    refnum: String(b.id),
    amountpaid: fmtPeso(down),
    paydate: b.updatedAt ? new Date(b.updatedAt).toLocaleDateString("en-PH") : "",
    transid: b.transactionId || "",
    bookingId: String(b.id || ""),
  };
}

const ROOM_PRINT_COLS = [
  "Ref",
  "Room No.",
  "Package",
  "Customer",
  "Price",
  "Check-In",
  "Check-Out",
  "Status",
  "Downpayment",
  "Balance",
  "Contact",
  "Email",
  "Address",
  "Guests",
  "Requests",
  "Amount paid",
  "Pay date",
  "Tx ID",
];

const EVENT_PRINT_COLS = [
  "Ref",
  "Customer",
  "Event / Venue",
  "Check-In",
  "Check-Out",
  "Downpayment",
  "Balance",
  "Status",
  "Contact",
  "Email",
  "Time slot",
  "Attendees",
  "Requests",
  "Amount paid",
  "Pay date",
  "Tx ID",
];

function roomRowToPrintCells(r) {
  return [
    r.refnum,
    r.number,
    r.type,
    r.customer,
    r.price,
    r.checkin,
    r.checkout,
    r.status,
    r.downpayment,
    r.balance,
    r.contact,
    r.email,
    r.address,
    r.guestcount,
    r.requests,
    r.amountpaid,
    r.paydate,
    r.transid,
  ];
}

function eventRowToPrintCells(r) {
  return [
    r.refnum,
    r.customer,
    r.event,
    r.checkin,
    r.checkout,
    r.downpayment,
    r.balance,
    r.status,
    r.contact,
    r.email,
    r.timeslot,
    r.attendees,
    r.requests,
    r.amountpaid,
    r.paydate,
    r.transid,
  ];
}

const PDF_HEAD_RGB = [184, 146, 42];

function cellPdf(v) {
  return String(v ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Client-side PDF export (same columns as print preview). */
function downloadBookingReportPdf({ variant, monthLabel, roomRows, eventRows, printMonthKey }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 8;

  const tableDefaults = {
    styles: { fontSize: 5, cellPadding: 0.55, overflow: "linebreak" },
    headStyles: { fillColor: PDF_HEAD_RGB, fontSize: 5, textColor: 255 },
    bodyStyles: { fontSize: 5 },
    margin: { left: margin, right: margin },
    theme: "striped",
  };

  let y = 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ABELA SUITES", margin, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Period: ${monthLabel}`, margin, y);
  y += 12;

  if (variant === "room") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Room reservations", margin, y);
    y += 4;
    const body =
      roomRows.length > 0
        ? roomRows.map((r) => roomRowToPrintCells(r).map(cellPdf))
        : [ROOM_PRINT_COLS.map((_, i) => (i === 0 ? "No room bookings for this period." : ""))];

    autoTable(doc, {
      ...tableDefaults,
      startY: y,
      head: [ROOM_PRINT_COLS],
      body,
    });
  }

  if (variant === "event") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Event reservations", margin, y);
    y += 4;
    const body =
      eventRows.length > 0
        ? eventRows.map((r) => eventRowToPrintCells(r).map(cellPdf))
        : [EVENT_PRINT_COLS.map((_, i) => (i === 0 ? "No event bookings for this period." : ""))];

    autoTable(doc, {
      ...tableDefaults,
      startY: y,
      head: [EVENT_PRINT_COLS],
      body,
    });
  }

  const slug = (printMonthKey || "all-time").replace(/[^\d-]/g, "") || "all-time";
  doc.save(`Abela_bookings_${variant}_${slug}.pdf`);
}

function BookingPrintModal({ open, onClose, monthLabel, variant, roomRows, eventRows, printMonthKey }) {
  if (!open) return null;

  const heading = variant === "room" ? "Room reservations" : "Event reservations";

  const handleDownloadPdf = () => {
    downloadBookingReportPdf({
      variant,
      monthLabel,
      roomRows,
      eventRows,
      printMonthKey,
    });
  };

  return (
    <div
      className="bm-print-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bm-print-dialog" role="dialog" aria-modal="true" aria-labelledby="bm-print-heading">
        <div className="bm-print-dialog-bar no-print">
          <h2 id="bm-print-heading" className="bm-print-dialog-title">
            Print preview
          </h2>
          <button type="button" className="bm-print-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="bm-print-surface" id="bm-print-surface">
          <header className="bm-print-header">
            <div className="bm-print-logo-mark" aria-hidden>
              <img
                src={BM_PRINT_LOGO_SRC}
                alt=""
                className="bm-print-logo-img"
                width={56}
                height={56}
                decoding="async"
              />
            </div>
            <div className="bm-print-brand">ABELA SUITES</div>
            <div className="bm-print-period">Period: {monthLabel}</div>
            <div className="bm-print-subtitle">{heading}</div>
          </header>

          {variant === "room" && (
            <section className="bm-print-section">
              <h3 className="bm-print-section-title">Room reservations</h3>
              <div className="bm-print-table-wrap">
                <table className="bm-print-table">
                  <thead>
                    <tr>
                      {ROOM_PRINT_COLS.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {roomRows.length === 0 ? (
                      <tr>
                        <td colSpan={ROOM_PRINT_COLS.length} className="bm-print-empty">
                          No room bookings for this period.
                        </td>
                      </tr>
                    ) : (
                      roomRows.map((r) => (
                        <tr key={`room-${r.refnum}`}>
                          {roomRowToPrintCells(r).map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {variant === "event" && (
            <section className="bm-print-section">
              <h3 className="bm-print-section-title">Event reservations</h3>
              <div className="bm-print-table-wrap">
                <table className="bm-print-table">
                  <thead>
                    <tr>
                      {EVENT_PRINT_COLS.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {eventRows.length === 0 ? (
                      <tr>
                        <td colSpan={EVENT_PRINT_COLS.length} className="bm-print-empty">
                          No event bookings for this period.
                        </td>
                      </tr>
                    ) : (
                      eventRows.map((r) => (
                        <tr key={`event-${r.refnum}`}>
                          {eventRowToPrintCells(r).map((cell, i) => (
                            <td key={i}>{cell}</td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        <div className="bm-print-footer no-print">
          <button type="button" className="bm-print-footer-btn secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="bm-print-footer-btn pdf" onClick={handleDownloadPdf}>
            Download PDF
          </button>
          <button type="button" className="bm-print-footer-btn primary" onClick={() => window.print()}>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

// SVG Icons
const icons = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  staff: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  booking: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  room: (
    <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
    </svg>
  ),
  event: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
      <path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/>
      <path d="M15 2h.01"/><path d="M22 20h.01"/>
      <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
      <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
      <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
      <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
    </svg>
  ),
  restaurant: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/>
      <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7"/>
    </svg>
  ),
  bills: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  eye: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{display:'block'}}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" style={{ display: "block" }} aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  logout: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  dollar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
};

function Badge({ status }) {
  const cls =
    status === "Approved"
      ? "badge badge-approved"
      : status === "Rejected"
      ? "badge badge-rejected"
      : "badge badge-pending";
  const label = status === "Pending Approval" ? "Pending" : status;
  return <span className={cls}>{label}</span>;
}

function RoomModal({ d }) {
  return (
    <>
      <div className="modal-two-col">
        <div className="modal-card">
          <h4 className="modal-card-title">Room Details</h4>
          <div className="detail-grid">
            <div><span className="detail-label">Room No.</span><span className="detail-value">{d.number}</span></div>
            <div><span className="detail-label">Package</span><span className="detail-value">{d.type}</span></div>
            <div><span className="detail-label">Price</span><span className="detail-value">{d.price}</span></div>
            <div><span className="detail-label">Status</span><span className="detail-value"><Badge status={d.status} /></span></div>
          </div>
        </div>
        <div className="modal-card">
          <h4 className="modal-card-title">Guest Information</h4>
          <div className="detail-list">
            <div><span className="detail-label">Guest</span><span className="detail-value">{d.customer}</span></div>
            <div><span className="detail-label">Email</span><span className="detail-value">{d.email}</span></div>
            <div><span className="detail-label">Contact</span><span className="detail-value">{d.contact}</span></div>
            <div><span className="detail-label">Check-In</span><span className="detail-value">{d.checkin}</span></div>
            <div><span className="detail-label">Check-Out</span><span className="detail-value">{d.checkout}</span></div>
            <div><span className="detail-label">Additional Guest</span><span className="detail-value">{d.guestcount}</span></div>
          </div>
        </div>
      </div>
      <div className="modal-card">
        <h4 className="modal-card-title">Billing Summary</h4>
        <div className="billing-grid">
          <div><span className="detail-label">Total Amount</span><span className="detail-value">{d.price}</span></div>
          <div><span className="detail-label">Downpayment</span><span className="detail-value">{d.downpayment}</span></div>
          <div><span className="detail-label remaining">Remaining Balance</span><span className="detail-value remaining">{d.balance}</span></div>
          <div><span className="detail-label paid">Total Paid</span><span className="detail-value paid">{d.downpayment}</span></div>
        </div>
      </div>
      <div className="modal-card">
        <h4 className="modal-card-title">Reference Number</h4>
        <span className="detail-value">{d.refnum}</span>
      </div>
      <div className="modal-two-col">
        <div className="modal-card">
          <h4 className="modal-card-title">Payment Details</h4>
          <div className="detail-grid">
            <div><span className="detail-label">Amount Paid</span><span className="detail-value">{d.amountpaid}</span></div>
            <div><span className="detail-label">Date</span><span className="detail-value">{d.paydate}</span></div>
            <div><span className="detail-label">Transaction ID</span><span className="detail-value">{d.transid}</span></div>
          </div>
        </div>
        <div className="id-uploaded-card">
          <h4 className="id-uploaded-card-title">ID Uploaded</h4>
          <div className="id-uploaded-frame">
            <img src="images/id.jpg" alt="ID" className="id-img" />
          </div>
        </div>
      </div>
    </>
  );
}

function EventModal({ d }) {
  return (
    <>
      <div className="modal-two-col">
        <div className="modal-card">
          <h4 className="modal-card-title">Event Details</h4>
          <div className="detail-grid">
            <div><span className="detail-label">Venue</span><span className="detail-value">{d.event}</span></div>
            <div><span className="detail-label">Date</span><span className="detail-value">{d.checkin}</span></div>
            <div><span className="detail-label">Time Slot</span><span className="detail-value">{d.timeslot}</span></div>
            <div><span className="detail-label">Attendees</span><span className="detail-value">{d.attendees}</span></div>
            <div><span className="detail-label">Status</span><span className="detail-value"><Badge status={d.status} /></span></div>
          </div>
        </div>
        <div className="modal-card">
          <h4 className="modal-card-title">Guest Information</h4>
          <div className="detail-list">
            <div><span className="detail-label">Guest</span><span className="detail-value">{d.customer}</span></div>
            <div><span className="detail-label">Email</span><span className="detail-value">{d.email}</span></div>
            <div><span className="detail-label">Contact</span><span className="detail-value">{d.contact}</span></div>
            <div><span className="detail-label">Additional Requests</span><span className="detail-value">{d.requests}</span></div>
          </div>
        </div>
      </div>
      <div className="modal-card">
        <h4 className="modal-card-title">Billing Summary</h4>
        <div className="billing-grid">
          <div><span className="detail-label">Downpayment</span><span className="detail-value">{d.downpayment}</span></div>
          <div><span className="detail-label remaining">Remaining Balance</span><span className="detail-value remaining">{d.balance}</span></div>
        </div>
      </div>
      <div className="modal-card">
        <h4 className="modal-card-title">Reference Number</h4>
        <span className="detail-value">{d.refnum}</span>
      </div>
      <div className="modal-two-col">
        <div className="modal-card">
          <h4 className="modal-card-title">Payment Details</h4>
          <div className="detail-grid">
            <div><span className="detail-label">Amount Paid</span><span className="detail-value">{d.amountpaid}</span></div>
            <div><span className="detail-label">Date</span><span className="detail-value">{d.paydate}</span></div>
            <div><span className="detail-label">Transaction ID</span><span className="detail-value">{d.transid}</span></div>
          </div>
        </div>
        <div className="id-uploaded-card">
          <h4 className="id-uploaded-card-title">ID Uploaded</h4>
          <div className="id-uploaded-frame">
            <img src="images/id.jpg" alt="ID" className="id-img" />
          </div>
        </div>
      </div>
    </>
  );
}

export default function BookingManagement() {
  const { mainStyle } = useAdminShell();
  const [activeTab, setActiveTab] = useState("room");
  const [search, setSearch] = useState("");
  const [viewModal, setViewModal] = useState(null);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const [roomData, setRoomData] = useState([]);
  const [eventData, setEventData] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [printMonth, setPrintMonth] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [printVariant, setPrintVariant] = useState("room");

  const printMonthLabel = useMemo(() => {
    if (!printMonth) return "All time";
    const [y, m] = printMonth.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }, [printMonth]);

  const printRoomFiltered = useMemo(
    () => roomData.filter((r) => rowInSelectedMonth(r.sortDate, printMonth)),
    [roomData, printMonth],
  );
  const printEventFiltered = useMemo(
    () => eventData.filter((r) => rowInSelectedMonth(r.sortDate, printMonth)),
    [eventData, printMonth],
  );

  const openBookingPrint = (variant) => {
    setPrintVariant(variant);
    setPrintOpen(true);
  };

  const loadBookings = useCallback(async () => {
    setBookingsLoading(true);
    setBookingsError("");
    try {
      const [list, catalog] = await Promise.all([
        fetchBookingsBackend(),
        fetchRoomsCatalog().catch(() => []),
      ]);
      const ridMap = buildRoomIdToNumberMap(catalog);
      const rooms = list.filter((b) => b.type === "room").map((b) => mapRoomBookingRow(b, ridMap));
      const events = list.filter((b) => b.type === "event").map(mapEventBookingRow);
      setRoomData(rooms);
      setEventData(events);
    } catch {
      setBookingsError("Could not load bookings. Sign in as admin and ensure the API (port 5000) is running.");
      setRoomData([]);
      setEventData([]);
    } finally {
      setBookingsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const notifications = [
    { msg: "Your reservation progress is pending", time: "2/19/2026, 10:39:00 AM" },
    { msg: "Your reservation was approved", time: "2/19/2026, 10:39:00 AM" },
    { msg: "Your reservation was declined", time: "2/19/2026, 10:39:00 AM" },
  ];

  const filteredRooms = roomData.filter((r) =>
    Object.values(r).some((v) => String(v).toLowerCase().includes(search.toLowerCase())),
  );
  const filteredEvents = eventData.filter((e) =>
    Object.values(e).some((v) => String(v).toLowerCase().includes(search.toLowerCase())),
  );

  const totalReservations = roomData.length + eventData.length;
  const pendingCount =
    [...roomData, ...eventData].filter((row) => row.status === "Pending Approval").length;

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSearch("");
  };

  const handleDeleteBooking = async (bookingId, label) => {
    if (!bookingId) return;
    const ok = window.confirm(
      `Delete this booking${label ? ` (${label})` : ""}? This cannot be undone.`,
    );
    if (!ok) return;
    setDeletingId(bookingId);
    try {
      await deleteBookingBackend(bookingId);
      await loadBookings();
    } catch (e) {
      window.alert(e?.message || "Could not delete booking.");
    } finally {
      setDeletingId("");
    }
  };

  return (
    <>
      <RailPortalShell mainStyle={mainStyle} sidebar={<AdminSidebarNav />}>
        {/* TOPBAR */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Booking Management</span>
          </div>
          <AdminTopbarActions notifications={notifications} onRequestLogout={requestLogout} />
        </header>

        {/* MAIN CONTENT */}
        <main className="content">
          <div className="page-heading">
            <h1 className="page-title">Booking Management Dashboard</h1>
            <p className="page-sub">Manage your hotel rooms, reservations, and availability</p>
            {bookingsError && (
              <p style={{ color: "#c0392b", marginTop: 10, fontSize: 14 }}>{bookingsError}</p>
            )}
          </div>

          {/* STAT CARDS */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">{icons.calendar}</div>
                <span className="stat-label">Pending approval</span>
              </div>
              <p className="stat-value">{bookingsLoading ? "…" : pendingCount}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">{icons.users}</div>
                <span className="stat-label">Total bookings</span>
              </div>
              <p className="stat-value">{bookingsLoading ? "…" : totalReservations}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">{icons.dollar}</div>
                <span className="stat-label">Room + event rows</span>
              </div>
              <p className="stat-value">{bookingsLoading ? "…" : totalReservations}</p>
            </div>
          </div>

          {/* Room / Event switcher — unique classes (avoids global .rm-tab / .tab-btn clashes) */}
          <div className="bk-booking-switch" role="tablist" aria-label="Reservation type">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "room"}
              className={`bk-booking-switch__btn${activeTab === "room" ? " bk-booking-switch__btn--active" : ""}`}
              onClick={() => handleTabSwitch("room")}
            >
              Room Reservation
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "event"}
              className={`bk-booking-switch__btn${activeTab === "event" ? " bk-booking-switch__btn--active" : ""}`}
              onClick={() => handleTabSwitch("event")}
            >
              Event Reservation
            </button>
          </div>

          <div className="bk-booking-search-wrap">
            <span className="bk-booking-search-icon" aria-hidden>
              {icons.search}
            </span>
            <input
              type="search"
              className="bk-booking-search-input"
              placeholder="Search guest..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Print reports (month filter like Settings → Export) */}
          <div className="bm-print-toolbar">
            <div className="bm-print-toolbar-field">
              <label className="bm-print-label" htmlFor="bm-booking-print-month">
                Select month
              </label>
              <input
                id="bm-booking-print-month"
                type="month"
                className="bm-print-month-input"
                value={printMonth}
                onChange={(e) => setPrintMonth(e.target.value)}
              />
              <p className="bm-print-hint">Leave empty to include all bookings. Dates use room check-in or event date.</p>
            </div>
            <div className="bm-print-toolbar-actions">
              {activeTab === "room" && (
                <button
                  type="button"
                  className="bm-print-action-btn"
                  onClick={() => openBookingPrint("room")}
                >
                  Print room report
                </button>
              )}
              {activeTab === "event" && (
                <button
                  type="button"
                  className="bm-print-action-btn"
                  onClick={() => openBookingPrint("event")}
                >
                  Print event report
                </button>
              )}
              <button
                type="button"
                className="bm-print-action-btn bm-print-action-btn--outline"
                onClick={() => openBookingPrint(activeTab === "room" ? "room" : "event")}
              >
                {activeTab === "room" ? "Print all room transactions" : "Print all event transactions"}
              </button>
            </div>
          </div>

          {/* TABLE */}
          <div className="table-section">
            <h3 className="table-title">Reservation Status</h3>

            {/* ROOM TABLE */}
            {activeTab === "room" && (
              <div className="table-scroll-wrap">
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Number</th><th>Type</th><th>Customer</th><th>Price</th>
                      <th>Check-In</th><th>Check-Out</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsLoading && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 24 }}>
                          Loading bookings…
                        </td>
                      </tr>
                    )}
                    {!bookingsLoading &&
                      filteredRooms.map((row, i) => (
                      <tr key={row.refnum || i}>
                        <td>{row.number}</td>
                        <td>{row.type}</td>
                        <td>{row.customer}</td>
                        <td>{row.price}</td>
                        <td>{row.checkin}</td>
                        <td>{row.checkout}</td>
                        <td><Badge status={row.status} /></td>
                        <td className="action-cell">
                          <button
                            type="button"
                            className="action-btn view-btn"
                            title="View"
                            onClick={() => setViewModal({ data: row, type: "room" })}
                          >
                            {icons.eye}
                          </button>
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            title="Delete booking"
                            disabled={deletingId === row.bookingId}
                            onClick={() =>
                              handleDeleteBooking(row.bookingId, row.customer || row.type)
                            }
                          >
                            {icons.trash}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!bookingsLoading && filteredRooms.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>
                          No room bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* EVENT TABLE */}
            {activeTab === "event" && (
              <div className="table-scroll-wrap">
                <table className="res-table">
                  <thead>
                    <tr>
                      <th>Customer</th><th>Event</th><th>Check-In</th><th>Check-Out</th>
                      <th>Downpayment</th><th>Balance</th><th>Status</th><th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookingsLoading && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 24 }}>
                          Loading bookings…
                        </td>
                      </tr>
                    )}
                    {!bookingsLoading &&
                      filteredEvents.map((row, i) => (
                      <tr key={row.refnum || i}>
                        <td>{row.customer}</td>
                        <td>{row.event}</td>
                        <td>{row.checkin}</td>
                        <td>{row.checkout}</td>
                        <td>{row.downpayment}</td>
                        <td>{row.balance}</td>
                        <td><Badge status={row.status} /></td>
                        <td className="action-cell">
                          <button
                            type="button"
                            className="action-btn view-btn"
                            title="View"
                            onClick={() => setViewModal({ data: row, type: "event" })}
                          >
                            {icons.eye}
                          </button>
                          <button
                            type="button"
                            className="action-btn delete-btn"
                            title="Delete booking"
                            disabled={deletingId === row.bookingId}
                            onClick={() =>
                              handleDeleteBooking(row.bookingId, row.customer || row.event)
                            }
                          >
                            {icons.trash}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!bookingsLoading && filteredEvents.length === 0 && (
                      <tr>
                        <td colSpan={8} style={{ textAlign: "center", padding: 24, color: "#9a8060" }}>
                          No event bookings yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </RailPortalShell>

      <BookingPrintModal
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        monthLabel={printMonthLabel}
        variant={printVariant}
        roomRows={printRoomFiltered}
        eventRows={printEventFiltered}
        printMonthKey={printMonth}
      />

      <Modal
        open={!!viewModal}
        onClose={() => setViewModal(null)}
        title="Reservation Details"
        size="lg"
        placement="top"
        panelClassName="bm-reservation-modal"
        bodyClassName="modal-body-scroll"
      >
        {viewModal ? (
          viewModal.type === "room" ? (
            <RoomModal d={viewModal.data} />
          ) : (
            <EventModal d={viewModal.data} />
          )
        ) : null}
      </Modal>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}