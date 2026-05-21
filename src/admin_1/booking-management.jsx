import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
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
import { fetchBookingsBackend, fetchBookingByIdBackend, fetchRoomsCatalog, deleteBookingBackend } from "../api/guestApi";
import { ReservationProofPreview } from "../components/ReservationProofPreview";
import GovernmentIdPreview from "../components/GovernmentIdPreview";
import {
  derivePaymentStatusLine,
  paymentMethodDisplayLabel,
  paymentProofFromBooking,
} from "../components/reservationDetailsHelpers";
import { openPdfPrintOrDownload, pdfSafeText } from "../utils/pdfClientExport";
import "../components/reservation-details-modal.css";
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

/** Rows per page for reservation tables — UI-only; data still loads via `fetchBookingsBackend` (no API/DB changes). */
const BOOKING_PAGE_SIZE = 10;

/** Served from `public/logo.jpg` (swap file to customize print header). */
const BM_PRINT_LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpg`;

function parseMoneyStr(v) {
  if (v == null || v === "") return 0;
  const n = Number(
    String(v)
      .replace(/^\s*PHP\s*/i, "")
      .replace(/[₱,\s]/g, ""),
  );
  return Number.isFinite(n) ? n : 0;
}

function fmtPeso(n) {
  if (!Number.isFinite(n)) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** ASCII-safe money for print/PDF summaries (matches sanitized PHP style). */
function fmtSummaryPhp(n) {
  if (!Number.isFinite(n)) return "—";
  return `PHP ${n.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
    bookingId: String(b.id || ""),
    amountpaid: fmtPeso(down),
    paydate: b.paymentDate && String(b.paymentDate).trim()
      ? formatBookingPaymentDate(b.paymentDate)
      : b.updatedAt
        ? new Date(b.updatedAt).toLocaleDateString("en-PH")
        : "",
    transid: b.transactionId || "",
    guestcount: String(b.additionalGuests ?? 0),
    paymentMethod: b.paymentMethod || "",
    paymethod: b.paymentMethod || "",
    paymentProofData: "",
    governmentIdUrl: String(b.governmentIdUrl || b.validIdPhotoUrl || "").trim(),
  };
}

function formatBookingPaymentDate(iso) {
  const s = String(iso || "").trim();
  if (!s) return "";
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return s;
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
    price: fmtPeso(total),
    status: statusToBadgeLabel(b.status),
    contact: bookingPhoneDisplay(b),
    email: bookingEmailDisplay(b),
    timeslot: b.timeSlot || "",
    attendees: String(b.expectedPax ?? ""),
    requests: b.additionalRequests || "",
    refnum: String(b.id),
    bookingId: String(b.id || ""),
    amountpaid: fmtPeso(down),
    paydate: b.paymentDate && String(b.paymentDate).trim()
      ? formatBookingPaymentDate(b.paymentDate)
      : b.updatedAt
        ? new Date(b.updatedAt).toLocaleDateString("en-PH")
        : "",
    transid: b.transactionId || "",
    paymentMethod: b.paymentMethod || "",
    paymethod: b.paymentMethod || "",
    paymentProofData: "",
    governmentIdUrl: String(b.governmentIdUrl || b.validIdPhotoUrl || "").trim(),
  };
}

/** Short ref for dense layouts; full id still available on `title` in print cards. */
function shortBookingRef(id) {
  const s = String(id ?? "").trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

const PDF_HEAD_RGB = [184, 146, 42];

/** Line height in mm for a font size in pt (readable spacing). */
function bookingPdfLineH(fsPt) {
  return (fsPt * 0.352778) * 1.38;
}

/** If not enough room, start a new page and return top margin y. */
function bookingPdfEnsure(doc, y, needMm, margin, pageH) {
  if (y + needMm > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function bookingPdfSafe(v, maxLen = 4000) {
  return pdfSafeText(sanitizeBookingPrintCell(v), maxLen);
}

/**
 * Normalize text for print preview + PDF output. Default Helvetica cannot render ₱, ×, or many
 * Unicode spaces; HTML in `additionalRequests` can show as garbled `&…` in PDF/print output.
 */
function sanitizeBookingPrintCell(v) {
  let s = String(v ?? "");
  s = s.replace(/<[^>]*>/g, " ");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&times;/gi, "x");
  s = s.replace(/&apos;/gi, "'");
  s = s.replace(/&quot;/gi, '"');
  s = s.replace(/&lt;/gi, "<");
  s = s.replace(/&gt;/gi, ">");
  s = s.replace(/&#x([0-9a-f]{1,6});?/gi, (_, hex) => {
    const cp = parseInt(hex, 16);
    return Number.isFinite(cp) && cp >= 32 && cp < 0x110000 ? String.fromCodePoint(cp) : "";
  });
  s = s.replace(/&#(\d{1,7});?/g, (_, dec) => {
    const cp = parseInt(dec, 10);
    return Number.isFinite(cp) && cp >= 32 && cp < 0x110000 ? String.fromCodePoint(cp) : "";
  });
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/\u20b1/gi, "PHP ");
  s = s.replace(/₱/g, "PHP ");
  s = s.replace(/×/g, "x");
  s = s.replace(/\u00d7/g, "x");
  s = s.replace(/[\u00a0\u202f\u2007\u200b\u200c\u200d\ufeff]/g, " ");
  s = s.replace(/\r\n|\r|\n/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function computeBookingSummary(rows) {
  const byStatus = {};
  let sumTotal = 0;
  let sumPaid = 0;
  let sumBal = 0;
  for (const r of rows) {
    const st = String(r.status || "—");
    byStatus[st] = (byStatus[st] || 0) + 1;
    sumTotal += parseMoneyStr(r.price);
    sumPaid += parseMoneyStr(r.amountpaid);
    sumBal += parseMoneyStr(r.balance);
  }
  return { count: rows.length, byStatus, sumTotal, sumPaid, sumBal };
}

const ROOM_SUMMARY_COLS = ["Ref", "Room", "Package", "Customer", "In", "Out", "Status", "Total", "Paid", "Balance"];

const EVENT_SUMMARY_COLS = ["Ref", "Event", "Customer", "Start", "End", "Status", "Total", "Paid", "Balance"];

function roomRowToSummaryCells(r) {
  return [
    shortBookingRef(r.refnum),
    sanitizeBookingPrintCell(r.number),
    sanitizeBookingPrintCell(r.type),
    sanitizeBookingPrintCell(r.customer),
    sanitizeBookingPrintCell(r.checkin),
    sanitizeBookingPrintCell(r.checkout),
    sanitizeBookingPrintCell(r.status),
    fmtSummaryPhp(parseMoneyStr(r.price)),
    fmtSummaryPhp(parseMoneyStr(r.amountpaid)),
    fmtSummaryPhp(parseMoneyStr(r.balance)),
  ];
}

function eventRowToSummaryCells(r) {
  return [
    shortBookingRef(r.refnum),
    sanitizeBookingPrintCell(r.event),
    sanitizeBookingPrintCell(r.customer),
    sanitizeBookingPrintCell(r.checkin),
    sanitizeBookingPrintCell(r.checkout),
    sanitizeBookingPrintCell(r.status),
    fmtSummaryPhp(parseMoneyStr(r.price)),
    fmtSummaryPhp(parseMoneyStr(r.amountpaid)),
    fmtSummaryPhp(parseMoneyStr(r.balance)),
  ];
}

function summaryCellPdf(v) {
  return pdfSafeText(sanitizeBookingPrintCell(v), 240);
}

/** Client-side PDF: overall summary + compact table (A4 landscape). */
function buildBookingReportPdf({ variant, monthLabel, roomRows, eventRows, printMonthKey }) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - 2 * margin;
  let y = margin + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ABELA SUITES", margin, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Period: ${bookingPdfSafe(monthLabel, 200)}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    variant === "room" ? "Room reservations — overall summary" : "Event reservations — overall summary",
    margin,
    y,
  );
  y += 7;
  doc.setDrawColor(210, 198, 178);
  doc.setLineWidth(0.35);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  const rows = variant === "room" ? roomRows : eventRows;
  if (rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      variant === "room" ? "No room bookings for this period." : "No event bookings for this period.",
      margin,
      y,
    );
  } else {
    const sum = computeBookingSummary(rows);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Summary", margin, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Total bookings: ${sum.count}`, margin, y);
    y += 5;
    const statusParts = Object.entries(sum.byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${bookingPdfSafe(k, 120)}: ${v}`);
    const statusBlob = statusParts.join("   ");
    const statusLines = doc.splitTextToSize(statusBlob, contentW);
    for (let i = 0; i < statusLines.length; i += 1) {
      y = bookingPdfEnsure(doc, y, bookingPdfLineH(9.5), margin, pageH);
      doc.text(statusLines[i], margin, y);
      y += bookingPdfLineH(9.5);
    }
    y += 2;
    doc.text(`Total booking amount: ${bookingPdfSafe(fmtSummaryPhp(sum.sumTotal), 80)}`, margin, y);
    y += 5;
    doc.text(`Total collected (paid): ${bookingPdfSafe(fmtSummaryPhp(sum.sumPaid), 80)}`, margin, y);
    y += 5;
    doc.text(`Total balance due: ${bookingPdfSafe(fmtSummaryPhp(sum.sumBal), 80)}`, margin, y);
    y += 8;

    doc.setDrawColor(210, 198, 178);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    const head = variant === "room" ? [ROOM_SUMMARY_COLS] : [EVENT_SUMMARY_COLS];
    const body =
      variant === "room"
        ? roomRows.map((r) => roomRowToSummaryCells(r).map(summaryCellPdf))
        : eventRows.map((r) => eventRowToSummaryCells(r).map(summaryCellPdf));

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "striped",
      styles: {
        fontSize: 8.5,
        cellPadding: 1.05,
        overflow: "linebreak",
        valign: "top",
        font: "helvetica",
      },
      headStyles: { fillColor: PDF_HEAD_RGB, fontSize: 8.5, textColor: 255, fontStyle: "bold" },
      bodyStyles: { fontSize: 8.5 },
      margin: { left: margin, right: margin },
    });
  }

  const slug = (printMonthKey || "all-time").replace(/[^\d-]/g, "") || "all-time";
  const filename = `Abela_bookings_${variant}_${slug}.pdf`;
  return { doc, filename };
}

function downloadBookingReportPdf(opts) {
  const { doc, filename } = buildBookingReportPdf(opts);
  doc.save(filename);
}

function printBookingReportPdf(opts) {
  const { doc, filename } = buildBookingReportPdf(opts);
  openPdfPrintOrDownload(doc, filename);
}

function BookingPrintModal({ open, onClose, monthLabel, variant, roomRows, eventRows, printMonthKey }) {
  if (!open) return null;

  const tableRows = variant === "room" ? roomRows : eventRows;
  const summary = useMemo(() => computeBookingSummary(tableRows), [tableRows]);
  const heading =
    variant === "room" ? "Room reservations — overall summary" : "Event reservations — overall summary";

  const handleDownloadPdf = () => {
    downloadBookingReportPdf({
      variant,
      monthLabel,
      roomRows,
      eventRows,
      printMonthKey,
    });
  };

  const handlePrintPdf = () => {
    printBookingReportPdf({
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
            <p className="bm-print-summary-note">
              Totals and a compact list for this period. Open a booking in Booking Management for full contact,
              requests, and proof of payment.
            </p>
          </header>

          {variant === "room" && (
            <section className="bm-print-section">
              <h3 className="bm-print-section-title">Room summary</h3>
              {roomRows.length === 0 ? (
                <div className="bm-print-empty bm-print-empty--card">No room bookings for this period.</div>
              ) : (
                <div className="bm-print-cards-wrap bm-print-summary-wrap">
                  <div className="bm-print-summary-stats">
                    <div className="bm-print-summary-stats-grid">
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total bookings</span>
                        <strong className="bm-print-summary-stat-value">{summary.count}</strong>
                      </div>
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total amount</span>
                        <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumTotal)}</strong>
                      </div>
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total collected</span>
                        <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumPaid)}</strong>
                      </div>
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total balance due</span>
                        <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumBal)}</strong>
                      </div>
                    </div>
                    <div className="bm-print-summary-pills" aria-label="By status">
                      {Object.entries(summary.byStatus)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, n]) => (
                          <span key={label} className="bm-print-summary-pill">
                            {label}: {n}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="bm-print-table-wrap bm-print-summary-table-wrap">
                    <table className="bm-print-summary-table">
                      <thead>
                        <tr>
                          {ROOM_SUMMARY_COLS.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {roomRows.map((r) => (
                          <tr key={r.bookingId || r.refnum}>
                            {roomRowToSummaryCells(r).map((cell, i) => (
                              <td key={i}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          )}

          {variant === "event" && (
            <section className="bm-print-section">
              <h3 className="bm-print-section-title">Event summary</h3>
              {eventRows.length === 0 ? (
                <div className="bm-print-empty bm-print-empty--card">No event bookings for this period.</div>
              ) : (
                <div className="bm-print-cards-wrap bm-print-summary-wrap">
                  <div className="bm-print-summary-stats">
                    <div className="bm-print-summary-stats-grid">
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total bookings</span>
                        <strong className="bm-print-summary-stat-value">{summary.count}</strong>
                      </div>
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total amount</span>
                        <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumTotal)}</strong>
                      </div>
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total collected</span>
                        <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumPaid)}</strong>
                      </div>
                      <div className="bm-print-summary-stat">
                        <span className="bm-print-summary-stat-label">Total balance due</span>
                        <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumBal)}</strong>
                      </div>
                    </div>
                    <div className="bm-print-summary-pills" aria-label="By status">
                      {Object.entries(summary.byStatus)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, n]) => (
                          <span key={label} className="bm-print-summary-pill">
                            {label}: {n}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="bm-print-table-wrap bm-print-summary-table-wrap">
                    <table className="bm-print-summary-table">
                      <thead>
                        <tr>
                          {EVENT_SUMMARY_COLS.map((c) => (
                            <th key={c}>{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {eventRows.map((r) => (
                          <tr key={r.bookingId || r.refnum}>
                            {eventRowToSummaryCells(r).map((cell, i) => (
                              <td key={i}>{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
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
          <button type="button" className="bm-print-footer-btn primary" onClick={handlePrintPdf}>
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
  if (!d) return null;
  const proofBooking = { paymentMethod: d.paymentMethod || d.paymethod, paymentProofData: d.paymentProofData };
  const proofSrc = paymentProofFromBooking(proofBooking);
  const payLine = derivePaymentStatusLine(
    { paymentMethod: d.paymentMethod || d.paymethod, transactionId: d.transid },
    proofSrc,
  );
  return (
    <div className="rdm">
      <div className="rdm-status-bar">
        <div className="rdm-pill rdm-pill--booking">
          <span className="rdm-pill__k">Booking status</span>
          <span className="rdm-pill__v">
            <Badge status={d.status} />
          </span>
        </div>
        <div className="rdm-pill rdm-pill--payment">
          <span className="rdm-pill__k">Payment status</span>
          <span className="rdm-pill__v">{payLine}</span>
        </div>
        <div className="rdm-pill rdm-pill--balance">
          <span className="rdm-pill__k">Remaining balance</span>
          <span className="rdm-pill__v">{d.balance}</span>
        </div>
      </div>
      <div className="rdm-grid">
        <section className="rdm-card">
          <h4 className="rdm-card__title">Booking information</h4>
          <dl className="rdm-dl">
            <div>
              <dt className="rdm-dt">Room no.</dt>
              <dd className="rdm-dd">{d.number}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Package</dt>
              <dd className="rdm-dd">{d.type}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Check-in</dt>
              <dd className="rdm-dd">{d.checkin}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Check-out</dt>
              <dd className="rdm-dd">{d.checkout}</dd>
            </div>
          </dl>
        </section>
        <section className="rdm-card">
          <h4 className="rdm-card__title">Guest information</h4>
          <dl className="rdm-dl">
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Guest</dt>
              <dd className="rdm-dd">{d.customer}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Email</dt>
              <dd className="rdm-dd rdm-dd--muted">{d.email}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Contact</dt>
              <dd className="rdm-dd">{d.contact}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Additional guests</dt>
              <dd className="rdm-dd">{d.guestcount}</dd>
            </div>
          </dl>
        </section>
        <section className="rdm-card rdm-card--span2">
          <h4 className="rdm-card__title">Billing summary</h4>
          <div className="rdm-billing">
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Total amount</div>
              <div className="rdm-billing__value">{d.price}</div>
            </div>
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Downpayment</div>
              <div className="rdm-billing__value">{d.downpayment}</div>
            </div>
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Total paid</div>
              <div className="rdm-billing__value">{d.amountpaid}</div>
            </div>
            <div className="rdm-billing__cell rdm-billing__cell--highlight">
              <div className="rdm-billing__label">Remaining balance</div>
              <div className="rdm-billing__value">{d.balance}</div>
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
              <dd className="rdm-dd">{d.amountpaid}</dd>
            </div>
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Transaction ID</dt>
              <dd className="rdm-dd rdm-dd--muted">{d.transid || "—"}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Payment date</dt>
              <dd className="rdm-dd">{d.paydate || "—"}</dd>
            </div>
          </dl>
        </section>
        <ReservationProofPreview booking={proofBooking} proofSrc={proofSrc} />
        <GovernmentIdPreview
          booking={{
            governmentIdUrl: d.governmentIdUrl,
            validIdPhotoUrl: d.governmentIdUrl,
            guest: d.guest,
          }}
        />
      </div>
    </div>
  );
}

function EventModal({ d }) {
  if (!d) return null;
  const proofBooking = { paymentMethod: d.paymentMethod || d.paymethod, paymentProofData: d.paymentProofData };
  const proofSrc = paymentProofFromBooking(proofBooking);
  const payLine = derivePaymentStatusLine(
    { paymentMethod: d.paymentMethod || d.paymethod, transactionId: d.transid },
    proofSrc,
  );
  return (
    <div className="rdm">
      <div className="rdm-status-bar">
        <div className="rdm-pill rdm-pill--booking">
          <span className="rdm-pill__k">Booking status</span>
          <span className="rdm-pill__v">
            <Badge status={d.status} />
          </span>
        </div>
        <div className="rdm-pill rdm-pill--payment">
          <span className="rdm-pill__k">Payment status</span>
          <span className="rdm-pill__v">{payLine}</span>
        </div>
        <div className="rdm-pill rdm-pill--balance">
          <span className="rdm-pill__k">Remaining balance</span>
          <span className="rdm-pill__v">{d.balance}</span>
        </div>
      </div>
      <div className="rdm-grid">
        <section className="rdm-card">
          <h4 className="rdm-card__title">Booking information</h4>
          <dl className="rdm-dl">
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Venue / event</dt>
              <dd className="rdm-dd">{d.event}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Date</dt>
              <dd className="rdm-dd">{d.checkin}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Time slot</dt>
              <dd className="rdm-dd">{d.timeslot || "—"}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Attendees</dt>
              <dd className="rdm-dd">{d.attendees}</dd>
            </div>
          </dl>
        </section>
        <section className="rdm-card">
          <h4 className="rdm-card__title">Guest information</h4>
          <dl className="rdm-dl">
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Guest</dt>
              <dd className="rdm-dd">{d.customer}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Email</dt>
              <dd className="rdm-dd rdm-dd--muted">{d.email}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Contact</dt>
              <dd className="rdm-dd">{d.contact}</dd>
            </div>
          </dl>
        </section>
        <section className="rdm-card rdm-card--span2">
          <h4 className="rdm-card__title">Requests</h4>
          <p className="rdm-dd rdm-dd--muted" style={{ margin: 0 }}>
            {d.requests && String(d.requests).trim() ? d.requests : "None"}
          </p>
        </section>
        <section className="rdm-card rdm-card--span2">
          <h4 className="rdm-card__title">Billing summary</h4>
          <div className="rdm-billing">
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Total amount</div>
              <div className="rdm-billing__value">{d.price}</div>
            </div>
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Downpayment</div>
              <div className="rdm-billing__value">{d.downpayment}</div>
            </div>
            <div className="rdm-billing__cell">
              <div className="rdm-billing__label">Total paid</div>
              <div className="rdm-billing__value">{d.amountpaid}</div>
            </div>
            <div className="rdm-billing__cell rdm-billing__cell--highlight">
              <div className="rdm-billing__label">Remaining balance</div>
              <div className="rdm-billing__value">{d.balance}</div>
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
              <dd className="rdm-dd">{d.amountpaid}</dd>
            </div>
            <div className="rdm-dl__full">
              <dt className="rdm-dt">Transaction ID</dt>
              <dd className="rdm-dd rdm-dd--muted">{d.transid || "—"}</dd>
            </div>
            <div>
              <dt className="rdm-dt">Payment date</dt>
              <dd className="rdm-dd">{d.paydate || "—"}</dd>
            </div>
          </dl>
        </section>
        <ReservationProofPreview booking={proofBooking} proofSrc={proofSrc} />
        <GovernmentIdPreview
          booking={{
            governmentIdUrl: d.governmentIdUrl,
            validIdPhotoUrl: d.governmentIdUrl,
            guest: d.guest,
          }}
        />
      </div>
    </div>
  );
}

export default function BookingManagement() {
  const { mainStyle } = useAdminShell();
  const [activeTab, setActiveTab] = useState("room");
  const [search, setSearch] = useState("");
  const [roomPage, setRoomPage] = useState(1);
  const [eventPage, setEventPage] = useState(1);
  const [viewModal, setViewModal] = useState(null);
  const [viewDetailBooking, setViewDetailBooking] = useState(null);
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

  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const bookingId = String(searchParams.get("bookingId") || "").trim();
    if (!bookingId || bookingsLoading) return;

    const tabParam = String(searchParams.get("tab") || "").toLowerCase();
    const eventRow = eventData.find((r) => String(r.bookingId) === bookingId);
    const roomRow = roomData.find((r) => String(r.bookingId) === bookingId);
    const row = tabParam === "event" ? eventRow : tabParam === "room" ? roomRow : eventRow || roomRow;
    if (!row) return;

    const type = eventRow && row === eventRow ? "event" : "room";
    setActiveTab(type);
    setViewModal({ data: row, type });
    setSearchParams({}, { replace: true });
  }, [searchParams, roomData, eventData, bookingsLoading, setSearchParams]);

  useEffect(() => {
    if (!viewModal?.data?.bookingId) {
      setViewDetailBooking(null);
      return undefined;
    }
    let cancelled = false;
    setViewDetailBooking(null);
    fetchBookingByIdBackend(viewModal.data.bookingId)
      .then((b) => {
        if (!cancelled && b && String(b.id) === String(viewModal.data.bookingId)) setViewDetailBooking(b);
      })
      .catch(() => {
        if (!cancelled) setViewDetailBooking(null);
      });
    return () => {
      cancelled = true;
    };
  }, [viewModal]);

  const notifications = [
    { msg: "Your reservation progress is pending", time: "2/19/2026, 10:39:00 AM" },
    { msg: "Your reservation was approved", time: "2/19/2026, 10:39:00 AM" },
    { msg: "Your reservation was declined", time: "2/19/2026, 10:39:00 AM" },
  ];

  const filteredRooms = useMemo(() => {
    const q = search.toLowerCase();
    return roomData.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [roomData, search]);

  const filteredEvents = useMemo(() => {
    const q = search.toLowerCase();
    return eventData.filter((e) =>
      Object.values(e).some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [eventData, search]);

  const roomTotalPages = Math.max(1, Math.ceil(filteredRooms.length / BOOKING_PAGE_SIZE));
  const roomCurrentPage = Math.min(Math.max(1, roomPage), roomTotalPages);
  const roomPageStart = (roomCurrentPage - 1) * BOOKING_PAGE_SIZE;
  const pagedRooms = filteredRooms.slice(roomPageStart, roomPageStart + BOOKING_PAGE_SIZE);
  const roomRangeFrom = filteredRooms.length === 0 ? 0 : roomPageStart + 1;
  const roomRangeTo = filteredRooms.length === 0 ? 0 : roomPageStart + pagedRooms.length;

  const eventTotalPages = Math.max(1, Math.ceil(filteredEvents.length / BOOKING_PAGE_SIZE));
  const eventCurrentPage = Math.min(Math.max(1, eventPage), eventTotalPages);
  const eventPageStart = (eventCurrentPage - 1) * BOOKING_PAGE_SIZE;
  const pagedEvents = filteredEvents.slice(eventPageStart, eventPageStart + BOOKING_PAGE_SIZE);
  const eventRangeFrom = filteredEvents.length === 0 ? 0 : eventPageStart + 1;
  const eventRangeTo = filteredEvents.length === 0 ? 0 : eventPageStart + pagedEvents.length;

  useEffect(() => {
    setRoomPage(1);
    setEventPage(1);
  }, [search]);

  useEffect(() => {
    setRoomPage((p) => Math.min(Math.max(1, p), roomTotalPages));
  }, [roomTotalPages]);

  useEffect(() => {
    setEventPage((p) => Math.min(Math.max(1, p), eventTotalPages));
  }, [eventTotalPages]);

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

  const viewMergedRow = useMemo(() => {
    if (!viewModal?.data) return null;
    const base = viewModal.data;
    if (!viewDetailBooking || String(viewDetailBooking.id) !== String(base.bookingId)) return base;
    return {
      ...base,
      transid: viewDetailBooking.transactionId || base.transid,
      paydate:
        viewDetailBooking.paymentDate && String(viewDetailBooking.paymentDate).trim()
          ? formatBookingPaymentDate(viewDetailBooking.paymentDate)
          : base.paydate,
      paymentProofData: viewDetailBooking.paymentProofData || base.paymentProofData || "",
      paymentMethod: viewDetailBooking.paymentMethod || base.paymentMethod,
      paymethod: viewDetailBooking.paymentMethod || base.paymethod,
      governmentIdUrl:
        viewDetailBooking.governmentIdUrl ||
        viewDetailBooking.validIdPhotoUrl ||
        base.governmentIdUrl ||
        "",
      guest: viewDetailBooking.guest || base.guest,
    };
  }, [viewModal, viewDetailBooking]);

  return (
    <>
      <RailPortalShell rootClassName="app-layout admin-app-layout" mainStyle={mainStyle} sidebar={<AdminSidebarNav />}>
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

          {/* Search | month | Print (same row pattern as front desk bills) */}
          <div className="bm-main-toolbar">
            <div className="bm-toolbar-search-col">
              <div className="bm-toolbar-search-wrap">
                <span className="bm-toolbar-search-icon" aria-hidden>
                  {icons.search}
                </span>
                <input
                  type="search"
                  className="bm-toolbar-search-input"
                  placeholder="Search guest..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                  aria-label="Search reservations"
                />
              </div>
            </div>
            <div className="bm-toolbar-month-col">
              <div className="bm-toolbar-month-head">
                <span className="bm-toolbar-month-label">Select month</span>
                {printMonth ? (
                  <button type="button" className="bm-toolbar-month-clear" onClick={() => setPrintMonth("")}>
                    Clear
                  </button>
                ) : null}
              </div>
              <div className="bm-toolbar-month-input-wrap">
                <input
                  id="bm-booking-print-month"
                  type="month"
                  className="bm-toolbar-month-input"
                  value={printMonth}
                  onChange={(e) => setPrintMonth(e.target.value)}
                  aria-label="Select month for booking reports"
                />
              </div>
            </div>
            <div className="bm-toolbar-print-col">
              <button
                type="button"
                className="bm-toolbar-print-btn"
                onClick={() => openBookingPrint(activeTab === "room" ? "room" : "event")}
                title={
                  activeTab === "room"
                    ? "Open printable room booking report for the selected month (or all time if empty)."
                    : "Open printable event booking report for the selected month (or all time if empty)."
                }
              >
                <svg
                  className="bm-toolbar-print-icon"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  width="18"
                  height="18"
                  aria-hidden
                >
                  <polyline points="6 9 6 2 18 2 18 9" />
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                  <rect x="6" y="14" width="12" height="8" />
                </svg>
                Print
              </button>
            </div>
          </div>
          <div className="bm-toolbar-subrow">
            <p className="bm-toolbar-hint">
              Leave empty to include all bookings. Dates use room check-in or event date.
            </p>
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
                      pagedRooms.map((row, i) => (
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
                {!bookingsLoading && filteredRooms.length > 0 ? (
                  <div className="bm-pagination-bar" aria-label="Room reservations pages">
                    <span className="bm-pagination-info">
                      Showing {roomRangeFrom}–{roomRangeTo} of {filteredRooms.length}
                    </span>
                    <div className="bm-pagination-btns">
                      <button
                        type="button"
                        className="bm-page-btn"
                        disabled={roomCurrentPage <= 1}
                        onClick={() => setRoomPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="bm-pagination-pages">
                        Page {roomCurrentPage} of {roomTotalPages}
                      </span>
                      <button
                        type="button"
                        className="bm-page-btn"
                        disabled={roomCurrentPage >= roomTotalPages}
                        onClick={() => setRoomPage((p) => Math.min(roomTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
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
                      pagedEvents.map((row, i) => (
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
                {!bookingsLoading && filteredEvents.length > 0 ? (
                  <div className="bm-pagination-bar" aria-label="Event reservations pages">
                    <span className="bm-pagination-info">
                      Showing {eventRangeFrom}–{eventRangeTo} of {filteredEvents.length}
                    </span>
                    <div className="bm-pagination-btns">
                      <button
                        type="button"
                        className="bm-page-btn"
                        disabled={eventCurrentPage <= 1}
                        onClick={() => setEventPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </button>
                      <span className="bm-pagination-pages">
                        Page {eventCurrentPage} of {eventTotalPages}
                      </span>
                      <button
                        type="button"
                        className="bm-page-btn"
                        disabled={eventCurrentPage >= eventTotalPages}
                        onClick={() => setEventPage((p) => Math.min(eventTotalPages, p + 1))}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                ) : null}
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
        onClose={() => {
          setViewModal(null);
          setViewDetailBooking(null);
        }}
        title="Reservation Details"
        size="lg"
        placement="center"
        panelClassName="bm-reservation-modal rdm-shell-panel"
        bodyClassName="modal-body-scroll rdm-shell-body"
      >
        {viewModal && viewMergedRow ? (
          viewModal.type === "room" ? (
            <RoomModal d={viewMergedRow} />
          ) : (
            <EventModal d={viewMergedRow} />
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