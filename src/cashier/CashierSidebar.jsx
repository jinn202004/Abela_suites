import { Link, NavLink } from "react-router-dom";
import { CASHIER_NAV_ITEMS } from "./cashierNavItems";

export default function CashierSidebar({
  shellClassName = "",
  asideStyle,
  logoWrapStyle,
  logoImgStyle,
  isMobile = false,
  closeMobileSidebar,
  logoHref = "/cashier",
}) {
  return (
    <aside className={`sidebar ${shellClassName}`} style={asideStyle}>
      {isMobile ? (
        <button
          type="button"
          className="cashier-mobile-close-btn"
          onClick={closeMobileSidebar}
          aria-label="Close menu"
        >
          ×
        </button>
      ) : null}
      <Link
        to={logoHref}
        className="sidebar-logo"
        title="POS"
        style={logoWrapStyle}
        onClick={() => {
          if (isMobile) closeMobileSidebar?.();
        }}
      >
        <img
          src="/logo.png"
          alt="Abela Suites Logo"
          className="sidebar-logo-img"
          decoding="async"
          style={logoImgStyle}
        />
      </Link>
      <nav className="sidebar-nav">
        {CASHIER_NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.end}
            onClick={() => {
              if (isMobile) closeMobileSidebar?.();
            }}
            className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
