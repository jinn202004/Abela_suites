import { Link, useLocation } from "react-router-dom";
import { useFrontdeskShell } from "./FrontdeskShellContext";

/** Shared frontdesk sidebar: same mobile drawer + desktop collapse pattern as admin_1. */
export default function FrontdeskSidebar({ navItems, logoSrc = "/logo.png", onLogoError }) {
  const location = useLocation();
  const {
    asideStyle,
    logoWrapStyle,
    logoImgStyle,
    shellClassName,
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
  } = useFrontdeskShell();

  const homeHref = navItems && navItems[0] && navItems[0].href ? navItems[0].href : "/frontdesk-dashboard";

  return (
    <>
      {isMobile ? (
        <button
          type="button"
          className={`frontdesk-mobile-backdrop${mobileSidebarOpen ? " open" : ""}`}
          onClick={closeMobileSidebar}
          aria-label="Close menu"
        />
      ) : null}
      <aside className={`sidebar ${shellClassName}`} style={asideStyle}>
        {isMobile ? (
          <button
            type="button"
            className="frontdesk-mobile-close-btn"
            onClick={closeMobileSidebar}
            aria-label="Close menu"
            title="Close menu"
          >
            ✕
          </button>
        ) : null}
        <Link
          to={homeHref}
          className="sidebar-logo"
          title="Front desk"
          style={logoWrapStyle}
          onClick={() => {
            if (isMobile) closeMobileSidebar();
          }}
        >
          <img
            src={logoSrc}
            alt="Abela Suites"
            className="sidebar-logo-img"
            decoding="async"
            style={logoImgStyle}
            onError={onLogoError}
          />
        </Link>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.href}
              title={sidebarCollapsed ? item.label : undefined}
              className={`nav-item${location.pathname === item.href ? " active" : ""}`}
              onClick={() => {
                if (isMobile) closeMobileSidebar();
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
