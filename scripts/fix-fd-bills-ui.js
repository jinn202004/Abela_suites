const fs = require("fs");
const p = "src/frontdesks/frontdesk-bills.jsx";
let s = fs.readFileSync(p, "utf8");

s = s.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", ""));
s = s.replace(/countRoom/g, "billingCounts.room");
s = s.replace(/countEvent/g, "billingCounts.event");
s = s.replace(/countTotal/g, "billingCounts.total");
s = s.replace(/loadBillingRows\(\)/g, "() => { billingFetchGenRef.current += 1; void refreshBillingPage(); void refreshBillingCounts(); }");

const uiBlock = `          <motion.div className="bills-stats-row">
            <motion.div className="bills-stat-card">
              <div className="bills-stat-top">
                <div className="bills-stat-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/></svg>
                </motion.div>
                <span className="bills-stat-label">Room bills</span>
              </motion.div>
              <div className="bills-stat-value">{statsLoading ? "\\u2026" : billingCounts.room}</div>
            </motion.div>
            <motion.div className="bills-stat-card">
              <div className="bills-stat-top">
                <div className="bills-stat-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </motion.div>
                <span className="bills-stat-label">Event bills</span>
              </motion.div>
              <motion.div className="bills-stat-value">{statsLoading ? "\\u2026" : billingCounts.event}</motion.div>
            </motion.div>
            <motion.div className="bills-stat-card">
              <div className="bills-stat-top">
                <div className="bills-stat-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </motion.div>
                <span className="bills-stat-label">Total bills</span>
              </motion.div>
              <div className="bills-stat-value">{statsLoading ? "\\u2026" : billingCounts.total}</motion.div>
            </motion.div>
          </motion.div>

          <motion.div className="bills-tabs" role="tablist" aria-label="Billing type">
            <button type="button" role="tab" aria-selected={billingTab === ""} className={\`bills-tab\${billingTab === "" ? " active" : ""}\`} onClick={() => setBillingTab("")}>All</button>
            <button type="button" role="tab" aria-selected={billingTab === "room"} className={\`bills-tab\${billingTab === "room" ? " active" : ""}\`} onClick={() => setBillingTab("room")}>Room</button>
            <button type="button" role="tab" aria-selected={billingTab === "event"} className={\`bills-tab\${billingTab === "event" ? " active" : ""}\`} onClick={() => setBillingTab("event")}>Event</button>
          </motion.div>

          <motion.div className="bm-main-toolbar">
            <motion.div className="bm-toolbar-search-col">
              <motion.div className="bm-toolbar-search-wrap">
                <span className="bm-toolbar-search-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="14" height="14"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                </motion.div>
                <input type="search" className="bm-toolbar-search-input" placeholder="Search guest name or email (server-side)…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} aria-label="Search billing records" />
              </motion.div>
            </motion.div>
            <motion.div className="bm-toolbar-month-col">
              <motion.div className="bm-toolbar-month-head">
                <span className="bm-toolbar-month-label">Select month</span>
                {printMonth ? <button type="button" className="bm-toolbar-month-clear" onClick={() => setPrintMonth("")}>Clear</button> : null}
              </motion.div>
              <motion.div className="bm-toolbar-month-input-wrap">
                <input type="month" className="bm-toolbar-month-input" value={printMonth} onChange={(e) => setPrintMonth(e.target.value)} aria-label="Select month for billing report" />
              </motion.div>
            </motion.div>
            <motion.div className="bm-toolbar-print-col">
              <button type="button" className="bm-toolbar-print-btn" disabled={printBusy} onClick={() => void handleLedgerPrint()} title="Print billing summary for the current tab and month.">
                <svg className="bm-toolbar-print-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                Print
              </button>
            </motion.div>
          </motion.div>
          <motion.div className="bm-toolbar-subrow bills-toolbar-subrow">
            <p className="bm-toolbar-hint">Leave empty to include all billing rows. Month filter uses the billing record created date.</p>
          </motion.div>
`;

// Fix motion in template - use div only
const uiBlockFixed = uiBlock.replace(/<\/?motion\.div/g, (m) => m.replace("motion.", ""));

const start = s.indexOf("          <motion.div className=\"bills-stats-row\">");
if (start === -1) {
  const alt = s.indexOf("          <motion.div className=\"stat-cards\">");
  if (alt === -1) {
    const alt2 = s.indexOf("            <motion.div className=\"stat-card\">");
    console.error("Could not find stat block", alt, alt2);
    process.exit(1);
  }
}
const endMarker = "          {/* Table */}";
const end = s.indexOf(endMarker);
if (end === -1) {
  console.error("no table marker");
  process.exit(1);
}
const start2 = s.indexOf("          <motion.div className=\"bills-stats-row\">");
const start3 = start2 === -1 ? s.indexOf("            <motion.div className=\"stat-card\">") - 10 : start2;
const realStart = s.lastIndexOf("\n", start3) + 1;
s = s.slice(0, realStart) + uiBlockFixed + "\n\n" + s.slice(end);

s = s.replace(/pagedBills/g, "billRows");
s = s.replace(/filtered\.length/g, "totalItems");
s = s.replace(/billsPageSafe/g, "page");
s = s.replace(/billsTotalPages/g, "totalPages");
s = s.replace(/billsPageSizeSafe/g, "limit");
s = s.replace(/setBillsPage/g, "setPage");
s = s.replace(/setBillsPageSize/g, "setLimit");
s = s.replace(/value={search}/g, "value={searchInput}");
s = s.replace(/setSearch\(/g, "setSearchInput(");
s = s.replace(/reportMonth/g, "printMonth");
s = s.replace(/setReportMonth/g, "setPrintMonth");
s = s.replace(/printAllRoomTransactionsPdf/g, "handleLedgerPrint");
s = s.replace(/filterOptions/g, "REMOVED_filterOptions");
s = s.replace(/filterOpen/g, "REMOVED_filterOpen");
s = s.replace(/setFilterOpen/g, "REMOVED_setFilterOpen");
s = s.replace(/setFilter\(/g, "REMOVED_setFilter(");

fs.writeFileSync(p, s);
console.log("patched");
