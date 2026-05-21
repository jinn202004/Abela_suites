import { useMemo } from "react";
import {
  BILLS_SUMMARY_COLS,
  billsDetailColumnsForVariant,
  billsReportEmptyMessage,
  billsReportTitle,
  assignLedgerBillNumbers,
  computeBillsSummary,
  displayLedgerDate,
  downloadBillsReportPdf,
  fmtSummaryPhp,
  formatLedgerDate,
  LEDGER_EMPTY,
  ledgerCellText,
  paymentMethodLabel,
  paymentStatusLabel,
  printBillsReportPdf,
} from "../utils/billingLedgerReport";
import BillsPrintLogo from "./BillsPrintLogo";

function billRowToTableCells(r) {
  const detailed = r?.checkIn != null || r?.checkOut != null;
  if (detailed) {
    return [
      String(r.displayBillNum ?? LEDGER_EMPTY),
      r.guestName || LEDGER_EMPTY,
      r.bookingType === "event" ? "Event" : "Room",
      ledgerCellText(r.roomOrVenue),
      ledgerCellText(r.packageLabel || r.contextLabel),
      displayLedgerDate(r.checkIn),
      displayLedgerDate(r.checkOut),
      paymentMethodLabel(r.paymentMethod),
      fmtSummaryPhp(r.totalAmount),
      fmtSummaryPhp(r.amountPaid),
      fmtSummaryPhp(r.balance),
      paymentStatusLabel(r.paymentStatus),
    ];
  }
  return [
    String(r.id || LEDGER_EMPTY).slice(0, 14),
    r.guestName || LEDGER_EMPTY,
    r.bookingType === "event" ? "Event" : "Room",
    ledgerCellText(r.contextLabel),
    fmtSummaryPhp(r.totalAmount),
    fmtSummaryPhp(r.amountPaid),
    fmtSummaryPhp(r.balance),
    paymentStatusLabel(r.paymentStatus),
    formatLedgerDate(r.createdAt),
  ];
}

/**
 * Printable billing summary modal (shared by admin & front desk).
 */
export default function BillsPrintModal({
  open,
  onClose,
  monthLabel,
  variant,
  rows,
  printMonthKey,
  loading = false,
  error = "",
  note = "Totals and transaction list for this period. Use per-row print on the table for a single guest bill.",
  rootClass = "bills-page",
}) {
  const tableRows = useMemo(() => assignLedgerBillNumbers(rows), [rows]);
  const summary = useMemo(() => computeBillsSummary(tableRows), [tableRows]);
  const detailed = tableRows.some((r) => r?.checkIn != null);
  const tableCols = detailed ? billsDetailColumnsForVariant(variant) : BILLS_SUMMARY_COLS;

  if (!open) return null;

  const heading = billsReportTitle(variant);

  return (
    <div
      className={`${rootClass} bm-print-backdrop`}
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
            <BillsPrintLogo />
            <div className="bm-print-brand">ABELA SUITES</div>
            <div className="bm-print-period">Period: {monthLabel}</div>
            <div className="bm-print-subtitle">{heading}</div>
            <p className="bm-print-summary-note">{note}</p>
          </header>

          <section className="bm-print-section">
            <h3 className="bm-print-section-title">Billing summary</h3>
            {loading ? (
              <div className="bm-print-empty bm-print-empty--card">Loading billing records…</div>
            ) : error ? (
              <div className="bm-print-empty bm-print-empty--card">{error}</div>
            ) : tableRows.length === 0 ? (
              <div className="bm-print-empty bm-print-empty--card">{billsReportEmptyMessage(variant)}</div>
            ) : (
              <div className="bm-print-cards-wrap bm-print-summary-wrap">
                <div className="bm-print-summary-stats">
                  <div className="bm-print-summary-stats-grid">
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Total transactions</span>
                      <strong className="bm-print-summary-stat-value">{summary.count}</strong>
                    </div>
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Total amount</span>
                      <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumTotal)}</strong>
                    </div>
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Down payment / collected</span>
                      <strong className="bm-print-summary-stat-value">{fmtSummaryPhp(summary.sumPaid)}</strong>
                    </div>
                    <div className="bm-print-summary-stat">
                      <span className="bm-print-summary-stat-label">Remaining balance</span>
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
                        {tableCols.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map((r) => (
                        <tr key={String(r.id || r.bookingId || r.displayBillNum)}>
                          {billRowToTableCells(r).map((cell, i) => (
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
          <button
            type="button"
            className="bm-print-footer-btn pdf"
            onClick={() => downloadBillsReportPdf({ variant, monthLabel, rows: tableRows, printMonthKey })}
            disabled={loading || !!error || tableRows.length === 0}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="bm-print-footer-btn primary"
            onClick={() => printBillsReportPdf({ variant, monthLabel, rows: tableRows, printMonthKey })}
            disabled={loading || !!error || tableRows.length === 0}
          >
            Print
          </button>
        </div>
      </div>
    </div>
  );
}
