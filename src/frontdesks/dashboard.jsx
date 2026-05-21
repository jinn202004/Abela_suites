import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  approveBookingBackend,
  rejectBookingBackend,
  updateBillingPaymentBackend,
  dispatchGuestBookingsRefreshPing,
  dispatchHousekeepingTasksRefresh,
  dispatchHousekeepingInboxRefresh,
  dispatchFrontdeskNotificationsRefresh,
  HOUSEKEEPING_TASKS_REFRESH_EVENT,
  HOUSEKEEPING_TASKS_STORAGE_PING_KEY,
  GUEST_BOOKINGS_STORAGE_PING_KEY,
} from "../api/guestApi";
import { getStoredAuthToken, AUTH_TOKEN_CHANGED_EVENT, getSessionRole } from "../api/authApi";
import StaffTopbarActions from "../topbar/StaffTopbarActions";
import { useFrontdeskPendingNotifications } from "./useFrontdeskPendingNotifications";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskShell } from "./FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "./FrontdeskSidebarToggle";
import FrontdeskSidebar from "./FrontdeskSidebar";
import { useNotificationRedirect } from "../navigation/useNotificationRedirect";
import {
  loadDashboardBundle,
  formatPeso,
  getFrontdeskBookingDetails,
} from "./dashboard.service";
import { Modal } from "../components/Modal";
import {
  isBookingActiveForFdCalendar,
  calendarDayState,
  bookingsActiveOnDay,
  formatCalendarHeading,
  bookingCalendarTypeLabel,
  bookingCalendarGuestName,
  bookingCalendarResourceLabel,
  bookingCalendarScheduleLine,
  bookingCalendarStatusDisplay,
} from "./frontdeskDashboardCalendar";
import "./frontdesk-dashboard.css";
import "./dashboard.css";

const DashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);
const RoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
  </svg>
);
const EventIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" width="22" height="22">
    <path d="M5.8 11.3 2 22l10.7-3.79" />
    <path d="M4 3h.01" />
    <path d="M22 8h.01" />
    <path d="M15 2h.01" />
    <path d="M22 20h.01" />
    <path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12v0c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10" />
    <path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11v0c-.11.7-.72 1.22-1.43 1.22H17" />
    <path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98v0C9.52 4.9 9 5.52 9 6.23V7" />
    <path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2z" />
  </svg>
);
const HouseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const BillsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const FileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const MoneyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
  </svg>
);
const WEEKDAY_LABELS = ["Mon", "Tues", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dateKeyFromCalDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayCalKey() {
  return dateKeyFromCalDate(new Date());
}

function buildCalendarGridCells(year, monthIndex) {
  const first = new Date(year, monthIndex, 1);
  const dow = first.getDay();
  const mondayOffset = dow === 0 ? 6 : dow - 1;
  const start = new Date(year, monthIndex, 1 - mondayOffset, 12, 0, 0, 0);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    cells.push({
      date: d,
      key: dateKeyFromCalDate(d),
      inMonth: d.getMonth() === monthIndex,
      label: d.getDate(),
    });
  }
  return cells;
}

function getBadgeClass(status) {
  const s = String(status || "").trim();
  if (s === "Available") return "badge-available";
  if (s === "Reserved") return "badge-pending";
  if (s === "Needs clean" || s === "Need Clean") return "badge-needclean";
  if (s === "Occupied") return "badge-occupied";
  if (s === "In Progress") return "badge-inprogress";
  if (s === "Complete") return "badge-completed";
  if (s === "Ready") return "badge-completed";
  if (s === "Active") return "badge-active";
  if (s === "Pending") return "badge-pending";
  if (s === "Declined" || s === "Cancelled") return s === "Cancelled" ? "badge-cancelled" : "badge-declined";
  if (s === "Completed") return "badge-completed";
  if (s === "—" || s === "–") return "badge-neutral";
  return "badge-neutral";
}

export default function FrontdeskDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDashboardPath =
    location.pathname === "/frontdesk-dashboard" ||
    location.pathname.endsWith("/frontdesk-dashboard");

  const onNotificationItemClick = useNotificationRedirect("frontdesk");
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const [currentTab, setCurrentTab] = useState("room");
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(!!getStoredAuthToken());
  const [summary, setSummary] = useState(null);
  const [summaryError, setSummaryError] = useState(null);
  const [roomRows, setRoomRows] = useState([]);
  const [eventRows, setEventRows] = useState([]);
  const [roomCatalogError, setRoomCatalogError] = useState(null);
  const [eventCatalogError, setEventCatalogError] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [bookingsError, setBookingsError] = useState(null);
  const [calView, setCalView] = useState(() => {
    const n = new Date();
    return { year: n.getFullYear(), monthIndex: n.getMonth() };
  });
  const [selectedDayKey, setSelectedDayKey] = useState(() => todayCalKey());

  const [selectedBookingDetails, setSelectedBookingDetails] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [paymentDraft, setPaymentDraft] = useState("");
  const [detailsBusy, setDetailsBusy] = useState(false);
  /** Ignore stale booking-detail responses when the user closes the modal or opens another row. */
  const bookingDetailsFetchGenRef = useRef(0);

  const refreshDashboard = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (!silent) setRefreshing(true);
    try {
      const d = await loadDashboardBundle();
      setDashboardLoading(false);
      setAuthenticated(d.authenticated);
      setSummary(d.summary);
      setSummaryError(d.summaryError);
      setRoomRows(Array.isArray(d.roomRows) ? d.roomRows : []);
      setEventRows(Array.isArray(d.eventRows) ? d.eventRows : []);
      setRoomCatalogError(d.roomCatalogError || null);
      setEventCatalogError(d.eventCatalogError || null);
      setBookings(Array.isArray(d.bookings) ? d.bookings : []);
      setBookingsError(d.bookingsError || null);
      if (!d.authenticated) {
        setSummary(null);
        setBookings([]);
        setBookingsError(null);
      }
    } finally {
      if (!silent) setRefreshing(false);
      setDashboardLoading(false);
    }
  }, []);

  const openFrontdeskBookingDetails = useCallback(async (bookingId) => {
    const bid = String(bookingId || "").trim();
    if (!bid) return;
    const gen = ++bookingDetailsFetchGenRef.current;
    setDetailsOpen(true);
    setDetailsLoading(true);
    setDetailsError("");
    try {
      const data = await getFrontdeskBookingDetails(bid);
      if (gen !== bookingDetailsFetchGenRef.current) return;
      setSelectedBookingDetails(data);
      const paid = data && data.billing ? Number(data.billing.amountPaid || 0) : 0;
      setPaymentDraft(String(Number.isFinite(paid) ? paid : 0));
    } catch (err) {
      if (gen !== bookingDetailsFetchGenRef.current) return;
      setSelectedBookingDetails(null);
      setDetailsError(err?.message || "Could not load booking details.");
    } finally {
      if (gen === bookingDetailsFetchGenRef.current) {
        setDetailsLoading(false);
      }
    }
  }, []);

  const reloadSelectedBookingDetails = useCallback(async () => {
    const bookingId = selectedBookingDetails?.booking?.id;
    if (!bookingId) return;
    await openFrontdeskBookingDetails(bookingId);
  }, [openFrontdeskBookingDetails, selectedBookingDetails]);

  const handleApproveFromDetails = useCallback(async () => {
    const bookingId = selectedBookingDetails?.booking?.id;
    if (!bookingId) return;
    setDetailsBusy(true);
    try {
      await approveBookingBackend(bookingId);
      dispatchHousekeepingTasksRefresh();
      dispatchHousekeepingInboxRefresh();
      dispatchGuestBookingsRefreshPing();
      dispatchFrontdeskNotificationsRefresh();
      await reloadSelectedBookingDetails();
      await refreshDashboard();
    } catch (err) {
      window.alert(err?.message || "Approve failed.");
    } finally {
      setDetailsBusy(false);
    }
  }, [reloadSelectedBookingDetails, selectedBookingDetails, refreshDashboard]);

  const handleRejectFromDetails = useCallback(async () => {
    const bookingId = selectedBookingDetails?.booking?.id;
    if (!bookingId) return;
    const reason = window.prompt("Enter reject reason (optional):", "") ?? "";
    setDetailsBusy(true);
    try {
      await rejectBookingBackend(bookingId, reason);
      dispatchGuestBookingsRefreshPing();
      dispatchFrontdeskNotificationsRefresh();
      await reloadSelectedBookingDetails();
      await refreshDashboard();
    } catch (err) {
      window.alert(err?.message || "Reject failed.");
    } finally {
      setDetailsBusy(false);
    }
  }, [reloadSelectedBookingDetails, selectedBookingDetails, refreshDashboard]);

  const handleUpdatePaymentFromDetails = useCallback(async () => {
    const role = getSessionRole();
    if (role !== "admin" && role !== "cashier") {
      window.alert("Only Cashier or Admin can record payments. Front desk can view billing totals.");
      return;
    }
    const billingId = selectedBookingDetails?.billing?.id;
    if (!billingId) return;
    const amount = Number(paymentDraft);
    if (!Number.isFinite(amount) || amount < 0) {
      window.alert("Please enter a valid payment amount.");
      return;
    }
    setDetailsBusy(true);
    try {
      await updateBillingPaymentBackend(billingId, { amountPaid: amount });
      await reloadSelectedBookingDetails();
      await refreshDashboard();
    } catch (err) {
      window.alert(err?.message || "Payment update failed.");
    } finally {
      setDetailsBusy(false);
    }
  }, [paymentDraft, reloadSelectedBookingDetails, selectedBookingDetails, refreshDashboard]);

  useEffect(() => {
    if (!isDashboardPath) return;
    void refreshDashboard();
  }, [isDashboardPath, location.pathname, refreshDashboard]);

  useEffect(() => {
    const onTok = () => void refreshDashboard();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    };
  }, [refreshDashboard]);

  /** Room / event status on the dashboard follows the same Mongo fields as housekeeping; keep in sync when HK updates. */
  useEffect(() => {
    if (!isDashboardPath || !authenticated) return undefined;
    const hk = () => void refreshDashboard({ silent: true });
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshDashboard({ silent: true });
    };
    const onStorage = (e) => {
      if (e.key === HOUSEKEEPING_TASKS_STORAGE_PING_KEY || e.key === GUEST_BOOKINGS_STORAGE_PING_KEY) {
        void refreshDashboard({ silent: true });
      }
    };
    window.addEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, hk);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVis);
    const poll = window.setInterval(() => void refreshDashboard({ silent: true }), 8000);
    return () => {
      window.removeEventListener(HOUSEKEEPING_TASKS_REFRESH_EVENT, hk);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVis);
      window.clearInterval(poll);
    };
  }, [isDashboardPath, authenticated, refreshDashboard]);

  const anySectionError = summaryError || roomCatalogError || eventCatalogError || bookingsError;

  const statPending = dashboardLoading || (refreshing && !summary) ? "…" : "—";
  const statCards = [
    {
      icon: <CalIcon />,
      label: "Reservations for Today",
      value: !authenticated ? "—" : summary ? String(summary.reservationsToday ?? 0) : statPending,
      cls: "stat-warning",
      valueClass: "",
    },
    {
      icon: <FileIcon />,
      label: "Total",
      value: !authenticated ? "—" : summary ? formatPeso(summary.totalRevenue) : statPending,
      cls: "stat-info",
      valueClass: "stat-value-money",
    },
    {
      icon: <CheckIcon />,
      label: "Check-Outs for Today",
      value: !authenticated ? "—" : summary ? String(summary.checkOutsToday ?? 0) : statPending,
      cls: "stat-success",
      valueClass: "",
    },
    {
      icon: <MoneyIcon />,
      label: "Balance",
      value: !authenticated ? "—" : summary ? formatPeso(summary.outstandingBalances) : statPending,
      cls: "stat-danger",
      valueClass: "stat-value-money",
    },
  ];

  const data = currentTab === "room" ? roomRows : eventRows;
  const q = search.toLowerCase();
  const filtered = (Array.isArray(data) ? data : []).filter((r) => {
    if (!r || typeof r !== "object") return false;
    const type = String(r.type ?? "").toLowerCase();
    const status = String(r.status ?? "").toLowerCase();
    return (
      String(r.number ?? "").includes(q) ||
      type.includes(q) ||
      status.includes(q) ||
      String(r.price ?? "").includes(q)
    );
  });

  const calendarCells = useMemo(
    () => buildCalendarGridCells(calView.year, calView.monthIndex),
    [calView.year, calView.monthIndex],
  );

  const calendarMonthLabel = useMemo(
    () =>
      new Date(calView.year, calView.monthIndex, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [calView.year, calView.monthIndex],
  );

  const activeBookings = useMemo(
    () => (Array.isArray(bookings) ? bookings : []).filter(isBookingActiveForFdCalendar),
    [bookings],
  );

  const selectedDayBookings = useMemo(() => {
    if (!authenticated) return [];
    return bookingsActiveOnDay(selectedDayKey, activeBookings);
  }, [authenticated, selectedDayKey, activeBookings]);

  function shiftCalMonth(delta) {
    setCalView((v) => {
      const d = new Date(v.year, v.monthIndex + delta, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  }

  function shiftCalYear(delta) {
    setCalView((v) => ({ ...v, year: v.year + delta }));
  }

  function handleTabSwitch(tab) {
    setCurrentTab(tab);
    setSearch("");
  }

  const { mainStyle } = useFrontdeskShell();

  return (
    <>
      <RailPortalShell
        rootClassName="frontdesk-app"
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
        mainStyle={mainStyle}
        sidebar={
          <FrontdeskSidebar
            navItems={[
              { label: "Dashboard", icon: <DashIcon />, href: "/frontdesk-dashboard" },
              { label: "Rooms", icon: <RoomIcon />, href: "/frontdesk-rooms" },
              { label: "Events", icon: <EventIcon />, href: "/frontdesk-events" },
              { label: "Housekeeping", icon: <HouseIcon />, href: "/frontdesk-housekeeping" },
              { label: "Bills", icon: <BillsIcon />, href: "/frontdesk-bills" },
              { label: "Reservation History", icon: <HistoryIcon />, href: "/frontdesk-history" },
              { label: "Settings", icon: <SettingsIcon />, href: "/frontdesk-settings" },
            ]}
          />
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Dashboard</span>
          </div>
          <StaffTopbarActions
            roleKey="frontdesk"
            notifications={displayNotifications}
            dot={pendingCount > 0 ? "active" : null}
            dotTitle="Pending or unread alerts"
            onNotificationsPanelOpen={() => void markStaffNotificationsSeen()}
            onNotificationItemClick={onNotificationItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        <main className="content">
          <div className="fd-heading">
            <h2 className="fd-title">Front Desk Dashboard</h2>
            <p className="fd-sub">Manage your hotel rooms, reservations, and availability</p>
          </div>

          <div className="fd-dash-toolbar">
            {anySectionError ? (
              <span className="fd-dash-banner" title={anySectionError}>
                Could not refresh some data.
              </span>
            ) : (
              <span />
            )}
            <button type="button" className="fd-dash-refresh" disabled={refreshing} onClick={() => void refreshDashboard()}>
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {!authenticated ? (
            <p className="fd-dash-signin">
              Sign in as front desk or admin to load today&apos;s counts, totals, balance, and event status. Room list below
              loads from the public catalog.
            </p>
          ) : null}

          <div className="fd-stats">
            {statCards.map((card) => (
              <div className="stat-card" key={card.label}>
                <div className={`stat-icon-label ${card.cls}`}>
                  {card.icon} {card.label}
                </div>
                <span className={`stat-value${card.valueClass ? ` ${card.valueClass}` : ""}`}>{card.value}</span>
              </div>
            ))}
          </div>
          {summaryError ? <p className="fd-dash-err">Bookings / billing: {summaryError}</p> : null}
          {roomCatalogError ? <p className="fd-dash-err">Rooms: {roomCatalogError}</p> : null}
          {eventCatalogError ? <p className="fd-dash-err">Events: {eventCatalogError}</p> : null}

          <div className="fd-tabs">
            <button
              type="button"
              className={`fd-tab fd-tab-left${currentTab === "room" ? " active" : ""}`}
              onClick={() => handleTabSwitch("room")}
            >
              Room Status
            </button>
            <button
              type="button"
              className={`fd-tab fd-tab-right${currentTab === "event" ? " active" : ""}`}
              onClick={() => handleTabSwitch("event")}
            >
              Event Status
            </button>
          </div>

          <div className="fd-search-wrap">
            <svg className="fd-search-icon" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" width="16" height="16">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="fd-search-input"
              placeholder="Search reservations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="fd-table-wrap">
            <table className="fd-table">
              <colgroup>
                <col className="col-num" />
                <col className="col-type" />
                <col className="col-price" />
                <col className="col-status" />
              </colgroup>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Type</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="fd-empty">
                      {currentTab === "event" && !authenticated
                        ? "Sign in to load event venues."
                        : "No records found."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((r, idx) => (
                    <tr key={`${currentTab}-${idx}-${r.number}`}>
                      <td>{r.number}</td>
                      <td>{r.type}</td>
                      <td>&#8369;{Number(r.price).toLocaleString()}</td>
                      <td>
                        <span className={`fd-badge ${getBadgeClass(r.status)}`}>{r.status}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {bookingsError ? <p className="fd-dash-err fd-cal-section-err">Booking calendar data: {bookingsError}</p> : null}

          <div className="fd-dash-grid fd-dash-grid--booking-cal">
            <section className="fd-dash-panel fd-booking-cal-panel">
              <h3 className="fd-dash-panel-title">Booking Calendar</h3>
              {!authenticated ? (
                <p className="fd-cal-signin-hint">Sign in to load reservation dates from the server.</p>
              ) : (
                <>
                  <div className="fd-cal-nav" role="toolbar" aria-label="Calendar navigation">
                    <button type="button" className="fd-cal-nav-btn" aria-label="Previous year" onClick={() => shiftCalYear(-1)}>
                      «
                    </button>
                    <button type="button" className="fd-cal-nav-btn" aria-label="Previous month" onClick={() => shiftCalMonth(-1)}>
                      ‹
                    </button>
                    <span className="fd-cal-nav-label">{calendarMonthLabel}</span>
                    <button type="button" className="fd-cal-nav-btn" aria-label="Next month" onClick={() => shiftCalMonth(1)}>
                      ›
                    </button>
                    <button type="button" className="fd-cal-nav-btn" aria-label="Next year" onClick={() => shiftCalYear(1)}>
                      »
                    </button>
                  </div>
                  <div className="fd-cal-weekdays" aria-hidden>
                    {WEEKDAY_LABELS.map((w) => (
                      <span key={w} className="fd-cal-weekday">
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="fd-cal-cells" role="grid" aria-label={`Calendar ${calendarMonthLabel}`}>
                    {calendarCells.map((cell) => {
                      const isSel = cell.key === selectedDayKey;
                      const { dots } =
                        authenticated && cell.inMonth
                          ? calendarDayState(cell.key, activeBookings)
                          : { dots: { pending: false, approved: false, occupied: false } };
                      const hasDots = dots.pending || dots.approved || dots.occupied;
                      const cls = [
                        "fd-cal-cell",
                        cell.inMonth ? "" : "fd-cal-cell--muted",
                        isSel ? "fd-cal-cell--selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          key={cell.key}
                          type="button"
                          role="gridcell"
                          className={cls}
                          disabled={!cell.inMonth}
                          aria-label={
                            cell.inMonth && hasDots
                              ? `${cell.label}, ${[
                                  dots.pending ? "pending" : "",
                                  dots.approved ? "approved" : "",
                                  dots.occupied ? "occupied" : "",
                                ]
                                  .filter(Boolean)
                                  .join(", ")}`
                              : undefined
                          }
                          onClick={() => {
                            if (!cell.inMonth) return;
                            setSelectedDayKey(cell.key);
                          }}
                        >
                          <span className="fd-cal-cell-num">{cell.label}</span>
                          {hasDots ? (
                            <span className="fd-cal-cell-dots" aria-hidden>
                              {dots.pending ? <span className="fd-cal-dot fd-cal-dot--pending" /> : null}
                              {dots.approved ? <span className="fd-cal-dot fd-cal-dot--approved" /> : null}
                              {dots.occupied ? <span className="fd-cal-dot fd-cal-dot--occupied" /> : null}
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                  <div className="fd-cal-legend">
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-dot fd-cal-legend-dot--pending" aria-hidden /> Pending
                    </span>
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-dot fd-cal-legend-dot--approved" aria-hidden /> Approved / Reserved
                    </span>
                    <span className="fd-cal-legend-item">
                      <span className="fd-cal-legend-dot fd-cal-legend-dot--occupied" aria-hidden /> Occupied
                    </span>
                  </div>
                </>
              )}
            </section>

            <section className="fd-dash-panel fd-booking-cal-panel fd-booking-cal-panel--detail">
              <h3 className="fd-dash-panel-title">Information of Reserved Days</h3>
              {!authenticated ? (
                <p className="fd-cal-signin-hint">Sign in to view bookings by date.</p>
              ) : (
                <>
                  <p className="fd-cal-detail-sub">Active bookings for {formatCalendarHeading(selectedDayKey)}.</p>
                  <div className="fd-cal-detail-list">
                    {selectedDayBookings.length === 0 ? (
                      <p className="fd-cal-detail-empty">No active bookings on this date.</p>
                    ) : (
                      selectedDayBookings.map((b, idx) => {
                        const bid = String(b.id ?? "").trim();
                        return (
                          <button
                            key={bid || `cal-day-${idx}`}
                            type="button"
                            className="fd-cal-detail-card"
                            onClick={() => bid && void openFrontdeskBookingDetails(bid)}
                          >
                            <div className="fd-cal-detail-meta">
                              <span className="fd-cal-detail-type">{bookingCalendarTypeLabel(b)}</span>
                              <span className="fd-cal-detail-status-pill">
                                {bookingCalendarStatusDisplay(b.status)}
                              </span>
                            </div>
                            <div className="fd-cal-detail-line">{bookingCalendarGuestName(b)}</div>
                            <div className="fd-cal-detail-row">{bookingCalendarResourceLabel(b)}</div>
                            <div className="fd-cal-detail-row">
                              Schedule: {bookingCalendarScheduleLine(b)}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </section>
          </div>
        </main>
      </RailPortalShell>

      <Modal
        open={detailsOpen}
        onClose={() => {
          bookingDetailsFetchGenRef.current += 1;
          setDetailsOpen(false);
          setDetailsLoading(false);
          setDetailsError("");
          setSelectedBookingDetails(null);
        }}
        title="Booking details"
        size="lg"
        placement="top"
      >
            {detailsLoading ? (
              <p>Loading…</p>
            ) : detailsError ? (
              <p style={{ color: "#a94442" }}>{detailsError}</p>
            ) : selectedBookingDetails ? (
              <div style={{ display: "grid", gap: 14 }}>
                <section style={{ border: "1px solid #eadfce", borderRadius: 10, padding: 12 }}>
                  <strong>Guest</strong>
                  <div>Name: {selectedBookingDetails.guest?.name || "—"}</div>
                  <div>Email: {selectedBookingDetails.guest?.email || "—"}</div>
                  <div>Contact: {selectedBookingDetails.guest?.contact || "—"}</div>
                </section>

                <section style={{ border: "1px solid #eadfce", borderRadius: 10, padding: 12 }}>
                  <strong>Booking</strong>
                  <div>ID: {selectedBookingDetails.booking?.id || "—"}</div>
                  <div>Room/Event: {selectedBookingDetails.booking?.roomOrEvent || "—"}</div>
                  <div>Status: {selectedBookingDetails.booking?.status || "—"}</div>
                  <div>Type: {selectedBookingDetails.booking?.type || "—"}</div>
                </section>

                <section style={{ border: "1px solid #eadfce", borderRadius: 10, padding: 12 }}>
                  <strong>Billing</strong>
                  <div>Total: {formatPeso(selectedBookingDetails.billing?.totalAmount || 0)}</div>
                  <div>Paid: {formatPeso(selectedBookingDetails.billing?.amountPaid || 0)}</div>
                  <div>Balance: {formatPeso(selectedBookingDetails.billing?.balance || 0)}</div>
                  <div>Status: {selectedBookingDetails.billing?.paymentStatus || "unpaid"}</div>

                  {selectedBookingDetails.billing?.id ? (
                    (() => {
                      const r = getSessionRole();
                      const canPay = r === "admin" || r === "cashier";
                      return canPay ? (
                        <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentDraft}
                            onChange={(e) => setPaymentDraft(e.target.value)}
                            style={{ padding: "8px 10px", border: "1px solid #d8c6ad", borderRadius: 8, minWidth: 160 }}
                            placeholder="Amount paid"
                          />
                          <button
                            type="button"
                            className="fd-action-btn fd-action-btn--primary"
                            disabled={detailsBusy}
                            onClick={() => void handleUpdatePaymentFromDetails()}
                          >
                            {detailsBusy ? "Saving…" : "Update payment"}
                          </button>
                        </div>
                      ) : (
                        <p style={{ marginTop: 10, fontSize: 13, color: "#7a5c3e" }}>
                          Payment updates: Cashier or Admin only.
                        </p>
                      );
                    })()
                  ) : (
                    <p style={{ marginTop: 10, color: "#8b6e53" }}>No billing row for this booking.</p>
                  )}
                </section>

                <section style={{ border: "1px solid #eadfce", borderRadius: 10, padding: 12 }}>
                  <strong>Housekeeping</strong>
                  <div>Room/Event status: {selectedBookingDetails.housekeeping?.roomOrEventStatus || "—"}</div>
                  <div>Task: {selectedBookingDetails.housekeeping?.taskStatus || "—"}</div>
                </section>

                {String(selectedBookingDetails.booking?.status || "").toLowerCase() === "pending" ? (
                  <section style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end", width: "100%" }}>
                    <button
                      type="button"
                      className="fd-action-btn fd-action-btn--approve"
                      disabled={detailsBusy}
                      onClick={() => void handleApproveFromDetails()}
                    >
                      {detailsBusy ? "Working…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="fd-action-btn fd-action-btn--reject"
                      disabled={detailsBusy}
                      onClick={() => void handleRejectFromDetails()}
                    >
                      {detailsBusy ? "Working…" : "Reject"}
                    </button>
                  </section>
                ) : null}
              </div>
            ) : (
              <p>No booking selected.</p>
            )}
      </Modal>

      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
