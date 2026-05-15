import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { fetchCurrentUserMeBackend } from "../api/guestApi";
import { getBilling, updatePayment, getBillingById } from "../api/cashier.service";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfSafeText, openPdfPrintOrDownload } from "../utils/pdfClientExport";
import "./bills.css";

const BILLING_POLL_MS = 30000;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const BM_PRINT_LOGO_SRC = `${import.meta.env.BASE_URL}logo.jpg`;

const PDF_HEAD_RGB = [184, 146, 42];

const BILLS_SUMMARY_COLS = ["Ref", "Guest", "Type", "Booking", "Total", "Paid", "Balance", "Status", "Billed"];

function parseDateForMonthFilter(d) {
  if (d == null || d === "" || d === "—") return null;
  const s = String(d);
  const dt = s.includes("T") ? new Date(s) : new Date(`${s}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** When month is "" (YYYY-MM), include all rows; otherwise filter by billing `createdAt`. */
function rowInSelectedMonth(sortDate, monthYyyyMm) {
  if (!monthYyyyMm) return true;
  const dt = parseDateForMonthFilter(sortDate);
  if (!dt) return false;
  const [y, m] = monthYyyyMm.split("-").map(Number);
  return dt.getFullYear() === y && dt.getMonth() + 1 === m;
}

function billCreatedSortKey(r) {
  const d = r?.createdAt;
  if (d == null || d === "") return "";
  if (typeof d === "string") return d;
  try {
    return new Date(d).toISOString();
  } catch {
    return "";
  }
}

function shortBillId(id) {
  const s = String(id ?? "").trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

function billsPdfLineH(fsPt) {
  return (fsPt * 0.352778) * 1.38;
}

function billsPdfEnsure(doc, y, needMm, margin, pageH) {
  if (y + needMm > pageH - margin) {
    doc.addPage();
    return margin;
  }
  return y;
}

function sanitizeBillsPrintCell(v) {
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

function billsPdfSafe(v, maxLen = 4000) {
  return pdfSafeText(sanitizeBillsPrintCell(v), maxLen);
}

function fmtSummaryPhp(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `PHP ${x.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatBilledAt(createdAt) {
  if (createdAt == null || createdAt === "") return "—";
  try {
    const d = typeof createdAt === "string" ? new Date(createdAt) : new Date(createdAt);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-PH", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function computeBillsSummary(rows) {
  const byStatus = {};
  let sumTotal = 0;
  let sumPaid = 0;
  let sumBal = 0;
  for (const r of rows) {
    const st = paymentStatusLabel(r.paymentStatus);
    byStatus[st] = (byStatus[st] || 0) + 1;
    sumTotal += Number(r.totalAmount) || 0;
    sumPaid += Number(r.amountPaid) || 0;
    sumBal += Number(r.balance) || 0;
  }
  return { count: rows.length, byStatus, sumTotal, sumPaid, sumBal };
}

function billRowToSummaryCells(r) {
  return [
    shortBillId(r.id),
    sanitizeBillsPrintCell(r.guestName),
    bookingTypeLabel(r.bookingType),
    sanitizeBillsPrintCell(r.contextLabel),
    fmtSummaryPhp(Number(r.totalAmount) || 0),
    fmtSummaryPhp(Number(r.amountPaid) || 0),
    fmtSummaryPhp(Number(r.balance) || 0),
    paymentStatusLabel(r.paymentStatus),
    formatBilledAt(r.createdAt),
  ];
}

function summaryCellPdf(v) {
  return pdfSafeText(sanitizeBillsPrintCell(v), 240);
}

function billsReportTitle(variant) {
  if (variant === "room") return "Room bills — overall summary";
  if (variant === "event") return "Event bills — overall summary";
  return "All billing records — overall summary";
}

function billsReportEmptyMessage(variant) {
  if (variant === "room") return "No room billing rows for this period.";
  if (variant === "event") return "No event billing rows for this period.";
  return "No billing rows for this period.";
}

/** Client-side PDF: overall summary + compact table (A4 landscape). */
function buildBillsReportPdf({ variant, monthLabel, rows, printMonthKey }) {
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
  doc.text(`Period: ${billsPdfSafe(monthLabel, 200)}`, margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(billsReportTitle(variant), margin, y);
  y += 7;
  doc.setDrawColor(210, 198, 178);
  doc.setLineWidth(0.35);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  if (rows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(billsReportEmptyMessage(variant), margin, y);
  } else {
    const sum = computeBillsSummary(rows);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Summary", margin, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Total rows: ${sum.count}`, margin, y);
    y += 5;
    const statusParts = Object.entries(sum.byStatus)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${billsPdfSafe(k, 120)}: ${v}`);
    const statusBlob = statusParts.join("   ");
    const statusLines = doc.splitTextToSize(statusBlob, contentW);
    for (let i = 0; i < statusLines.length; i += 1) {
      y = billsPdfEnsure(doc, y, billsPdfLineH(9.5), margin, pageH);
      doc.text(statusLines[i], margin, y);
      y += billsPdfLineH(9.5);
    }
    y += 2;
    doc.text(`Total billed: ${billsPdfSafe(fmtSummaryPhp(sum.sumTotal), 80)}`, margin, y);
    y += 5;
    doc.text(`Total collected (paid): ${billsPdfSafe(fmtSummaryPhp(sum.sumPaid), 80)}`, margin, y);
    y += 5;
    doc.text(`Total balance: ${billsPdfSafe(fmtSummaryPhp(sum.sumBal), 80)}`, margin, y);
    y += 8;

    doc.setDrawColor(210, 198, 178);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    const head = [BILLS_SUMMARY_COLS];
    const body = rows.map((r) => billRowToSummaryCells(r).map(summaryCellPdf));

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
  const vslug = variant === "all" ? "all" : variant;
  const filename = `Abela_bills_${vslug}_${slug}.pdf`;
  return { doc, filename };
}

function downloadBillsReportPdf(opts) {
  const { doc, filename } = buildBillsReportPdf(opts);
  doc.save(filename);
}

function printBillsReportPdf(opts) {
  const { doc, filename } = buildBillsReportPdf(opts);
  openPdfPrintOrDownload(doc, filename);
}

async function fetchAllBillingForExport(typeFilter, search, signal) {
  const type = typeFilter === "room" || typeFilter === "event" ? typeFilter : "";
  const out = [];
  let pageNum = 1;
  const pageLimit = 100;
  for (;;) {
    const res = await getBilling(
      pageNum,
      pageLimit,
      {
        ...(type ? { type } : {}),
        search: search || undefined,
      },
      { signal },
    );
    const list = Array.isArray(res?.data) ? res.data : [];
    out.push(...list);
    const tp = Math.max(1, Number(res?.totalPages) || 1);
    if (pageNum >= tp || list.length === 0) break;
    pageNum += 1;
    if (pageNum > 2000) break;
  }
  return out;
}

function BillsPrintModal({ open, onClose, monthLabel, variant, rows, printMonthKey, loading, error }) {
  const summary = useMemo(() => computeBillsSummary(rows), [rows]);

  if (!open) return null;

  const heading = billsReportTitle(variant);

  const handleDownloadPdf = () => {
    downloadBillsReportPdf({
      variant,
      monthLabel,
      rows,
      printMonthKey,
    });
  };

  const handlePrintPdf = () => {
    printBillsReportPdf({
      variant,
      monthLabel,
      rows,
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
      <div className="bm-print-dialog" role="dialog" aria-modal="true" aria-labelledby="bills-print-heading">
        <div className="bm-print-dialog-bar no-print">
          <h2 id="bills-print-heading" className="bm-print-dialog-title">
            Print preview
          </h2>
          <button type="button" className="bm-print-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className="bm-print-surface" id="bills-print-surface">
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
              Totals and a compact list for this period (respects the search box and tab when you opened the report). Use
              per-row PDF on the table for a single billing snapshot.
            </p>
          </header>

          <section className="bm-print-section">
            <h3 className="bm-print-section-title">Billing summary</h3>
            {loading ? (
              <div className="bm-print-empty bm-print-empty--card">Loading billing records…</div>
            ) : error ? (
              <div className="bm-print-empty bm-print-empty--card">{error}</div>
            ) : rows.length === 0 ? (
              <div className="bm-print-empty bm-print-empty--card">{billsReportEmptyMessage(variant)}</div>
            ) : (
              <div className="bm-print-cards-wrap bm-print-summary-wrap">
                <div className="bm-print-summary-stats">
                  <div className="bm-print-summary-stats-grid">
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Total rows</span>
                      <strong className="bm-print-summary-stat-value">{summary.count}</strong>
                    </div>
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Total billed</span>
                      <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumTotal)}</strong>
                    </div>
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Total collected</span>
                      <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumPaid)}</strong>
                    </div>
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Total balance</span>
                      <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumBal)}</strong>
                    </div>
                  </div>
                  <div className="bm-print-summary-pills" aria-label="By payment status">
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
                        {BILLS_SUMMARY_COLS.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => (
                        <tr key={r.id}>
                          {billRowToSummaryCells(r).map((cell, i) => (
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
        </div>

        <div className="bm-print-footer no-print">
          <button type="button" className="bm-print-footer-btn secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="bm-print-footer-btn pdf" onClick={handleDownloadPdf} disabled={loading || !!error || rows.length === 0}>
            Download PDF
          </button>
          <button type="button" className="bm-print-footer-btn primary" onClick={handlePrintPdf} disabled={loading || !!error || rows.length === 0}>
            Print
          </button>
        </div>
      </div>
    </div>
  );
}

function visiblePageNumbers(currentPage, totalPages) {
  const t = Math.max(1, Math.min(5000, Number(totalPages) || 1));
  const c = Math.min(Math.max(1, Number(currentPage) || 1), t);
  if (t <= 9) return Array.from({ length: t }, (_, i) => i + 1);
  const set = new Set([1, t, c, c - 1, c + 1]);
  return [...set].filter((p) => p >= 1 && p <= t).sort((a, b) => a - b);
}

function fmtPeso(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return "—";
  return `₱${x.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function paymentStatusLabel(st) {
  const k = String(st || "").toLowerCase();
  if (k === "paid") return "Paid";
  if (k === "partial") return "Partial";
  return "Unpaid";
}

function bookingTypeLabel(t) {
  const k = String(t || "").toLowerCase();
  if (k === "event") return "Event";
  return "Room";
}

/** Read-only snapshot from the current table row — no API, no DB writes. */
function downloadAdminBillingRowPdf(r) {
  const fmtPhp = (n) => {
    const v = Number(n);
    if (!Number.isFinite(v)) return "PHP 0.00";
    return `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("ABELA SUITES", margin, y);
  y += 7;
  doc.setFontSize(11);
  doc.text("Billing record (read-only)", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(pdfSafeText(`Generated: ${new Date().toLocaleString("en-PH")}`, 90), margin, y);
  y += 8;

  const body = [
    ["Billing ID", pdfSafeText(r.id, 48)],
    ["Booking ID", pdfSafeText(r.bookingId, 48)],
    ["Guest ID", pdfSafeText(r.guestId, 48)],
    ["Guest", pdfSafeText(String(r.guestName || "").trim() || "—", 80)],
    ["Type", pdfSafeText(bookingTypeLabel(r.bookingType), 24)],
    ["Booking / context", pdfSafeText(String(r.contextLabel || "").trim() || "—", 100)],
    ["Payment status", pdfSafeText(String(r.paymentStatus || "—"), 24)],
  ];

  autoTable(doc, {
    startY: y,
    head: [["Field", "Value"]],
    body,
    styles: { fontSize: 9, cellPadding: 1.8 },
    headStyles: { fillColor: [92, 74, 54], textColor: 255 },
    columnStyles: { 0: { cellWidth: 52 }, 1: { cellWidth: 124 } },
    margin: { left: margin, right: margin },
    theme: "grid",
  });

  y = (doc.lastAutoTable?.finalY || y) + 6;

  autoTable(doc, {
    startY: y,
    head: [["Summary", "Amount"]],
    body: [
      ["Total", fmtPhp(r.totalAmount)],
      ["Paid", fmtPhp(r.amountPaid)],
      ["Balance", fmtPhp(r.balance)],
    ],
    styles: { fontSize: 10, cellPadding: 2 },
    headStyles: { fillColor: [184, 146, 42], textColor: 255 },
    columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 66, halign: "right" } },
    margin: { left: margin, right: margin },
    theme: "striped",
  });

  const stamp = `${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}_${String(new Date().getHours()).padStart(2, "0")}${String(new Date().getMinutes()).padStart(2, "0")}${String(new Date().getSeconds()).padStart(2, "0")}`;
  const safeId = pdfSafeText(String(r.id || "billing"), 40).replace(/[^a-zA-Z0-9-_]/g, "_");
  openPdfPrintOrDownload(doc, `Abela_AdminBilling_${safeId}_${stamp}.pdf`);
}

/* ── SVG ICONS ── */
const Icons = {
  Room: () => (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden>
      <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
    </svg>
  ),
  Eye: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Print: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  ),
  Search: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="14" height="14">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  Check: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2ecc71" strokeWidth="2.2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
};

function Sidebar() {
  return <AdminSidebarNav logoSrc="/public/logo.png" />;
}

function Topbar({ onRequestLogout }) {
  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <AdminSidebarToggle />
        <span className="breadcrumb-title">Bills and Invoices</span>
      </div>
      <AdminTopbarActions notifications={[]} onRequestLogout={onRequestLogout} />
    </header>
  );
}

function StatCards({ totalItems, pageCount }) {
  return (
    <div className="bills-stats-row">
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <Icons.Room />
          Billing records
        </div>
        <div className="bills-stat-value">{totalItems}</div>
      </div>
      <div className="bills-stat-card">
        <div className="bills-stat-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          On this page
        </div>
        <div className="bills-stat-value">{pageCount}</div>
      </div>
    </div>
  );
}

/** Full billing bundle from GET /api/billing/:id */
function DetailsModal({ billingId, onClose }) {
  const [detail, setDetail] = useState(null);
  /** False while idle (no row selected); avoids stuck "Loading" when modal closes mid-fetch. */
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!billingId) {
      setLoading(false);
      setErr("");
      setDetail(null);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    setErr("");
    setDetail(null);
    void (async () => {
      try {
        const r = await getBillingById(billingId);
        if (!cancelled) setDetail(r);
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Could not load billing.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [billingId]);

  if (!billingId) return null;

  const g = detail?.guest || {};
  const b = detail?.booking || {};
  const bill = detail?.billing || {};
  const guestName = String(g.name || "").trim() || "—";
  const isRoom = String(b.type || "").toLowerCase() === "room";

  return (
    <div className="rm-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="rm-modal bills-details-modal">
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">Billing details</h2>
          <button type="button" className="rm-modal-close" onClick={onClose}>
            &#x2715;
          </button>
        </div>
        <div className="rm-modal-body">
          {loading ? (
            <div className="bills-modal-loading">Loading…</div>
          ) : err ? (
            <div className="bills-modal-error">{err}</div>
          ) : (
            <>
              <div className="bill-detail-row">
                <strong>Billing ID:</strong> {billingId}
              </div>
              <div className="bill-detail-row">
                <strong>Guest:</strong> {guestName}
              </div>
              {isRoom ? (
                <>
                  <div className="bill-detail-row">
                    <strong>Room / stay:</strong> {String(b.room || "").trim() || "—"}
                  </div>
                  <div className="bill-detail-row">
                    <strong>Check-in:</strong> {String(b.checkIn || "").trim() || "—"}
                  </div>
                  <div className="bill-detail-row">
                    <strong>Check-out:</strong> {String(b.checkOut || "").trim() || "—"}
                  </div>
                </>
              ) : (
                <>
                  <div className="bill-detail-row">
                    <strong>Venue / event:</strong> {String(b.venueName || b.eventTitle || b.room || "").trim() || "—"}
                  </div>
                  <div className="bill-detail-row">
                    <strong>Event date:</strong> {String(b.eventDate || "").trim() || "—"}
                  </div>
                </>
              )}
              <div className="bill-detail-row">
                <strong>Booking status:</strong> {String(b.status || "").trim() || "—"}
              </div>
              <div className="bill-amount-box">
                <div className="bill-amount-row">
                  <strong>Total:</strong>
                  <span className="bill-amount-total">{fmtPeso(bill.totalAmount)}</span>
                </div>
                <div className="bill-amount-row">
                  <span className="bill-balance-label">Amount paid:</span>
                  <span>{fmtPeso(bill.amountPaid)}</span>
                </div>
                <div className="bill-amount-row">
                  <span className="bill-balance-label">Balance:</span>
                  <span className="bill-balance-value">{fmtPeso(bill.balance)}</span>
                </div>
                <div className="bill-detail-row" style={{ marginTop: 8 }}>
                  <strong>Payment status:</strong>{" "}
                  <span className={`bills-pay-badge bills-pay-badge--${String(bill.paymentStatus || "unpaid")}`}>
                    {paymentStatusLabel(bill.paymentStatus)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentModal({ row, onClose, onSaved }) {
  const total = Number(row?.totalAmount) || 0;
  const currentPaid = Number(row?.amountPaid) || 0;
  const [amountStr, setAmountStr] = useState(String(currentPaid));
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState("");

  useEffect(() => {
    setAmountStr(String(currentPaid));
    setFormErr("");
  }, [row?.id, currentPaid]);

  if (!row) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    const n = Number(String(amountStr).replace(/[₱,\s]/g, ""));
    if (!Number.isFinite(n) || n < 0) {
      setFormErr("Enter a valid non-negative amount.");
      return;
    }
    if (n > total + 1e-6) {
      setFormErr(`Amount paid cannot exceed total (${fmtPeso(total)}).`);
      return;
    }
    setBusy(true);
    setFormErr("");
    try {
      await updatePayment(row.id, n);
      onSaved?.();
      onClose();
    } catch (err) {
      setFormErr(err?.message || "Payment update failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rm-modal-backdrop active" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="rm-modal bills-payment-modal">
        <div className="rm-modal-header">
          <h2 className="rm-modal-title">Record payment</h2>
          <button type="button" className="rm-modal-close" disabled={busy} onClick={onClose}>
            &#x2715;
          </button>
        </div>
        <form className="rm-modal-body" onSubmit={handleSubmit}>
          <div className="bill-detail-row">
            <strong>Guest:</strong> {String(row.guestName || "").trim() || "—"}
          </div>
          <div className="bill-detail-row">
            <strong>Total due:</strong> {fmtPeso(total)}
          </div>
          <div className="bills-form-group">
            <label className="bills-form-label" htmlFor="cashier-amount-paid">
              Total amount paid (cumulative)
            </label>
            <input
              id="cashier-amount-paid"
              className="bills-search-input"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
            />
          </div>
          {formErr ? <div className="bills-modal-error">{formErr}</div> : null}
          <div className="bills-payment-actions">
            <button type="button" className="bills-btn-secondary" disabled={busy} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="bills-btn-primary" disabled={busy}>
              {busy ? "Saving…" : "Save payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Toast({ message, visible }) {
  return (
    <div className={`bills-toast${visible ? " active" : ""}`}>
      <Icons.Check />
      <span>{message}</span>
    </div>
  );
}

export default function Bills() {
  const { mainStyle } = useAdminShell();
  const [billingTab, setBillingTab] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadNotice, setLoadNotice] = useState("");
  const [staffRole, setStaffRole] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [paymentRow, setPaymentRow] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const billingFetchGenRef = useRef(0);
  const printAbortRef = useRef(null);

  const [printMonth, setPrintMonth] = useState("");
  const [printOpen, setPrintOpen] = useState(false);
  const [printVariant, setPrintVariant] = useState("room");
  const [printRawRows, setPrintRawRows] = useState([]);
  const [printLoading, setPrintLoading] = useState(false);
  const [printError, setPrintError] = useState("");

  const printMonthLabel = useMemo(() => {
    if (!printMonth) return "All time";
    const [y, m] = printMonth.split("-");
    return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y}`;
  }, [printMonth]);

  const printRowsFiltered = useMemo(
    () => printRawRows.filter((r) => rowInSelectedMonth(billCreatedSortKey(r), printMonth)),
    [printRawRows, printMonth],
  );

  const closeBillsPrint = useCallback(() => {
    printAbortRef.current?.abort();
    printAbortRef.current = null;
    setPrintOpen(false);
  }, []);

  const openBillsPrint = useCallback(
    (variant) => {
      printAbortRef.current?.abort();
      const ac = new AbortController();
      printAbortRef.current = ac;
      setPrintVariant(variant);
      setPrintOpen(true);
      setPrintLoading(true);
      setPrintError("");
      setPrintRawRows([]);

      const typeForApi = variant === "room" || variant === "event" ? variant : "";

      void (async () => {
        try {
          const data = await fetchAllBillingForExport(typeForApi, debouncedSearch, ac.signal);
          if (!ac.signal.aborted) setPrintRawRows(data);
        } catch (e) {
          if (e?.name === "AbortError") return;
          if (!ac.signal.aborted) setPrintError(String(e?.message || "Could not load billing for export."));
        } finally {
          if (!ac.signal.aborted) setPrintLoading(false);
        }
      })();
    },
    [debouncedSearch],
  );

  const canRecordPayment =
    staffRole === "cashier" || staffRole === "admin" || staffRole === "superadmin";

  const showToast = (msg) => {
    setToast({ visible: true, message: msg });
    window.setTimeout(() => setToast({ visible: false, message: "" }), 2800);
  };

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const me = await fetchCurrentUserMeBackend();
        if (!cancelled) setStaffRole(String(me.role || "").trim().toLowerCase());
      } catch {
        if (!cancelled) setStaffRole("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [billingTab, debouncedSearch]);

  const refreshBillingPage = useCallback(
    async (opts = {}) => {
      const skipStaleGuard = Boolean(opts.skipStaleGuard);
      const gen = billingFetchGenRef.current;
      const pageToFetch =
        opts.page != null ? Math.max(1, parseInt(String(opts.page), 10) || 1) : Math.max(1, parseInt(String(page), 10) || 1);
      const typeFilter =
        billingTab === "room" || billingTab === "event" ? billingTab : "";
      try {
        const result = await getBilling(pageToFetch, limit, {
          type: typeFilter,
          search: debouncedSearch || undefined,
        });
        if (!skipStaleGuard && gen !== billingFetchGenRef.current) return;
        const list = Array.isArray(result?.data) ? result.data : [];
        if (list.length === 0 && (Number(result?.totalItems) || 0) > 0 && pageToFetch > 1) {
          setPage((p) => Math.max(1, p - 1));
          return;
        }
        const tp = Number(result?.totalPages);
        const ti = Number(result?.totalItems);
        setTotalPages(Number.isFinite(tp) && tp >= 1 ? Math.min(9999, tp) : 1);
        setTotalItems(Number.isFinite(ti) && ti >= 0 ? ti : list.length);
        setRows(list);
        if (opts.syncPageFromResult && result?.currentPage != null) {
          const cp = Math.max(1, parseInt(String(result.currentPage), 10) || 1);
          if (cp !== pageToFetch) setPage(cp);
        }
      } catch {
        if (!skipStaleGuard && gen !== billingFetchGenRef.current) return;
        /* silent for poll */
      }
    },
    [page, limit, billingTab, debouncedSearch],
  );

  useEffect(() => {
    billingFetchGenRef.current += 1;
    const fetchGen = billingFetchGenRef.current;
    let cancelled = false;
    const ac = new AbortController();
    setLoading(true);
    setLoadNotice("");

    const typeFilter = billingTab === "room" || billingTab === "event" ? billingTab : "";

    void (async () => {
      try {
        const result = await getBilling(page, limit, {
          type: typeFilter,
          search: debouncedSearch || undefined,
        }, { signal: ac.signal });
        if (cancelled || fetchGen !== billingFetchGenRef.current) return;
        const list = Array.isArray(result?.data) ? result.data : [];
        if (list.length === 0 && (Number(result?.totalItems) || 0) > 0 && page > 1) {
          setPage((p) => Math.max(1, p - 1));
          return;
        }
        const tp = Number(result?.totalPages);
        const ti = Number(result?.totalItems);
        setTotalPages(Number.isFinite(tp) && tp >= 1 ? Math.min(9999, tp) : 1);
        setTotalItems(Number.isFinite(ti) && ti >= 0 ? ti : list.length);
        setRows(list);
        const cp = Math.max(1, parseInt(String(result?.currentPage), 10) || page);
        if (cp !== page) setPage(cp);
      } catch (e) {
        if (cancelled || fetchGen !== billingFetchGenRef.current) return;
        if (e?.name === "AbortError") return;
        setRows([]);
        setTotalItems(0);
        setTotalPages(1);
        setLoadNotice(e?.message || "Could not load billing.");
      } finally {
        if (!cancelled && fetchGen === billingFetchGenRef.current) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [page, limit, billingTab, debouncedSearch]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshBillingPage({ skipStaleGuard: true });
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshBillingPage]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshBillingPage({ skipStaleGuard: true });
    }, BILLING_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshBillingPage]);

  const handlePaymentSaved = () => {
    showToast("Payment saved. List refreshed.");
    void (async () => {
      try {
        const result = await getBilling(page, limit, {
          type: billingTab === "room" || billingTab === "event" ? billingTab : "",
          search: debouncedSearch || undefined,
        });
        const list = Array.isArray(result?.data) ? result.data : [];
        const tp = Number(result?.totalPages);
        const ti = Number(result?.totalItems);
        setTotalPages(Number.isFinite(tp) && tp >= 1 ? Math.min(9999, tp) : 1);
        setTotalItems(Number.isFinite(ti) && ti >= 0 ? ti : list.length);
        setRows(list);
      } catch {
        /* ignore */
      }
    })();
  };

  const printRowSummary = (r) => {
    try {
      downloadAdminBillingRowPdf(r);
      showToast(`Opened PDF for bill ${r.id} (read-only).`);
    } catch (e) {
      showToast(String(e?.message || "Could not build PDF."));
    }
  };

  const billsSliceFrom = rows.length > 0 ? (page - 1) * limit + 1 : 0;
  const billsSliceTo = rows.length > 0 ? (page - 1) * limit + rows.length : 0;

  return (
    <>
      <RailPortalShell rootClassName="app-layout admin-app-layout bills-page" mainStyle={mainStyle} sidebar={<Sidebar />}>
        <Topbar onRequestLogout={requestLogout} />

        <main className="content">
          <div>
            <div className="bills-title">Billings management</div>
            <div className="bills-sub">
              Paginated ledger from MongoDB — cashiers and admins can record payments; front desk can view balances.
            </div>
          </div>

          <StatCards totalItems={totalItems} pageCount={rows.length} />

          <div className="bills-tabs">
            <button
              type="button"
              className={`bills-tab${billingTab === "" ? " active" : ""}`}
              onClick={() => setBillingTab("")}
            >
              All billing
            </button>
            <button
              type="button"
              className={`bills-tab${billingTab === "room" ? " active" : ""}`}
              onClick={() => setBillingTab("room")}
            >
              Room bills
            </button>
            <button
              type="button"
              className={`bills-tab${billingTab === "event" ? " active" : ""}`}
              onClick={() => setBillingTab("event")}
            >
              Event bills
            </button>
          </div>

          <div className="bm-main-toolbar">
            <div className="bm-toolbar-search-col">
              <div className="bm-toolbar-search-wrap">
                <span className="bm-toolbar-search-icon" aria-hidden>
                  <Icons.Search />
                </span>
                <input
                  type="search"
                  className="bm-toolbar-search-input"
                  placeholder="Search guest name or email (server-side)…"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  aria-label="Search billing records"
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
                  id="bills-print-month"
                  type="month"
                  className="bm-toolbar-month-input"
                  value={printMonth}
                  onChange={(e) => setPrintMonth(e.target.value)}
                  aria-label="Select month for billing report"
                />
              </div>
            </div>
            <div className="bm-toolbar-print-col">
              <button
                type="button"
                className="bm-toolbar-print-btn"
                onClick={() =>
                  openBillsPrint(billingTab === "event" ? "event" : billingTab === "room" ? "room" : "all")
                }
                title="Open printable billing summary for the current tab and selected month (or all time if empty)."
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
          <div className="bm-toolbar-subrow bills-toolbar-subrow">
            {!canRecordPayment && staffRole === "frontdesk" ? (
              <span className="bills-role-hint">Front desk: view-only · Payments require cashier or admin</span>
            ) : null}
            <p className="bm-toolbar-hint">
              Leave empty to include all billing rows. Month filter uses the billing record created date.
            </p>
          </div>

          {loadNotice ? <div className="bills-load-notice">{loadNotice}</div> : null}

          <div className="bills-section-label">Billing records</div>

          <div className="bills-table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  <th>Guest</th>
                  <th>Type</th>
                  <th>Booking</th>
                  <th>Total</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="bills-empty">
                      Loading billing…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="bills-empty">
                      No billing records match this view.
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id}>
                      <td>{String(r.guestName || "").trim() || "—"}</td>
                      <td>{bookingTypeLabel(r.bookingType)}</td>
                      <td>{String(r.contextLabel || "").trim() || "—"}</td>
                      <td>{fmtPeso(r.totalAmount)}</td>
                      <td>{fmtPeso(r.amountPaid)}</td>
                      <td>{fmtPeso(r.balance)}</td>
                      <td>
                        <span className={`bills-pay-badge bills-pay-badge--${String(r.paymentStatus || "unpaid")}`}>
                          {paymentStatusLabel(r.paymentStatus)}
                        </span>
                      </td>
                      <td className="action-cell">
                        <button type="button" className="icon-action view-btn" title="View details" onClick={() => setDetailId(r.id)}>
                          <Icons.Eye />
                        </button>
                        <button type="button" className="icon-action print-btn" title="Open bill PDF (read-only)" onClick={() => printRowSummary(r)}>
                          <Icons.Print />
                        </button>
                        {canRecordPayment ? (
                          <button
                            type="button"
                            className="icon-action bills-pay-btn"
                            title="Record payment"
                            onClick={() => setPaymentRow(r)}
                          >
                            Pay
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && (
            <div className="rm-pagination-row">
              <div className="rm-pagination-meta">
                <span className="rm-pagination-count">
                  {rows.length > 0 ? (
                    <>
                      Showing {billsSliceFrom}–{billsSliceTo} of {totalItems} · Page {page} of {totalPages}
                    </>
                  ) : (
                    <>
                      {totalItems} record{totalItems === 1 ? "" : "s"} · Page {page} of {totalPages}
                    </>
                  )}
                </span>
                <label className="rm-pagination-limit">
                  <span>Per page</span>
                  <select
                    className="rm-pagination-select"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </label>
              </div>
              <div className="rm-pagination-btns">
                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                {visiblePageNumbers(page, totalPages).map((pNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev && pNum - prev > 1;
                  return (
                    <span key={pNum} className="rm-page-btn-wrap">
                      {showEllipsis ? <span className="rm-page-ellipsis">…</span> : null}
                      <button
                        type="button"
                        className={`rm-page-btn${pNum === page ? " rm-page-btn--active" : ""}`}
                        onClick={() => setPage(pNum)}
                      >
                        {pNum}
                      </button>
                    </span>
                  );
                })}
                <button
                  type="button"
                  className="rm-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          <BillsPrintModal
            open={printOpen}
            onClose={closeBillsPrint}
            monthLabel={printMonthLabel}
            variant={printVariant}
            rows={printRowsFiltered}
            printMonthKey={printMonth}
            loading={printLoading}
            error={printError}
          />
        </main>
      </RailPortalShell>

      <DetailsModal billingId={detailId} onClose={() => setDetailId(null)} />

      {paymentRow ? (
        <PaymentModal row={paymentRow} onClose={() => setPaymentRow(null)} onSaved={handlePaymentSaved} />
      ) : null}

      <Toast message={toast.message} visible={toast.visible} />

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
