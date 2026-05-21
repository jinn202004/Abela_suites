import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfSafeText, openPdfPrintOrDownload } from "./pdfClientExport";
import { getBilling } from "../api/cashier.service";

const BILLS_SUMMARY_COLS = ["Ref", "Guest", "Type", "Booking", "Total", "Paid", "Balance", "Status", "Billed"];

const BILLS_DETAIL_COLS_BASE = ["Bill #", "Guest", "Type", "Room / Venue", "Package"];

const BILLS_DETAIL_COLS_TAIL = ["Pay method", "Total", "Paid", "Balance", "Status"];

/** Print table date headers: room vs event vs mixed ledger. */
export function billsDetailColumnsForVariant(variant) {
  let dateCols;
  if (variant === "event") {
    dateCols = ["Event date", "End date"];
  } else if (variant === "room") {
    dateCols = ["Check-in", "Check-out"];
  } else {
    dateCols = ["Start date", "End date"];
  }
  return [...BILLS_DETAIL_COLS_BASE, ...dateCols, ...BILLS_DETAIL_COLS_TAIL];
}

/** @deprecated Use billsDetailColumnsForVariant — kept for imports */
const BILLS_DETAIL_COLS = billsDetailColumnsForVariant("all");

const PDF_HEAD_RGB = [184, 146, 42];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function paymentStatusLabel(st) {
  const k = String(st || "").toLowerCase();
  if (k === "paid") return "Paid";
  if (k === "partial") return "Partial";
  return "Unpaid";
}

export function bookingTypeLabel(t) {
  const k = String(t || "").toLowerCase();
  if (k === "event") return "Event";
  return "Room";
}

/** ASCII placeholder for empty ledger / print cells (avoids U+2014 rendering as "?"). */
export const LEDGER_EMPTY = "-";

export function paymentMethodLabel(m) {
  const k = String(m || "")
    .trim()
    .toLowerCase();
  if (!k || k === "—" || k === "-") return LEDGER_EMPTY;
  if (k.includes("gcash")) return "GCash";
  if (k.includes("cash")) return "Cash";
  return String(m).trim();
}

/** Normalize many stored date shapes to YYYY-MM-DD (matches backend `bookingDateFieldToYmd`). */
export function parseLedgerDateInput(raw) {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    return raw.toISOString().slice(0, 10);
  }
  const s = String(raw).trim();
  if (!s || s === "—" || s === "-") return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (s.includes("T")) return s.slice(0, 10);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (us) {
    const mo = String(us[1]).padStart(2, "0");
    const da = String(us[2]).padStart(2, "0");
    return `${us[3]}-${mo}-${da}`;
  }
  const parsed = new Date(s.includes("T") ? s : s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const mo = String(parsed.getMonth() + 1).padStart(2, "0");
    const da = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${mo}-${da}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

/** Format booking / billing dates for print tables and PDF. */
export function formatLedgerDate(raw) {
  const ymd = parseLedgerDateInput(raw);
  if (!ymd) return LEDGER_EMPTY;
  const t = new Date(`${ymd}T12:00:00`);
  if (Number.isNaN(t.getTime())) return LEDGER_EMPTY;
  return t.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

/** Safe display: accepts YYYY-MM-DD or already-formatted label. */
export function displayLedgerDate(raw) {
  if (raw == null || raw === "") return LEDGER_EMPTY;
  const s = String(raw).trim();
  if (!s || s === "—" || s === LEDGER_EMPTY) return LEDGER_EMPTY;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return formatLedgerDate(s);
  if (/[A-Za-z]{3,}/.test(s)) return s;
  return formatLedgerDate(s);
}

/** Room or event stay window from a billing API record or flat front-desk row. */
export function resolveStayDatesForLedger(source) {
  const bk = source?.booking && typeof source.booking === "object" ? source.booking : source;
  const t = String(bk?.bookingType ?? bk?.type ?? "").toLowerCase();
  if (t === "event") {
    const checkIn = parseLedgerDateInput(bk?.eventDate ?? bk?.checkin ?? bk?.checkIn);
    const checkOut =
      parseLedgerDateInput(bk?.eventEndDate ?? bk?.checkout ?? bk?.checkOut) || checkIn;
    return { checkIn, checkOut };
  }
  const checkIn = parseLedgerDateInput(bk?.checkIn ?? bk?.checkin ?? bk?.eventDate);
  const checkOut = parseLedgerDateInput(bk?.checkOut ?? bk?.checkout ?? bk?.eventEndDate);
  return { checkIn, checkOut };
}

export function ledgerCellText(v) {
  const s = String(v ?? "").trim();
  if (!s || s === "—") return LEDGER_EMPTY;
  return s;
}

function parseDateForMonthFilter(d) {
  if (d == null || d === "" || d === "—") return null;
  const s = String(d);
  const dt = s.includes("T") ? new Date(s) : new Date(`${s.slice(0, 10)}T12:00:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** When month is "" (YYYY-MM), include all rows; otherwise filter by billing `createdAt`. */
export function rowInSelectedMonth(sortDate, monthYyyyMm) {
  if (!monthYyyyMm) return true;
  const dt = parseDateForMonthFilter(sortDate);
  if (!dt) return false;
  const [y, m] = monthYyyyMm.split("-").map(Number);
  return dt.getFullYear() === y && dt.getMonth() + 1 === m;
}

/** Front desk: match month against check-in, check-out, or bill activity date. */
export function rowInSelectedMonthFrontdesk(row, monthYyyyMm) {
  if (!monthYyyyMm) return true;
  const candidates = [row?.checkIn, row?.checkOut, row?.createdAt, row?.billedAt].filter(Boolean);
  for (const c of candidates) {
    const dt = parseDateForMonthFilter(c);
    if (!dt) continue;
    const ym = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
    if (ym === monthYyyyMm) return true;
  }
  return false;
}

export function billCreatedSortKey(r) {
  const d = r?.createdAt;
  if (d == null || d === "") return "";
  if (typeof d === "string") return d;
  try {
    return new Date(d).toISOString();
  } catch {
    return "";
  }
}

export function formatPrintMonthLabel(monthYyyyMm) {
  if (!monthYyyyMm) return "All time";
  const [y, m] = monthYyyyMm.split("-");
  const mi = parseInt(m, 10);
  if (!y || !Number.isFinite(mi) || mi < 1 || mi > 12) return "All time";
  return `${MONTH_NAMES[mi - 1]} ${y}`;
}

function shortBillId(id) {
  const s = String(id ?? "").trim();
  if (s.length <= 14) return s;
  return `${s.slice(0, 6)}…${s.slice(-6)}`;
}

function billsPdfLineH(fsPt) {
  return fsPt * 0.352778 * 1.38;
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
  s = s.replace(/\u2014/g, "-");
  s = s.replace(/<[^>]*>/g, " ");
  s = s.replace(/&nbsp;/gi, " ");
  s = s.replace(/&times;/gi, "x");
  s = s.replace(/&apos;/gi, "'");
  s = s.replace(/&quot;/gi, '"');
  s = s.replace(/&lt;/gi, "<");
  s = s.replace(/&gt;/gi, ">");
  s = s.replace(/&amp;/gi, "&");
  s = s.replace(/\u20b1/gi, "PHP ");
  s = s.replace(/₱/g, "PHP ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function billsPdfSafe(v, maxLen = 4000) {
  return pdfSafeText(sanitizeBillsPrintCell(v), maxLen);
}

export function fmtSummaryPhp(n) {
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

export function computeBillsSummary(rows) {
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

/** Sequential 1-based bill numbers for print / PDF tables (row order in the report). */
export function assignLedgerBillNumbers(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row, index) => ({
    ...row,
    displayBillNum: index + 1,
  }));
}

function ledgerBillNumberCell(r) {
  const n = r?.displayBillNum;
  if (n != null && n !== "") return String(n);
  return LEDGER_EMPTY;
}

function billRowToDetailCells(r) {
  return [
    ledgerBillNumberCell(r),
    sanitizeBillsPrintCell(r.guestName),
    bookingTypeLabel(r.bookingType),
    sanitizeBillsPrintCell(ledgerCellText(r.roomOrVenue)),
    sanitizeBillsPrintCell(ledgerCellText(r.packageLabel || r.contextLabel)),
    sanitizeBillsPrintCell(displayLedgerDate(r.checkIn)),
    sanitizeBillsPrintCell(displayLedgerDate(r.checkOut)),
    sanitizeBillsPrintCell(paymentMethodLabel(r.paymentMethod)),
    fmtSummaryPhp(Number(r.totalAmount) || 0),
    fmtSummaryPhp(Number(r.amountPaid) || 0),
    fmtSummaryPhp(Number(r.balance) || 0),
    paymentStatusLabel(r.paymentStatus),
  ];
}

function summaryCellPdf(v) {
  return pdfSafeText(sanitizeBillsPrintCell(v), 240);
}

export function billsReportTitle(variant) {
  if (variant === "room") return "Room Transactions";
  if (variant === "event") return "Event Transactions";
  return "All Transactions";
}

export function billsReportEmptyMessage(variant) {
  if (variant === "room") return "No room transactions for this period.";
  if (variant === "event") return "No event transactions for this period.";
  return "No transactions for this period.";
}

/** Map GET /api/cashier/billing list row to ledger export shape (admin bills print). */
export function cashierBillingRowToLedgerRow(r) {
  const contextLabel = ledgerCellText(r?.contextLabel);
  const stay = resolveStayDatesForLedger(r);
  return {
    id: String(r?.id || "").trim(),
    bookingId: String(r?.bookingId || "").trim(),
    guestName: String(r?.guestName || "Guest"),
    bookingType: r?.bookingType || "room",
    contextLabel,
    totalAmount: Number(r?.totalAmount) || 0,
    amountPaid: Number(r?.amountPaid) || 0,
    balance: Number(r?.balance) || 0,
    paymentStatus: r?.paymentStatus || "unpaid",
    createdAt: r?.createdAt,
    checkIn: stay.checkIn || "",
    checkOut: stay.checkOut || "",
    packageLabel: contextLabel,
    roomOrVenue: contextLabel,
    paymentMethod: String(r?.paymentMethod || "").trim(),
  };
}

/** Map a front desk table row to the ledger export shape (client-side only). */
export function frontdeskBillRowToLedgerRow(r) {
  const isEvent = String(r?.bookingType || "").toLowerCase() === "event";
  const roomOrVenue = ledgerCellText(r?.room);
  const packageLabel = ledgerCellText(r?.package);
  const contextLabel = isEvent
    ? `${packageLabel} · ${roomOrVenue}`
    : packageLabel && roomOrVenue && roomOrVenue !== LEDGER_EMPTY
      ? `${packageLabel} (${roomOrVenue})`
      : packageLabel || roomOrVenue || LEDGER_EMPTY;
  const payRaw = String(r?.paymentMethod || "").trim();
  const stay = resolveStayDatesForLedger(r);
  return {
    id: String(r?.billId || r?.bookingId || r?.id || "").trim(),
    bookingId: String(r?.bookingId || "").trim(),
    guestName: String(r?.customer || "Guest"),
    bookingType: r?.bookingType || "room",
    contextLabel,
    totalAmount: Number(r?.amount) || 0,
    amountPaid: Number(r?.totalPaid) || 0,
    balance: Number(r?.balance) || 0,
    paymentStatus: r?.paymentStatus || "unpaid",
    createdAt: stay.checkIn || r?.date,
    checkIn: stay.checkIn || "",
    checkOut: stay.checkOut || "",
    packageLabel,
    roomOrVenue,
    paymentMethod: payRaw,
    billedAt: r?.date,
  };
}

function useDetailColumns(rows) {
  return rows.some((r) => r?.checkIn != null || r?.checkOut != null);
}

function buildBillsReportPdf({ variant, monthLabel, rows, printMonthKey }) {
  const numberedRows = assignLedgerBillNumbers(rows);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const margin = 12;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - 2 * margin;
  let y = margin + 4;
  const detailed = useDetailColumns(numberedRows);

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

  if (numberedRows.length === 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(billsReportEmptyMessage(variant), margin, y);
  } else {
    const sum = computeBillsSummary(numberedRows);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Billing summary", margin, y);
    y += 5.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(`Total transactions: ${sum.count}`, margin, y);
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
    doc.text(`Total amount: ${billsPdfSafe(fmtSummaryPhp(sum.sumTotal), 80)}`, margin, y);
    y += 5;
    doc.text(`Down payment / collected: ${billsPdfSafe(fmtSummaryPhp(sum.sumPaid), 80)}`, margin, y);
    y += 5;
    doc.text(`Remaining balance: ${billsPdfSafe(fmtSummaryPhp(sum.sumBal), 80)}`, margin, y);
    y += 8;

    doc.setDrawColor(210, 198, 178);
    doc.line(margin, y, margin + contentW, y);
    y += 5;

    const cols = detailed ? billsDetailColumnsForVariant(variant) : BILLS_SUMMARY_COLS;
    const body = detailed
      ? numberedRows.map((r) => billRowToDetailCells(r).map(summaryCellPdf))
      : numberedRows.map((r) => billRowToSummaryCells(r).map(summaryCellPdf));

    autoTable(doc, {
      startY: y,
      head: [cols],
      body,
      theme: "striped",
      styles: {
        fontSize: detailed ? 7.5 : 8.5,
        cellPadding: 1.05,
        overflow: "linebreak",
        valign: "top",
        font: "helvetica",
      },
      headStyles: { fillColor: PDF_HEAD_RGB, fontSize: detailed ? 7.5 : 8.5, textColor: 255, fontStyle: "bold" },
      bodyStyles: { fontSize: detailed ? 7.5 : 8.5 },
      margin: { left: margin, right: margin },
      columnStyles: detailed
        ? {
            8: { halign: "right" },
            9: { halign: "right" },
            10: { halign: "right" },
          }
        : {
            4: { halign: "right" },
            5: { halign: "right" },
            6: { halign: "right" },
          },
    });
  }

  const slug = (printMonthKey || "all-time").replace(/[^\d-]/g, "") || "all-time";
  const vslug = variant === "all" ? "all" : variant;
  const filename = `Abela_${vslug}_transactions_${slug}.pdf`;
  return { doc, filename };
}

export function printBillsReportPdf(opts) {
  const { doc, filename } = buildBillsReportPdf(opts);
  openPdfPrintOrDownload(doc, filename);
}

export function downloadBillsReportPdf(opts) {
  const { doc, filename } = buildBillsReportPdf(opts);
  doc.save(filename);
}

export { BILLS_SUMMARY_COLS, BILLS_DETAIL_COLS };

export async function fetchAllBillingForExport(typeFilter, search, signal) {
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
