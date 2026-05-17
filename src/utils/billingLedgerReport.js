import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { pdfSafeText, openPdfPrintOrDownload } from "./pdfClientExport";
import { getBilling } from "../api/cashier.service";

const BILLS_SUMMARY_COLS = ["Ref", "Guest", "Type", "Booking", "Total", "Paid", "Balance", "Status", "Billed"];
const PDF_HEAD_RGB = [184, 146, 42];

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

function parseDateForMonthFilter(d) {
  if (d == null || d === "" || d === "—") return null;
  const s = String(d);
  const dt = s.includes("T") ? new Date(s) : new Date(`${s}T12:00:00`);
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

    autoTable(doc, {
      startY: y,
      head: [BILLS_SUMMARY_COLS],
      body: rows.map((r) => billRowToSummaryCells(r).map(summaryCellPdf)),
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

export function printBillsReportPdf(opts) {
  const { doc, filename } = buildBillsReportPdf(opts);
  openPdfPrintOrDownload(doc, filename);
}

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
