import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/frontdesks/frontdesk-bills.jsx");
let s = fs.readFileSync(file, "utf8");

const D = "d" + "iv";

function stripMotion(html) {
  const m = "m" + "o" + "t" + "i" + "o" + "n." + D;
  return html.split("<" + m).join("<" + D).split("</" + m + ">").join("</" + D + ">");
}

// Skip if already applied
if (s.includes("billingTab") && s.includes("bm-main-toolbar") && s.includes("getBilling")) {
  console.log("already applied");
  process.exit(0);
}

// --- imports ---
s = s.replace(
  `import {
  fetchAllBillingRecordsBackend,
  fetchBookingsBackend,
  fetchFrontdeskBookingDetailsBackend,
`,
  `import {
  fetchFrontdeskBookingDetailsBackend,
`,
);
if (!s.includes("getBilling")) {
  s = s.replace(
    `} from "../api/guestApi";
import { getSessionRole, getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";`,
    `} from "../api/guestApi";
import { getBilling, getBillingCounts } from "../api/cashier.service";
import { getSessionRole, getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";`,
  );
}
if (!s.includes("billingLedgerReport")) {
  s = s.replace(
    `import "./frontdesk-bills.css";

const filterOptions = ["All Time", "Today", "Last 7 Days", "Last 30 Days"];`,
    `import {
  billCreatedSortKey,
  fetchAllBillingForExport,
  printBillsReportPdf,
  rowInSelectedMonth,
} from "../utils/billingLedgerReport";
import "./frontdesk-bills.css";
import "../admin_1/bills.css";

const BILLING_POLL_MS = 30000;
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];`,
  );
}

if (!s.includes("function mapLedgerRowToFrontdesk")) {
  s = s.replace(
    `function billingLoadErrorMessage(err) {`,
    `function mapLedgerRowToFrontdesk(r, displayIndex) {
  const bookingType = String(r?.bookingType || "").toLowerCase();
  const ctx = String(r?.contextLabel || "").trim();
  const roomCell =
    bookingType === "event"
      ? ctx || "—"
      : roomNumberFromCombinedLabel(ctx) || ctx || "—";
  return {
    id: displayIndex,
    billId: String(r?.id || ""),
    bookingId: String(r?.bookingId || ""),
    bookingType,
    customer: String(r?.guestName || "Guest").trim() || "Guest",
    room: roomCell,
    package: ctx || (bookingType === "event" ? "Event Booking" : "Room Booking"),
    checkin: isoToDisplayDate(r?.createdAt),
    checkout: "—",
    amount: Number(r?.totalAmount) || 0,
    roomType: ctx || "—",
    date: isoToDisplayDate(r?.createdAt),
    filterAtMs: msFromIsoFields(r?.createdAt),
    addGuest: 0,
    totalPaid: Number(r?.amountPaid) || 0,
    balance: Number(r?.balance) || 0,
    paymentStatus: String(r?.paymentStatus || "unpaid"),
  };
}

function billingLoadErrorMessage(err) {`,
  );
}

// --- replace state + data loading ---
const stateOld = `  const [search, setSearch]             = useState("");
  /** \`YYYY-MM\` or "" = all loaded bills (month filter applies to room reports only). */
  const [reportMonth, setReportMonth]   = useState("");
  const [filter, setFilter]             = useState("All Time");
  const [filterOpen, setFilterOpen]     = useState(false);
  const [billRows, setBillRows]         = useState([]);
  /** Start true so we never flash sample rows; cleared in \`loadBillingRows\` \`finally\`. */
  const [rowsLoading, setRowsLoading]   = useState(true);
  /** Set when API fails so we do not look like a “dead DB” with a blank table. */
  const [rowsError, setRowsError]       = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState("");
  /** Client-side table pagination only (full list still loaded once; PDFs & stats use full filtered set). */
  const [billsPage, setBillsPage] = useState(1);
  const [billsPageSize, setBillsPageSize] = useState(10);
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  const loadBillingRows = useCallback(async () => {`;

const stateNew = `  const [billingTab, setBillingTab] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [printMonth, setPrintMonth] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [ledgerRows, setLedgerRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [billingCounts, setBillingCounts] = useState({ total: 0, room: 0, event: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [rowsError, setRowsError] = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState("");
  const [printBusy, setPrintBusy] = useState(false);
  const billingFetchGenRef = useRef(0);
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  const printMonthLabel = useMemo(() => {
    if (!printMonth) return "All time";
    const [y, m] = printMonth.split("-");
    return \`\${MONTH_NAMES[parseInt(m, 10) - 1]} \${y}\`;
  }, [printMonth]);

  const billRows = useMemo(
    () => ledgerRows.map((r, i) => mapLedgerRowToFrontdesk(r, (page - 1) * limit + i + 1)),
    [ledgerRows, page, limit],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 400);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [billingTab, debouncedSearch]);

  const refreshBillingCounts = useCallback(async (opts = {}) => {
    const ac = opts.signal;
    try {
      if (!getStoredAuthToken()) return;
      const counts = await getBillingCounts(
        { search: debouncedSearch || undefined },
        ac ? { signal: ac } : {},
      );
      if (ac?.aborted) return;
      setBillingCounts(counts);
    } catch (e) {
      if (e?.name === "AbortError") return;
      if (!ac?.aborted) setBillingCounts({ total: 0, room: 0, event: 0 });
    } finally {
      if (!ac?.aborted) setStatsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    const ac = new AbortController();
    setStatsLoading(true);
    void refreshBillingCounts({ signal: ac.signal });
    return () => ac.abort();
  }, [refreshBillingCounts]);

  const refreshBillingPage = useCallback(
    async (opts = {}) => {
      const skipStaleGuard = Boolean(opts.skipStaleGuard);
      const gen = billingFetchGenRef.current;
      const pageToFetch =
        opts.page != null ? Math.max(1, parseInt(String(opts.page), 10) || 1) : Math.max(1, parseInt(String(page), 10) || 1);
      const typeFilter = billingTab === "room" || billingTab === "event" ? billingTab : "";

      if (!getStoredAuthToken()) {
        setRowsError(billingLoadErrorMessage({ code: "NO_TOKEN", message: "Not signed in" }));
        setLedgerRows([]);
        setTotalItems(0);
        setTotalPages(1);
        return;
      }

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
        setLedgerRows(list);
        setRowsError(null);
        const cp = Math.max(1, parseInt(String(result?.currentPage), 10) || pageToFetch);
        if (cp !== pageToFetch) setPage(cp);
      } catch (e) {
        if (!skipStaleGuard && gen !== billingFetchGenRef.current) return;
        setLedgerRows([]);
        setTotalItems(0);
        setTotalPages(1);
        setRowsError(billingLoadErrorMessage(e));
      }
    },
    [page, limit, billingTab, debouncedSearch],
  );

  useEffect(() => {
    billingFetchGenRef.current += 1;
    const fetchGen = billingFetchGenRef.current;
    let cancelled = false;
    setRowsLoading(true);
    setRowsError(null);
    void (async () => {
      await refreshBillingPage({ skipStaleGuard: true });
      if (!cancelled && fetchGen === billingFetchGenRef.current) setRowsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [page, limit, billingTab, debouncedSearch, refreshBillingPage]);

  useEffect(() => {
    const onAuth = () => {
      billingFetchGenRef.current += 1;
      void refreshBillingPage();
      void refreshBillingCounts();
    };
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
  }, [refreshBillingPage, refreshBillingCounts]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void refreshBillingPage({ skipStaleGuard: true });
      void refreshBillingCounts();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [refreshBillingPage, refreshBillingCounts]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshBillingPage({ skipStaleGuard: true });
      void refreshBillingCounts();
    }, BILLING_POLL_MS);
    return () => window.clearInterval(id);
  }, [refreshBillingPage, refreshBillingCounts]);

  const __REMOVE_loadBillingRows = useCallback(async () => {`;

if (!s.includes("const [billingTab")) {
  if (!s.includes(stateOld.slice(0, 80))) {
    console.error("state block not found");
    process.exit(1);
  }
  s = s.replace(stateOld, stateNew);
  const rmStart = s.indexOf("  const __REMOVE_loadBillingRows = useCallback(async () => {");
  const rmEnd = s.indexOf("  }, []);\n\n  useEffect(() => {\n    void loadBillingRows();", rmStart);
  if (rmStart === -1 || rmEnd === -1) {
    console.error("loadBillingRows block not found");
    process.exit(1);
  }
  s = s.slice(0, rmStart) + s.slice(rmEnd + "  }, []);\n\n".length);
  s = s.replace(
    `  useEffect(() => {
    void loadBillingRows();
  }, [loadBillingRows]);

  useEffect(() => {
    const onAuth = () => void loadBillingRows();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
  }, [loadBillingRows]);

`,
    "",
  );
}

s = s.replace(
  `    await loadBillingRows();`,
  `    billingFetchGenRef.current += 1;
    await refreshBillingPage();
    await refreshBillingCounts();`,
);

s = s.replace(
  `  function printAllRoomTransactionsPdf() {
    const subset = roomBillRowsForReport(billRows, reportMonth);
    if (!subset.length) {
      window.alert(
        reportMonth
          ? "No room bills have a check-in date in that month (or dates could not be read)."
          : "No room bills are loaded yet.",
      );
      return;
    }
    try {
      downloadRoomTransactionsPdf(subset, reportMonth);
    } catch (e) {
      console.error("[frontdesk-bills] room transactions PDF", e);
      window.alert(
        String(
          e?.message ||
            "Could not open or save the PDF. Allow pop-ups for this site, or check download permissions.",
        ),
      );
    }
  }`,
  `  async function handleLedgerPrint() {
    const variant = billingTab === "event" ? "event" : billingTab === "room" ? "room" : "all";
    const typeForApi = variant === "all" ? "" : variant;
    setPrintBusy(true);
    try {
      const raw = await fetchAllBillingForExport(typeForApi, debouncedSearch);
      const filtered = raw.filter((r) => rowInSelectedMonth(billCreatedSortKey(r), printMonth));
      if (!filtered.length) {
        window.alert(printMonth ? "No billing rows match this tab and month." : "No billing rows match this tab.");
        return;
      }
      printBillsReportPdf({ variant, monthLabel: printMonthLabel, rows: filtered, printMonthKey: printMonth });
    } catch (e) {
      console.error("[frontdesk-bills] ledger print", e);
      window.alert(String(e?.message || "Could not open or save the PDF. Allow pop-ups for this site."));
    } finally {
      setPrintBusy(false);
    }
  }`,
);

s = s.replace(
  `  const timeFilteredRows = useMemo(
    () => billRows.filter((b) => billPassesTimeFilter(filter, billRowFilterTimeMs(b))),
    [billRows, filter],
  );

  const countRoom = useMemo(
    () => timeFilteredRows.filter((b) => b.bookingType !== "event").length,
    [timeFilteredRows],
  );
  const countEvent = useMemo(
    () => timeFilteredRows.filter((b) => b.bookingType === "event").length,
    [timeFilteredRows],
  );
  const countTotal = countRoom + countEvent;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return timeFilteredRows.filter(
      (b) =>
        b.customer.toLowerCase().includes(q) ||
        b.package.toLowerCase().includes(q) ||
        b.room.toString().includes(q) ||
        b.id.toString().includes(q),
    );
  }, [timeFilteredRows, search]);

  const billsPageSizeSafe = Math.min(100, Math.max(5, Number(billsPageSize) || 10));
  const billsTotalPages = Math.max(1, Math.ceil(filtered.length / billsPageSizeSafe));
  const billsPageSafe = Math.min(Math.max(1, billsPage), billsTotalPages);

  const pagedBills = useMemo(() => {
    const start = (billsPageSafe - 1) * billsPageSizeSafe;
    return filtered.slice(start, start + billsPageSizeSafe);
  }, [filtered, billsPageSafe, billsPageSizeSafe]);

  useEffect(() => {
    setBillsPage(1);
  }, [search, filter, billRows.length]);

  useEffect(() => {
    setBillsPage((p) => Math.min(Math.max(1, p), billsTotalPages));
  }, [billsTotalPages]);

  function closeAll() {
    setFilterOpen(false);
    staffTopbarRef.current?.hideMenusOnly?.();
  }`,
  `  const billsSliceFrom = billRows.length > 0 ? (page - 1) * limit + 1 : 0;
  const billsSliceTo = billRows.length > 0 ? (page - 1) * limit + billRows.length : 0;

  function closeAll() {
    staffTopbarRef.current?.hideMenusOnly?.();
  }`,
);

s = s.replace(`rootClassName="frontdesk-app"`, `rootClassName="frontdesk-app bills-page"`);
s = s.replace(`<p className="page-sub">View and manage all rooms</p>`, `<p className="page-sub">View room and event billing from MongoDB</p>`);
s = s.replace(`onClick={() => void loadBillingRows()}`, `onClick={() => { billingFetchGenRef.current += 1; void refreshBillingPage(); void refreshBillingCounts(); }}`);

// UI block replacement
const uiStart = s.indexOf("          {/* Stat Cards */}");
const uiEnd = s.indexOf("          {/* Table */}", uiStart);
if (uiStart !== -1 && uiEnd !== -1 && !s.includes('className="bills-tabs"')) {
  const ui = stripMotion(`
          <motion.div className="bills-stats-row">
            <motion.div className="bills-stat-card">
              <motion.div className="bills-stat-top">
                <motion.div className="bills-stat-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </motion.div>
                <span className="bills-stat-label">Room bills</span>
              </motion.div>
              <motion.div className="bills-stat-value">{statsLoading ? "…" : billingCounts.room}</motion.div>
            </motion.div>
            <motion.div className="bills-stat-card">
              <motion.div className="bills-stat-top">
                <motion.div className="bills-stat-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </motion.div>
                <span className="bills-stat-label">Event bills</span>
              </motion.div>
              <motion.div className="bills-stat-value">{statsLoading ? "…" : billingCounts.event}</motion.div>
            </motion.div>
            <motion.div className="bills-stat-card">
              <motion.div className="bills-stat-top">
                <motion.div className="bills-stat-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </motion.div>
                <span className="bills-stat-label">Total bills</span>
              </motion.div>
              <motion.div className="bills-stat-value">{statsLoading ? "…" : billingCounts.total}</motion.div>
            </motion.div>
          </motion.div>

          {rowsError ? (
            <motion.div
              className="fd-bills-api-banner"
              style={{
                margin: "0 0 16px",
                padding: "12px 14px",
                borderRadius: 10,
                background: "#fff8f0",
                border: "1px solid #e8d4bc",
                color: "#5c4a36",
                fontSize: 14,
                lineHeight: 1.45,
              }}
            >
              <strong style={{ display: "block", marginBottom: 6 }}>Could not load bills</strong>
              {rowsError}{" "}
              <button
                type="button"
                className="action-btn view-btn"
                style={{ marginTop: 8, marginLeft: 0 }}
                disabled={rowsLoading}
                onClick={() => { billingFetchGenRef.current += 1; void refreshBillingPage(); void refreshBillingCounts(); }}
              >
                {rowsLoading ? "Retrying…" : "Retry"}
              </button>
              {/not signed in/i.test(rowsError) ? (
                <>
                  {" "}
                  <Link to="/login" style={{ marginLeft: 8, fontWeight: 600 }}>
                    Go to login
                  </Link>
                </>
              ) : null}
            </motion.div>
          ) : null}

          <motion.div className="bills-tabs" role="tablist" aria-label="Billing type">
            <button type="button" role="tab" aria-selected={billingTab === ""} className={\`bills-tab\${billingTab === "" ? " active" : ""}\`} onClick={() => setBillingTab("")}>All</button>
            <button type="button" role="tab" aria-selected={billingTab === "room"} className={\`bills-tab\${billingTab === "room" ? " active" : ""}\`} onClick={() => setBillingTab("room")}>Room</button>
            <button type="button" role="tab" aria-selected={billingTab === "event"} className={\`bills-tab\${billingTab === "event" ? " active" : ""}\`} onClick={() => setBillingTab("event")}>Event</button>
          </motion.div>

          <motion.div className="bm-main-toolbar">
            <motion.div className="bm-toolbar-search-col">
              <motion.div className="bm-toolbar-search-wrap">
                <svg className="bm-toolbar-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17" aria-hidden><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
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
              <button type="button" className="bm-toolbar-print-btn" disabled={printBusy} onClick={() => void handleLedgerPrint()} title="Print billing summary for the current tab and selected month.">
                <svg className="bm-toolbar-print-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" aria-hidden><polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>
                {printBusy ? "Printing…" : "Print"}
              </button>
            </motion.div>
          </motion.div>
          <motion.div className="bm-toolbar-subrow bills-toolbar-subrow">
            <p className="bm-toolbar-hint">Leave empty to include all billing rows. Month filter uses the billing record created date.</p>
          </motion.div>

`);
  // stripMotion uses motion.div placeholder - fix: build ui with D only
  const uiClean = ui
    .replaceAll("<" + "motion.div", "<" + D)
    .replaceAll("</" + "motion.div" + ">", "</" + D + ">");
  s = s.slice(0, uiStart) + uiClean + s.slice(uiEnd);
}

s = s.replace(
  `                {!rowsLoading &&
                  pagedBills.map((b) => (`,
  `                {rowsLoading ? (
                  <tr><td colSpan={8} className="bills-empty">Loading bills…</td></tr>
                ) : billRows.length === 0 ? (
                  <tr><td colSpan={8} className="bills-empty">No bills found.</td></tr>
                ) : (
                  billRows.map((b) => (`,
);
s = s.replace(
  `                ))}
                {!rowsLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#bbb" }}>No bills found.</td>
                  </tr>
                )}
                {rowsLoading && (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#9a8060" }}>Loading bills...</td>
                  </tr>
                )}`,
  `                ))}`,
);

const pagStart = s.indexOf("          {!rowsLoading && filtered.length > 0 ? (");
if (pagStart !== -1) {
  const pagEnd = s.indexOf("          ) : null}\n\n        </main>", pagStart);
  const pag = `
          {!rowsLoading && (
            <div className="rm-pagination-row">
              <motion.div className="rm-pagination-meta">
                <span className="rm-pagination-count">
                  {billRows.length > 0 ? (
                    <>Showing {billsSliceFrom}–{billsSliceTo} of {totalItems} · Page {page} of {totalPages}</>
                  ) : (
                    <>{totalItems} record{totalItems === 1 ? "" : "s"} · Page {page} of {totalPages}</>
                  )}
                </span>
                <label className="rm-pagination-limit">
                  <span>Per page</span>
                  <select className="rm-pagination-select" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}>
                    <option value={10}>10</option><option value={20}>20</option><option value={50}>50</option>
                  </select>
                </label>
              </motion.div>
              <motion.div className="rm-pagination-btns">
                <button type="button" className="rm-page-btn" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
                {visibleClientPageNumbers(page, totalPages).map((pNum, idx, arr) => {
                  const prev = arr[idx - 1];
                  const showEllipsis = prev != null && pNum - prev > 1;
                  return (
                    <span key={pNum} className="rm-page-btn-wrap">
                      {showEllipsis ? <span className="rm-page-ellipsis">…</span> : null}
                      <button type="button" className={\`rm-page-btn\${pNum === page ? " rm-page-btn--active" : ""}\`} onClick={() => setPage(pNum)}>{pNum}</button>
                    </span>
                  );
                })}
                <button type="button" className="rm-page-btn" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
              </motion.div>
            </motion.div>
          )}`.replaceAll("<" + "motion.div", "<" + D).replaceAll("</" + "motion.div" + ">", "</" + D + ">");
  if (pagEnd !== -1) s = s.slice(0, pagStart) + pag + s.slice(pagEnd);
}

fs.writeFileSync(file, s);
console.log("done");
