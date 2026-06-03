import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import AdminTopbarActions from "./AdminTopbarActions";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useFrontdeskPendingNotifications } from "../frontdesks/useFrontdeskPendingNotifications";
import { useNotificationRedirect } from "../navigation/useNotificationRedirect";
import { AUTH_TOKEN_CHANGED_EVENT } from "../api/authApi";
import { formatPeso, loadStaffDashboardBundle } from "../frontdesks/dashboard.service";
import "./admin-dashboard.css";

Chart.register(...registerables);

const DAY_MS = 86400000;

// ── SVG Icons ──────────────────────────────────────────────────────────────
const CalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const HomeSmIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
  </svg>
);

function parseMoney(v) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(/[₱,\s]/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Parses API date strings (ISO or common slash formats). */
function parseDateLoose(s) {
  if (!s || typeof s !== "string") return null;
  const trimmed = s.trim();
  const iso = Date.parse(trimmed);
  if (!Number.isNaN(iso)) return new Date(iso);
  const m = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return null;
}

function bookingPrimaryDate(b) {
  const raw = b?.type === "room" ? b.checkIn : b.eventDate;
  return parseDateLoose(raw || "");
}

function isTerminalUpcomingStatus(st) {
  const k = String(st || "")
    .trim()
    .toLowerCase();
  return ["cancelled", "rejected", "declined", "completed"].includes(k);
}

function countUpcomingBookings(bookings) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  let n = 0;
  for (const b of bookings) {
    const d = bookingPrimaryDate(b);
    if (!d) continue;
    if (d < start) continue;
    if (isTerminalUpcomingStatus(b.status)) continue;
    n++;
  }
  return n;
}

/** Maps backend booking.status to dashboard pill class keys. */
function mapStatusToRecentLabel(status) {
  const k = String(status || "")
    .trim()
    .toLowerCase();
  if (k === "pending") return "Pending";
  if (["rejected", "declined", "cancelled"].includes(k)) return "Rejected";
  return "Approved";
}

function dayIndexInRollingRange(created, days) {
  const now = new Date();
  const rangeStart = new Date(now);
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));
  const c = new Date(created);
  c.setHours(0, 0, 0, 0);
  const diff = Math.round((c.getTime() - rangeStart.getTime()) / DAY_MS);
  if (diff < 0 || diff >= days) return -1;
  return diff;
}

function bookingOverviewFromBookings(bookings, days) {
  const labels = [];
  const rangeStart = new Date();
  rangeStart.setHours(0, 0, 0, 0);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));
  for (let i = 0; i < days; i++) {
    const d = new Date(rangeStart);
    d.setDate(rangeStart.getDate() + i);
    if (days <= 14) {
      labels.push(d.toLocaleDateString("en-US", { weekday: "short" }));
    } else {
      labels.push(
        `${d.getMonth() + 1}/${d.getDate()}`,
      );
    }
  }
  const approved = new Array(days).fill(0);
  const pending = new Array(days).fill(0);
  const cancelled = new Array(days).fill(0);
  for (const b of bookings) {
    if (!b?.createdAt) continue;
    const idx = dayIndexInRollingRange(new Date(b.createdAt), days);
    if (idx < 0) continue;
    const k = String(b.status || "")
      .trim()
      .toLowerCase();
    if (k === "pending") pending[idx] += 1;
    else if (["cancelled", "rejected", "declined"].includes(k)) cancelled[idx] += 1;
    else approved[idx] += 1;
  }
  return { labels, approved, pending, cancelled };
}

/** Approximate room vs event intake by calendar week (last 28 days); POS left zero without a ledger API. */
function salesBucketsFromBookings(bookings) {
  const now = Date.now();
  const room = [0, 0, 0, 0];
  const event = [0, 0, 0, 0];
  const pos = [0, 0, 0, 0];
  for (const b of bookings) {
    const ts = new Date(b.updatedAt || b.createdAt).getTime();
    const daysAgo = Math.floor((now - ts) / DAY_MS);
    if (daysAgo < 0 || daysAgo > 27) continue;
    const w = Math.floor(daysAgo / 7);
    const bucketIndex = 3 - w;
    const amt = parseMoney(b.paymentAmount || b.totalAmount || b.venuePrice);
    if (b.type === "room") room[bucketIndex] += amt;
    else if (b.type === "event") event[bucketIndex] += amt;
  }
  const total = room.map((r, i) => r + event[i] + pos[i]);
  return { room, event, pos, total };
}

function recentRows(bookings, recentDays) {
  const cutoff = Date.now() - recentDays * DAY_MS;
  const rows = (Array.isArray(bookings) ? bookings : []).filter((b) => {
    const t = new Date(b.createdAt || b.updatedAt).getTime();
    return t >= cutoff;
  });
  rows.sort((a, b) => {
    const ta = new Date(b.updatedAt || b.createdAt).getTime();
    const tb = new Date(a.updatedAt || a.createdAt).getTime();
    return ta - tb;
  });
  return rows.slice(0, 12).map((b) => ({
    name:
      String(b.customerName ?? "").trim() ||
      (b.guest && typeof b.guest === "object" && b.guest.displayName) ||
      b.email ||
      "Guest",
    status: mapStatusToRecentLabel(b.status),
  }));
}

const STATUS_CLASS = {
  Approved: "status-approved",
  Rejected: "status-rejected",
  Pending: "status-pending",
};

const BOOKING_LEGENDS = [
  { color: "#27ae60", label: "Approved" },
  { color: "#f1c40f", label: "Pending" },
  { color: "#e74c3c", label: "Cancelled/Rejected" },
];

const SALES_LEGENDS = [
  { color: "#3498db", label: "Room Revenue" },
  { color: "#e67e22", label: "Event Revenue" },
  { color: "#9b59b6", label: "POS Sales" },
];

export default function AdminDashboard() {
  const { mainStyle } = useAdminShell();
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const onNotificationItemClick = useNotificationRedirect("admin");
  const {
    displayNotifications,
    markStaffNotificationsSeen,
    hasNotifAttention,
  } = useFrontdeskPendingNotifications({ bookingType: "all" });
  const bookingChartRef = useRef(null);
  const salesChartRef = useRef(null);
  const bookingChartIns = useRef(null);
  const salesChartIns = useRef(null);

  const [summary, setSummary] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [availableRoomsCount, setAvailableRoomsCount] = useState(null);
  const [fetchOk, setFetchOk] = useState({
    summary: false,
    bookings: false,
    rooms: false,
  });
  const [loadError, setLoadError] = useState("");
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [overviewDays, setOverviewDays] = useState(7);
  const [recentDays, setRecentDays] = useState(7);

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await loadStaffDashboardBundle();
      const s = data.summary;
      setSummary(
        s && typeof s === "object"
          ? {
              reservationsToday: typeof s.reservationsToday === "number" ? s.reservationsToday : 0,
              checkOutsToday: typeof s.checkOutsToday === "number" ? s.checkOutsToday : 0,
              totalRevenue: typeof s.totalRevenue === "number" ? s.totalRevenue : 0,
              outstandingBalances: typeof s.outstandingBalances === "number" ? s.outstandingBalances : 0,
            }
          : null,
      );
      setAvailableRoomsCount(
        typeof data.availableRoomsCount === "number" ? data.availableRoomsCount : 0,
      );
      setBookings(data.bookings ?? []);
      setFetchOk({
        summary: Boolean(s),
        bookings: Array.isArray(data.bookings) && data.bookings.length >= 0,
        rooms: typeof data.availableRoomsCount === "number",
      });
      setLoadError(data.loadError && !data.ok ? data.loadError : "");
    } catch (e) {
      setSummary(null);
      setBookings([]);
      setAvailableRoomsCount(null);
      setFetchOk({ summary: false, bookings: false, rooms: false });
      setLoadError(
        e?.message ||
          "Dashboard could not be loaded. Sign in as admin or front desk and ensure the API is running.",
      );
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount load only
  }, []);

  useEffect(() => {
    const onAuth = () => void refreshDashboard();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onAuth);
  }, [refreshDashboard]);

  const overviewSeries = useMemo(
    () => bookingOverviewFromBookings(bookings, overviewDays),
    [bookings, overviewDays],
  );
  const salesBuckets = useMemo(() => salesBucketsFromBookings(bookings), [bookings]);
  const recentList = useMemo(
    () => recentRows(bookings, recentDays),
    [bookings, recentDays],
  );

  const statCards = useMemo(() => {
    const dash = "—";
    const todayBookings =
      fetchOk.summary && summary && typeof summary.reservationsToday === "number"
        ? String(summary.reservationsToday)
        : dashboardLoading
          ? "…"
          : dash;
    const upcoming = fetchOk.bookings
      ? String(countUpcomingBookings(bookings))
      : dashboardLoading
        ? "…"
        : dash;
    const avail =
      fetchOk.rooms && typeof availableRoomsCount === "number"
        ? String(availableRoomsCount)
        : dashboardLoading
          ? "…"
          : dash;
    const revenue =
      fetchOk.summary && summary && typeof summary.totalRevenue === "number"
        ? formatPeso(summary.totalRevenue)
        : dashboardLoading
          ? "…"
          : dash;

    return [
      {
        icon: <CalIcon />,
        label: "Today's bookings",
        value: todayBookings,
        colorClass: "stat-warning",
      },
      {
        icon: <ClockIcon />,
        label: "Upcoming bookings",
        value: upcoming,
        colorClass: "stat-info",
      },
      {
        icon: <CheckIcon />,
        label: "Available rooms",
        value: avail,
        colorClass: "stat-success",
      },
      {
        icon: <HomeSmIcon />,
        label: "Total revenue",
        value: revenue,
        colorClass: "stat-danger",
      },
    ];
  }, [summary, bookings, availableRoomsCount, dashboardLoading, fetchOk]);

  useEffect(() => {
    if (!bookingChartRef.current) return;
    bookingChartIns.current?.destroy();
    const { labels, approved, pending, cancelled } = overviewSeries;
    const maxDataset = Math.max(
      5,
      ...approved,
      ...pending,
      ...cancelled,
      1,
    );
    const step = maxDataset <= 10 ? 2 : Math.ceil(maxDataset / 5);
    bookingChartIns.current = new Chart(bookingChartRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Approved",
            data: approved,
            borderColor: "#27ae60",
            backgroundColor: "rgba(39,174,96,0.08)",
            tension: 0.4,
            pointRadius: 3,
            fill: true,
          },
          {
            label: "Pending",
            data: pending,
            borderColor: "#f1c40f",
            backgroundColor: "rgba(241,196,15,0.08)",
            tension: 0.4,
            pointRadius: 3,
            fill: true,
          },
          {
            label: "Cancelled/Rejected",
            data: cancelled,
            borderColor: "#e74c3c",
            backgroundColor: "rgba(231,76,60,0.08)",
            tension: 0.4,
            pointRadius: 3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            min: 0,
            max: Math.max(10, maxDataset + 1),
            ticks: { stepSize: step, font: { size: 11 } },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
          x: {
            ticks: {
              maxRotation: overviewDays > 14 ? 45 : 0,
              font: { size: 10 },
            },
            grid: { display: false },
          },
        },
      },
    });
    return () => {
      bookingChartIns.current?.destroy();
    };
  }, [overviewSeries, overviewDays]);

  useEffect(() => {
    if (!salesChartRef.current) return;
    salesChartIns.current?.destroy();
    const { room, event, pos } = salesBuckets;
    const maxBar = Math.max(1000, ...room, ...event, ...pos, 1);
    salesChartIns.current = new Chart(salesChartRef.current, {
      type: "bar",
      data: {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        datasets: [
          { label: "Room Revenue", data: room, backgroundColor: "#3498db" },
          { label: "Event Revenue", data: event, backgroundColor: "#e67e22" },
          { label: "POS Sales", data: pos, backgroundColor: "#9b59b6" },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            max: maxBar * 1.05,
            ticks: {
              callback: (v) =>
                `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`,
              font: { size: 11 },
            },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
          x: { ticks: { font: { size: 11 } }, grid: { display: false } },
        },
      },
    });
    return () => {
      salesChartIns.current?.destroy();
    };
  }, [salesBuckets]);

  return (
    <>
      <RailPortalShell rootClassName="app-layout admin-app-layout" mainStyle={mainStyle} sidebar={<AdminSidebarNav />}>

        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Dashboard</span>
          </div>
          <AdminTopbarActions
            notifications={displayNotifications}
            bellAttention={hasNotifAttention}
            onNotificationsPanelOpen={markStaffNotificationsSeen}
            onNotificationItemClick={onNotificationItemClick}
            onRequestLogout={requestLogout}
          />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">

          <div className="db-heading-row">
            <h2 className="db-title">Abela&rsquo;s Dashboard</h2>
            <p className="db-sub">Overview of key metrics and performance indicators</p>
          </div>

          {loadError ? (
            <p className="db-sub" style={{ color: "#c0392b", marginBottom: "0.75rem" }}>
              {loadError}
            </p>
          ) : null}

          {/* Stat Cards */}
          <div className="db-stats">
            {statCards.map((card) => (
              <div key={card.label} className="stat-card">
                <div className={`stat-icon-label ${card.colorClass}`}>
                  {card.icon}
                  {card.label}
                </div>
                <span className="stat-value">{card.value}</span>
              </div>
            ))}
          </div>

          {/* Charts + Recent Bookings */}
          <div className="db-main-grid">

            {/* LEFT: Charts */}
            <div className="db-charts">

              {/* Booking Overview */}
              <div className="db-card">
                <div className="db-card-header">
                  <span className="db-card-title">Booking Overview</span>
                  <div className="select-wrap-sm">
                    <select
                      className="db-select-sm"
                      value={overviewDays}
                      onChange={(e) => setOverviewDays(Number(e.target.value))}
                    >
                      <option value={7}>Last 7 Days</option>
                      <option value={30}>Last 30 Days</option>
                      <option value={90}>Last 3 Months</option>
                    </select>
                  </div>
                </div>
                <div className="db-chart-canvas-wrap" style={{ position: "relative", height: 200 }}>
                  <canvas ref={bookingChartRef} />
                </div>
                <div className="chart-legend">
                  {BOOKING_LEGENDS.map(({ color, label }) => (
                    <span key={label}>
                      <span className="legend-dot" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
                <p className="db-sub" style={{ marginTop: "0.5rem", fontSize: "12px", opacity: 0.85 }}>
                  Counts by booking creation date (approved vs pending vs cancelled/rejected). Loaded from{' '}
                  <code style={{ fontSize: "11px" }}>/api/frontdesk/dashboard-bundle</code>.
                </p>
              </div>

              {/* Sales Report */}
              <div className="db-card">
                <div className="db-card-header">
                  <span className="db-card-title">Sales Report</span>
                </div>
                <div className="db-chart-canvas-wrap" style={{ position: "relative", height: 220 }}>
                  <canvas ref={salesChartRef} />
                </div>
                <div className="chart-legend">
                  {SALES_LEGENDS.map(({ color, label }) => (
                    <span key={label}>
                      <span className="legend-dot" style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>
                <p className="db-sub" style={{ marginTop: "0.5rem", fontSize: "12px", opacity: 0.85 }}>
                  Approximate room vs event amounts from booking payment fields by week (POS stays 0 until a POS ledger API exists).
                </p>
              </div>

            </div>

            {/* RIGHT: Recent Bookings */}
            <div className="db-card db-recent">
              <div className="db-card-header">
                <span className="db-card-title">Recent Booking</span>
                <div className="select-wrap-sm">
                  <select
                    className="db-select-sm"
                    value={recentDays}
                    onChange={(e) => setRecentDays(Number(e.target.value))}
                  >
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                  </select>
                </div>
              </div>
              <div className="recent-list">
                {dashboardLoading ? (
                  <p className="db-sub">Loading…</p>
                ) : recentList.length === 0 ? (
                  <p className="db-sub">No bookings in this range.</p>
                ) : (
                  recentList.map((b, i) => (
                    <div key={`${b.name}-${i}`} className="recent-row">
                      <span className="recent-name">{b.name}</span>
                      <span className={`recent-status ${STATUS_CLASS[b.status]}`}>{b.status}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </main>
      </RailPortalShell>


      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />
    </>
  );
}
