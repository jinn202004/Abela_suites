import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { TopbarUserIcon } from "./frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { Modal } from "../components/Modal";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { StaffNotificationDetailModal, useStaffNotificationDetail } from "./StaffNotificationDetailModal";
import {
  fetchAllBillingRecordsBackend,
  fetchBookingsBackend,
  fetchFrontdeskBookingDetailsBackend,
  updateBillingPaymentBackend,
  approveBookingBackend,
  rejectBookingBackend,
  dispatchGuestBookingsRefreshPing,
  dispatchHousekeepingInboxRefresh,
  dispatchHousekeepingTasksRefresh,
} from "../api/guestApi";
import { getSessionRole, getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import "./frontdesk-bills.css";

/** Demo rows: filterAtMs aligns with check-in (DD-MM-YYYY) for time-range filter. */
const initialBills = [
  { id: 1, customer: "James", room: 4,  package: "Twin Bed",      checkin: "11-02-2026", checkout: "15-02-2026", amount: 0,    roomType: "Single suite",    date: "19/02/2026", addGuest: 0, totalPaid: 0,    balance: 0,    bookingType: "room", filterAtMs: new Date(2026, 1, 11, 12, 0, 0).getTime() },
  { id: 2, customer: "Jay",   room: 10, package: "Single Suites",  checkin: "17-02-2026", checkout: "18-02-2026", amount: 576,  roomType: "Single Suites",   date: "17/02/2026", addGuest: 0, totalPaid: 576,  balance: 0,    bookingType: "room", filterAtMs: new Date(2026, 1, 17, 12, 0, 0).getTime() },
  { id: 3, customer: "Maria", room: 3,  package: "Twin Bed",       checkin: "10-02-2026", checkout: "12-02-2026", amount: 800,  roomType: "Twin Bed",         date: "10/02/2026", addGuest: 1, totalPaid: 400,  balance: 400,  bookingType: "room", filterAtMs: new Date(2026, 1, 10, 12, 0, 0).getTime() },
  { id: 4, customer: "Pedro", room: 7,  package: "Family",         checkin: "05-02-2026", checkout: "08-02-2026", amount: 2205, roomType: "Family",           date: "05/02/2026", addGuest: 2, totalPaid: 661,  balance: 1544, bookingType: "room", filterAtMs: new Date(2026, 1, 5, 12, 0, 0).getTime() },
  { id: 5, customer: "Ana",   room: 2,  package: "Double Std",     checkin: "20-02-2026", checkout: "22-02-2026", amount: 1400, roomType: "Double Standard",  date: "20/02/2026", addGuest: 0, totalPaid: 1400, balance: 0,    bookingType: "room", filterAtMs: new Date(2026, 1, 20, 12, 0, 0).getTime() },
];

const filterOptions = ["All Time", "Today", "Last 7 Days", "Last 30 Days"];

function fmtPeso(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "₱0";
  return `₱${v.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
}

function isoToDisplayDate(v) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-PH");
}

function toMoneyNum(v) {
  if (v == null || v === "") return 0;
  const n = Number(String(v).replace(/[₱,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** e.g. "Single Suite (101)" → "101" */
function roomNumberFromCombinedLabel(label) {
  const s = String(label || "").trim();
  const m = s.match(/\(\s*([^)]+?)\s*\)\s*$/);
  return m ? String(m[1]).trim() : "";
}

function billRoomColumnFromBooking(booking) {
  const bk = booking || {};
  const t = String(bk.type || "").toLowerCase();
  const combined = String(bk.room || "").trim();
  if (t === "event") {
    const v = String(bk.venueName || bk.eventTitle || combined || "").trim();
    return v || "—";
  }
  const num = String(bk.roomNumber || "").trim();
  if (num) return num;
  const fromParen = roomNumberFromCombinedLabel(combined);
  if (fromParen) return fromParen;
  const rid = String(bk.roomId || "").trim();
  if (rid) return rid;
  const title = String(bk.roomTitle || "").trim();
  if (title) return title;
  if (combined) return combined;
  return "—";
}

function billPackageColumnFromBooking(booking) {
  const bk = booking || {};
  const t = String(bk.type || "").toLowerCase();
  const combined = String(bk.room || "").trim();
  if (t === "event") {
    return String(bk.eventTitle || bk.venueName || combined || "Event Booking").trim() || "Event Booking";
  }
  const title = String(bk.roomTitle || "").trim();
  if (title) return title;
  return combined.replace(/\s*\([^)]*\)\s*$/, "").trim() || combined || "Room Booking";
}

function bookingFallbackRoomColumn(b) {
  const t = String(b?.type || "").toLowerCase();
  if (t === "event") {
    return String(b?.venueName || b?.eventTitle || "").trim() || "—";
  }
  const num = String(b?.roomNumber || "").trim();
  if (num) return num;
  const title = String(b?.roomTitle || "").trim();
  const synthetic = title && num ? `${title} (${num})` : title || num;
  const fromParen = roomNumberFromCombinedLabel(synthetic);
  if (fromParen) return fromParen;
  const rid = String(b?.roomId || "").trim();
  if (rid) return rid;
  if (title) return title;
  return "—";
}

function bookingFallbackPackageColumn(b) {
  const t = String(b?.type || "").toLowerCase();
  if (t === "event") {
    return String(b?.eventTitle || b?.venueName || "Event booking").trim() || "Event booking";
  }
  return String(b?.roomTitle || b?.roomNumber || "Room reservation").trim() || "Room reservation";
}

/** Bill activity / last update time for toolbar date range (prefer billing timestamps). */
function msFromIsoFields(...candidates) {
  for (const v of candidates) {
    if (v == null || v === "") continue;
    const t = new Date(v).getTime();
    if (!Number.isNaN(t)) return t;
  }
  return null;
}

function billRowFilterTimeMs(row) {
  if (row?.filterAtMs != null && Number.isFinite(row.filterAtMs)) return row.filterAtMs;
  const ci = String(row?.checkin || "").trim();
  if (ci && ci !== "—") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(ci)) {
      const t = new Date(`${ci}T12:00:00`).getTime();
      if (!Number.isNaN(t)) return t;
    }
  }
  return null;
}

function startOfLocalDayMs(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** @param {string} filterLabel @param {number|null} ms */
function billPassesTimeFilter(filterLabel, ms) {
  if (filterLabel === "All Time") return true;
  if (ms == null || !Number.isFinite(ms)) return true;
  const now = new Date();
  const startToday = startOfLocalDayMs(now);
  const endToday = startToday + 86400000;
  if (filterLabel === "Today") return ms >= startToday && ms < endToday;
  if (filterLabel === "Last 7 Days") {
    const start = startToday - 6 * 86400000;
    return ms >= start && ms < endToday;
  }
  if (filterLabel === "Last 30 Days") {
    const start = startToday - 29 * 86400000;
    return ms >= start && ms < endToday;
  }
  return true;
}

function billingLoadErrorMessage(err) {
  const code = err && err.code;
  const msg = err && err.message ? String(err.message) : String(err || "Unknown error");
  if (code === "NO_TOKEN" || /not signed in/i.test(msg)) {
    return "You are not signed in. Log in at /login with a front desk or admin account to load bills from the database.";
  }
  if (
    msg === "Failed to fetch" ||
    msg === "Load failed" ||
    /networkerror|load failed|fetch/i.test(msg)
  ) {
    return "Could not reach the API. Start the backend (be/abela-be: npm run dev on port 5000) so /api/billing can load from MongoDB.";
  }
  return msg;
}

export default function BillsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const { topbarProfile } = useTopbarUserProfile("frontdesk");
  const userRef = useRef(null);
  const notifRef = useRef(null);

  const [search, setSearch]             = useState("");
  const [filter, setFilter]             = useState("All Time");
  const [filterOpen, setFilterOpen]     = useState(false);
  const [notifOpen, setNotifOpen]       = useState(false);
  const [userOpen, setUserOpen]         = useState(false);
  const [billRows, setBillRows]         = useState(initialBills);
  const [rowsLoading, setRowsLoading]   = useState(false);
  /** Set when API fails so we do not look like a “dead DB” with a blank table. */
  const [rowsError, setRowsError]       = useState(null);
  const [selectedBill, setSelectedBill] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [paymentDraft, setPaymentDraft] = useState("");
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();

  const loadBillingRows = useCallback(async () => {
    setRowsLoading(true);
    setRowsError(null);
    try {
      if (!getStoredAuthToken()) {
        setRowsError(billingLoadErrorMessage({ code: "NO_TOKEN", message: "Not signed in" }));
        setBillRows([]);
        return;
      }
      const records = await fetchAllBillingRecordsBackend();
      const mapped = (Array.isArray(records) ? records : []).map((r, idx) => {
        const bid = r?.booking?.id || "";
        const rid = r?.id || "";
        const bookingType = String(r?.booking?.type || "").toLowerCase();
        const bk = r?.booking;
        const roomOrEvent = String(bk?.room || "").trim();
        const roomCell = billRoomColumnFromBooking(bk);
        const packageCell = billPackageColumnFromBooking(bk);
        const bill = r?.billing || {};
        const filterAtMs = msFromIsoFields(bill.updatedAt, bill.createdAt);
        return {
          id: idx + 1,
          billId: rid,
          bookingId: bid,
          bookingType,
          customer: String(r?.guest?.name || "Guest"),
          room: roomCell,
          package: packageCell || (bookingType === "event" ? "Event Booking" : "Room Booking"),
          checkin: r?.booking?.checkIn || r?.booking?.eventDate || "—",
          checkout: r?.booking?.checkOut || "—",
          amount: Number(r?.billing?.totalAmount || 0),
          roomType: roomOrEvent || packageCell || "—",
          date: isoToDisplayDate(r?.billing?.updatedAt || r?.billing?.createdAt),
          filterAtMs,
          addGuest: 0,
          totalPaid: Number(r?.billing?.amountPaid || 0),
          balance: Number(r?.billing?.balance || 0),
          paymentStatus: String(r?.billing?.paymentStatus || "unpaid"),
        };
      });

      if (mapped.length > 0) {
        setBillRows(mapped);
        return;
      }

      /** No billing rows yet: show recent DB bookings so frontdesk still sees live guest booking data. */
      const bookings = await fetchBookingsBackend().catch(() => []);
      const bookingRows = (Array.isArray(bookings) ? bookings : [])
        .sort((a, b) => {
          const ta = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
          const tb = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
          return tb - ta;
        })
        .slice(0, 50)
        .map((b, idx) => {
          const total = toMoneyNum(b?.totalAmount || b?.venuePrice || 0);
          const paid = toMoneyNum(b?.paymentAmount || 0);
          const balance = Math.max(0, total - paid);
          const roomCell = bookingFallbackRoomColumn(b);
          const packageCell = bookingFallbackPackageColumn(b);
          const roomOrEvent = String(
            b?.type === "event"
              ? b?.venueName || b?.eventTitle || "Event booking"
              : b?.roomTitle || b?.roomNumber || "Room reservation"
          );
          return {
            id: idx + 1,
            billId: "",
            bookingId: String(b?.id || ""),
            bookingType: String(b?.type || ""),
            customer: String(b?.customerName || b?.guest?.displayName || "Guest"),
            room: roomCell,
            package: packageCell,
            checkin: b?.checkIn || b?.eventDate || "—",
            checkout: b?.checkOut || "—",
            amount: total,
            roomType: roomOrEvent,
            date: isoToDisplayDate(b?.createdAt || b?.updatedAt),
            filterAtMs: msFromIsoFields(b?.updatedAt, b?.createdAt),
            addGuest: Number(b?.additionalGuests || 0),
            totalPaid: paid,
            balance,
            paymentStatus: balance <= 0 && total > 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
          };
        });
      setBillRows(bookingRows);
    } catch (e) {
      setRowsError(billingLoadErrorMessage(e));
      setBillRows([]);
    } finally {
      setRowsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBillingRows();
  }, [loadBillingRows]);

  useEffect(() => {
    const onAuth = () => void loadBillingRows();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
  }, [loadBillingRows]);

  async function openBillDetails(row) {
    setSelectedBill(row);
    setDetailsLoading(true);
    setSelectedDetails(null);
    try {
      if (row?.bookingId) {
        const details = await fetchFrontdeskBookingDetailsBackend(row.bookingId);
        setSelectedDetails(details);
        setPaymentDraft(String(Number(details?.billing?.amountPaid || 0)));
      }
    } catch {
      setSelectedDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  }

  async function refreshSelectedDetails() {
    if (!selectedBill?.bookingId) return;
    await openBillDetails(selectedBill);
    await loadBillingRows();
  }

  const openBookingFromBillNotification = useCallback(
    async (notif) => {
      const bookingId = String(notif?.bookingId || "").trim();
      if (!bookingId) return;
      const bookingType = String(notif?.bookingType || "").toLowerCase();
      const notifText = `${String(notif?.msg || "")} ${String(notif?.detail || "")}`.toLowerCase();
      const isEventNotif = bookingType === "event" || notifText.includes("event") || notifText.includes("venue");
      setNotifOpen(false);
      setUserOpen(false);
      const row = billRows.find((x) => String(x.bookingId || "") === bookingId);
      if (row) {
        await openBillDetails(row);
        return;
      }
      navigate(
        isEventNotif
          ? `/frontdesk-events?bookingId=${encodeURIComponent(bookingId)}`
          : `/frontdesk-rooms?bookingId=${encodeURIComponent(bookingId)}`
      );
    },
    [billRows, navigate],
  );

  useEffect(() => {
    function handler(e) {
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timeFilteredRows = billRows.filter((b) =>
    billPassesTimeFilter(filter, billRowFilterTimeMs(b))
  );

  const countRoom  = timeFilteredRows.filter((b) => b.bookingType !== "event").length;
  const countEvent = timeFilteredRows.filter((b) => b.bookingType === "event").length;
  const countTotal = countRoom + countEvent;

  const filtered = timeFilteredRows.filter((b) => {
    const q = search.toLowerCase();
    return (
      b.customer.toLowerCase().includes(q) ||
      b.package.toLowerCase().includes(q) ||
      b.room.toString().includes(q) ||
      b.id.toString().includes(q)
    );
  });

  function closeAll() {
    setFilterOpen(false);
    setNotifOpen(false);
    setUserOpen(false);
  }

  const { mainStyle } = useFrontdeskShell();

  const navItems = [
    { label: "Dashboard",           path: "/frontdesk-dashboard",              icon: "grid"               },
    { label: "Rooms",               path: "/frontdesk-rooms",        icon: "bed"                },
    { label: "Events",              path: "/frontdesk-events",       icon: "star"               },
    { label: "Housekeeping",        path: "/frontdesk-housekeeping", icon: "home"               },
    { label: "Bills",               path: "/frontdesk-bills",        icon: "card"               },
    { label: "Reservation History", path: "/frontdesk-history",  icon: "clock"              },
    { label: "Settings",            path: "/frontdesk-settings",      icon: "gear"               },
  ];

  return (
    <>
      <RailPortalShell
        rootClassName="frontdesk-app"
        mainStyle={mainStyle}
        rootProps={{ onClick: closeAll }}
        sidebar={
          <FrontdeskSidebar
            navItems={navItems.map((item) => ({
              label: item.label,
              href: item.path,
              icon: <NavIcon type={item.icon} />,
            }))}
            logoSrc="/public/logo.png"
          />
        }
      >
        {/* ── TOP BAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Bills</span>
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

            <div className="icon-btn" ref={userRef} onClick={(e) => { e.stopPropagation(); setUserOpen((v) => !v); setNotifOpen(false); }}>
              <TopbarUserIcon />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>&#9662;</span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
                profilePath={TOPBAR.frontdesk.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  closeAll();
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  closeAll();
                  requestLogout();
                }}
              />
            </div>

          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          {/* Heading */}
          <div className="page-heading">
            <h1 className="page-title">Bills &amp; Invoices</h1>
            <p className="page-sub">View and manage all rooms</p>
          </div>

          {/* Stat Cards */}
          <div className="stat-cards">
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                </div>
                <span className="stat-label">Room Bills</span>
              </div>
              <p className="stat-value">{countRoom}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                </div>
                <span className="stat-label">Event Bills</span>
              </div>
              <p className="stat-value">{countEvent}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-top">
                <div className="stat-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <span className="stat-label">Total Bills</span>
              </div>
              <p className="stat-value">{countTotal}</p>
            </div>
          </div>

          {rowsError ? (
            <div
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
                onClick={() => void loadBillingRows()}
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
            </div>
          ) : null}

          {/* Toolbar */}
          <div className="bills-toolbar">
            <div className="search-wrap">
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search reservations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Filter — sits beside search, dropdown anchored to it */}
            <div
              className="filter-wrap"
              onClick={(e) => { e.stopPropagation(); setFilterOpen(v => !v); setNotifOpen(false); setUserOpen(false); }}
            >
              <span>{filter}</span>
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"
                style={{ transform: filterOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
              >
                <polyline points="6 9 12 15 18 9"/>
              </svg>

              {/* Dropdown rendered only when open — prevents it being visible in the DOM */}
              {filterOpen && (
                <div className="filter-dropdown open">
                  {filterOptions.map((opt) => (
                    <div
                      key={opt}
                      className={`filter-option${filter === opt ? " active" : ""}`}
                      onClick={(e) => { e.stopPropagation(); setFilter(opt); setFilterOpen(false); }}
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="bills-table-wrap">
            <table className="bills-table">
              <thead>
                <tr>
                  {["Bill", "Customer", "Room", "Package", "Check-In", "Check-Out", "Amount", "Action"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.customer}</td>
                    <td>{b.room}</td>
                    <td>{b.package}</td>
                    <td>{b.checkin}</td>
                    <td>{b.checkout}</td>
                    <td>{fmtPeso(b.amount)}</td>
                    <td>
                      <div className="action-cell">
                        <button type="button" className="action-btn view-btn" title="View details" onClick={() => void openBillDetails(b)}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                        <button type="button" className="action-btn print-btn" title="Print" onClick={() => window.print()}>
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!rowsLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#bbb" }}>No bills found.</td>
                  </tr>
                )}
                {rowsLoading && (
                  <tr>
                    <td colSpan={8} style={{ padding: 32, textAlign: "center", color: "#9a8060" }}>Loading bills...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </main>
      </RailPortalShell>

      {/* ── BILL DETAILS MODAL ── */}
      <Modal
        open={!!selectedBill}
        onClose={() => setSelectedBill(null)}
        placement="top"
        contentOnly
        shellStyle={false}
        panelClassName="bill-modal-box"
        size="lg"
        ariaLabel="Bill details"
      >
          {selectedBill ? (
            <>
              <div className="bill-modal-alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="2.5" width="36" height="36">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="#e74c3c"/>
                </svg>
              </div>
              <button className="bill-modal-close" onClick={() => setSelectedBill(null)}>×</button>
              <h3 className="bill-modal-title">Bill Details</h3>
              <hr className="bill-modal-hr" />
              <div className="bill-modal-info">
                <p><strong>Bill #:</strong> {selectedBill.id}</p>
                <p><strong>Customer:</strong> {selectedBill.customer}</p>
                <p><strong>Room:</strong> {selectedBill.room}</p>
                <p><strong>Room Type:</strong> {selectedBill.roomType}</p>
                <p><strong>Date:</strong> {selectedBill.date}</p>
                <p><strong>Additional Guest:</strong> {selectedBill.addGuest}</p>
              </div>
              <div className="bill-modal-summary">
                <div className="bms-row"><span>Total Amount:</span>     <span className="bms-red">{fmtPeso(selectedBill.amount)}</span></div>
                <div className="bms-row"><span>Total Paid:</span>       <span className="bms-green">{fmtPeso(selectedBill.totalPaid)}</span></div>
                <div className="bms-row"><span>Remaining Balance:</span><span className="bms-red">{fmtPeso(selectedBill.balance)}</span></div>
              </div>

              {detailsLoading ? (
                <p style={{ marginTop: 10, color: "#8b6e53" }}>Loading bill details…</p>
              ) : selectedDetails ? (
                <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  {selectedDetails.billing?.id ? (
                    (() => {
                      const r = getSessionRole();
                      const canPay = r === "admin" || r === "cashier";
                      return canPay ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentDraft}
                            onChange={(e) => setPaymentDraft(e.target.value)}
                            style={{ padding: "7px 10px", border: "1px solid #d8c6ad", borderRadius: 8, minWidth: 150 }}
                          />
                          <button
                            type="button"
                            className="action-btn view-btn"
                            disabled={detailsBusy}
                            onClick={async () => {
                              const amount = Number(paymentDraft);
                              if (!Number.isFinite(amount) || amount < 0) {
                                window.alert("Enter a valid payment amount.");
                                return;
                              }
                              setDetailsBusy(true);
                              try {
                                await updateBillingPaymentBackend(selectedDetails.billing.id, { amountPaid: amount });
                                await refreshSelectedDetails();
                              } catch (e) {
                                window.alert(e?.message || "Payment update failed.");
                              } finally {
                                setDetailsBusy(false);
                              }
                            }}
                          >
                            {detailsBusy ? "Saving..." : "Update Payment"}
                          </button>
                        </div>
                      ) : (
                        <p style={{ marginTop: 8, fontSize: 13, color: "#7a5c3e" }}>
                          Payments are recorded by Cashier or Admin. Front desk can view this bill only.
                        </p>
                      );
                    })()
                  ) : null}

                  {String(selectedDetails.booking?.status || "").toLowerCase() === "pending" ? (
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <button
                        type="button"
                        className="action-btn view-btn"
                        disabled={detailsBusy}
                        onClick={async () => {
                          setDetailsBusy(true);
                          try {
                            await approveBookingBackend(selectedDetails.booking.id);
                            dispatchHousekeepingTasksRefresh();
                            dispatchHousekeepingInboxRefresh();
                            dispatchGuestBookingsRefreshPing();
                            await refreshSelectedDetails();
                          } catch (e) {
                            window.alert(e?.message || "Approve failed.");
                          } finally {
                            setDetailsBusy(false);
                          }
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="action-btn print-btn"
                        disabled={detailsBusy}
                        onClick={async () => {
                          const reason = window.prompt("Reject reason (optional):", "") ?? "";
                          setDetailsBusy(true);
                          try {
                            await rejectBookingBackend(selectedDetails.booking.id, reason);
                            dispatchGuestBookingsRefreshPing();
                            await refreshSelectedDetails();
                          } catch (e) {
                            window.alert(e?.message || "Reject failed.");
                          } finally {
                            setDetailsBusy(false);
                          }
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p style={{ marginTop: 10, color: "#8b6e53" }}>
                  No integrated details found for this row.
                </p>
              )}
            </>
          ) : null}
      </Modal>

      <StaffNotificationDetailModal
        notification={staffNotification}
        onClose={closeStaffNotification}
        onOpenReservation={(n) => {
          void openBookingFromBillNotification(n);
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

/* ── SIDEBAR ICON HELPER ── */
function NavIcon({ type }) {
  const p = { fill: "none", stroke: "white", strokeWidth: 2, width: 22, height: 22 };
  switch (type) {
    case "grid": return (
      <svg viewBox="0 0 24 24" {...p}>
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    );
    case "bed": return (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="white">
        <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z"/>
      </svg>
    );
    case "star": return (
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
        <path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/>
        <path d="M15 2h.01"/><path d="M22 20h.01"/>
        <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/>
        <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17"/>
        <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7"/>
        <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z"/>
      </svg>
    );
    case "home": return (
      <svg viewBox="0 0 24 24" {...p}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path d="M9 22V12h6v10"/>
      </svg>
    );
    case "card": return (
      <svg viewBox="0 0 24 24" {...p}>
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <line x1="2" y1="10" x2="22" y2="10"/>
      </svg>
    );
    case "clock": return (
      <svg viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    );
    case "gear": return (
      <svg viewBox="0 0 24 24" {...p}>
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
      </svg>
    );
    default: return null;
  }
}