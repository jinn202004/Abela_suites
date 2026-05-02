import { Link, useLocation } from "react-router-dom";
import "./housekeeping-sidebar-collapse.css";
import "../cashier/cashier-sidebar-shared.css";

function normalizeLogoSrc(logoSrc) {
  if (logoSrc === "/images/logo.png" || logoSrc === "/public/logo.png") return "/logo.png";
  return logoSrc;
}

/** Shared housekeeping sidebar: same shell structure as admin_1 (drawer on narrow viewports). */
export default function HousekeepingSidebar({
  navItems,
  logoSrc = "/logo.png",
  /** Default home route for logo tap (first nav item used if unset). */
  logoHref,
  sidebarCollapsed = false,
  isMobile = false,
  mobileSidebarOpen = false,
  closeMobileSidebar = () => {},
  shellClassName = "",
  asideStyle,
  logoWrapStyle,
  logoImgStyle,
}) {
  const location = useLocation();
  const home = logoHref || (navItems && navItems[0] && navItems[0].href) || "/housekeeping";
  const normalizedLogoSrc = normalizeLogoSrc(logoSrc);
  const showCollapsedTitle = Boolean(sidebarCollapsed) && !isMobile;

  return (
    <>
      {isMobile && mobileSidebarOpen ? (
        <div
          className="housekeeping-mobile-backdrop"
          onClick={closeMobileSidebar}
          aria-hidden
        />
      ) : null}
      <aside className={`sidebar sidebar--frontdesk-template ${shellClassName}`} style={asideStyle}>
        {isMobile ? (
          <button
            type="button"
            className="housekeeping-mobile-close-btn"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
            title="Close menu"
          >
            ✕
          </button>
        ) : null}
        <Link
          to={home}
          className="sidebar-logo"
          title="Housekeeping"
          style={logoWrapStyle}
          onClick={() => {
            if (isMobile) closeMobileSidebar();
          }}
        >
          <img
            src={normalizedLogoSrc}
            alt="Abela Suites Logo"
            className="sidebar-logo-img"
            decoding="async"
            style={logoImgStyle}
          />
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active = Boolean(item.active) || location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                title={showCollapsedTitle ? item.label : undefined}
                className={`nav-item${active ? " active" : ""}`}
                onClick={() => {
                  if (isMobile) closeMobileSidebar();
                }}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
