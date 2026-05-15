import { useLocation, useNavigate } from "react-router-dom";
import { useAdminShell } from "./AdminShellContext";
import "./admin-sidebar-collapse.css";
import "../cashier/cashier-sidebar-shared.css";

/** Admin rail icons (line style on gold); list order matches admin sidebar UX, not front desk. */
const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);
const RoomsIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
  </svg>
);
const EventsIcon = () => (
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
const BillsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);
/** Clock — used for Attendances (per admin menu). */
const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
/** Folded document — Booking Management. */
const BookingDocIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const StaffIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const InventoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
  </svg>
);
const RestoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
  </svg>
);

/** Admin menu: order and labels like the in-app admin rail (not the front desk ops rail). */
const SIDEBAR_ITEMS = [
  { label: "Dashboard", to: "/admin-dashboard", icon: <DashboardIcon /> },
  { label: "Staff Management", to: "/admin-staff", icon: <StaffIcon /> },
  { label: "Attendances", to: "/admin-attendance", icon: <ClockIcon /> },
  { label: "Booking Management", to: "/admin-booking-management", icon: <BookingDocIcon /> },
  { label: "Room Management", to: "/admin-room-management", icon: <RoomsIcon /> },
  { label: "Event Management", to: "/admin-event-management", icon: <EventsIcon /> },
  { label: "Inventory Management", to: "/admin-inventory", icon: <InventoryIcon /> },
  { label: "Restaurant Menu", to: "/admin-restaurant", icon: <RestoIcon /> },
  { label: "Bills and Invoices", to: "/admin-bills", icon: <BillsIcon /> },
  { label: "Settings", to: "/admin-settings", icon: <SettingsIcon /> },
];

const SETTINGS_ROUTES = new Set([
  "/admin-settings",
  "/admin-general",
  "/admin-export",
  "/admin-personal-info",
]);

function normalizePath(pathname) {
  if (pathname.length > 1 && pathname.endsWith("/")) return pathname.slice(0, -1);
  return pathname;
}

function adminNavIsSameRoute(to, currentPathname) {
  const t = normalizePath(to);
  const c = normalizePath(currentPathname);
  if (t === c) return true;
  if (t === "/admin-settings" && SETTINGS_ROUTES.has(c)) return true;
  return false;
}

/** Match prior NavLink `end` behavior: exact path, with settings subtree grouped under /admin-settings. */
function navItemIsActive(to, pathname) {
  const p = normalizePath(pathname);
  if (to === "/admin-settings" && SETTINGS_ROUTES.has(p)) return true;
  return normalizePath(to) === p;
}

/**
 * Programmatic navigation (no `<a href>`). Use the full `click` / keyboard activation only —
 * `mousedown`-based navigation fires `navigate()` mid-gesture so `mouseup`/`click` can land on
 * the next page’s buttons (Add / Delete modals on staff, attendance, inventory).
 */
function scheduleAdminNav(to, e, { pathname, navigate, isMobile, closeMobileSidebar }) {
  if (e && e.type === "click" && e.button !== 0) return;

  if (adminNavIsSameRoute(to, pathname)) {
    if (isMobile) closeMobileSidebar();
    return;
  }

  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (isMobile) closeMobileSidebar();
  navigate(to);
}

/** Shared admin shell sidebar: buttons + `navigate()` (avoids link mid-click repaints / ghost modals). */
export default function AdminSidebarNav({ logoSrc = "/public/logo.png", onLogoError }) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = normalizePath(location.pathname);
  const {
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    asideStyle,
    logoWrapStyle,
    logoImgStyle,
    shellClassName,
  } = useAdminShell();

  const normalizedLogoSrc =
    logoSrc === "/images/logo.png" || logoSrc === "/public/logo.png"
      ? "/logo.png"
      : logoSrc;

  const navCtx = { pathname: location.pathname, navigate, isMobile, closeMobileSidebar };

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className={`admin-mobile-backdrop${mobileSidebarOpen ? " open" : ""}`}
          onClick={closeMobileSidebar}
          aria-label="Close menu"
        />
      ) : null}
      <aside
        className={`sidebar ${shellClassName}`}
        style={asideStyle}
      >
        {isMobile ? (
          <button
            type="button"
            className="admin-mobile-close-btn"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
            title="Close menu"
          >
            ✕
          </button>
        ) : null}
        <button
          type="button"
          className="sidebar-logo"
          title="Admin dashboard"
          style={logoWrapStyle}
          onClick={(e) => scheduleAdminNav("/admin-dashboard", e, navCtx)}
        >
          <img
            src={normalizedLogoSrc}
            alt="Abela Suites"
            className="sidebar-logo-img"
            decoding="async"
            style={logoImgStyle}
            onError={onLogoError}
          />
        </button>
        <nav className="sidebar-nav">
          {SIDEBAR_ITEMS.map((item) => {
            const active = navItemIsActive(item.to, pathname);
            return (
              <button
                key={item.to}
                type="button"
                title={sidebarCollapsed ? item.label : undefined}
                className={`nav-item${active ? " active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={(e) => scheduleAdminNav(item.to, e, navCtx)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
