import { Link, useLocation } from "react-router-dom";
import "./MarketingNavbar.css";

function isHomePath(pathname) {
  return pathname === "/" || pathname === "/home-dashboard";
}

function isAuthPath(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    pathname === "/enter-code" ||
    pathname === "/set-password" ||
    pathname === "/verify-email"
  );
}

export default function MarketingNavbar() {
  const { pathname } = useLocation();
  const homeActive = isHomePath(pathname);
  const testimonialsActive = pathname === "/testimonials";
  const contactActive = pathname === "/contact";
  const loginActive = isAuthPath(pathname);

  return (
    <nav className="navbar marketing-navbar" aria-label="Primary">
      <Link to="/" className="nav-brand">
        <img
          src="/logo.png"
          alt=""
          className="nav-logo-img"
          width={46}
          height={46}
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/favicon.svg";
          }}
        />
        <span className="brand-name">Abela Suites</span>
      </Link>
      <ul className="nav-links">
        <li>
          <Link
            to="/"
            className={homeActive ? "tm-nav-current" : undefined}
            aria-current={homeActive ? "page" : undefined}
          >
            Home
          </Link>
        </li>
        <li>
          <Link
            to="/testimonials"
            className={testimonialsActive ? "tm-nav-current" : undefined}
            aria-current={testimonialsActive ? "page" : undefined}
          >
            Testimonials
          </Link>
        </li>
        <li>
          <Link
            to="/contact"
            className={contactActive ? "tm-nav-current" : undefined}
            aria-current={contactActive ? "page" : undefined}
          >
            Contact Us
          </Link>
        </li>
      </ul>
      <Link
        to="/login"
        className={`btn-login-nav${loginActive ? " tm-nav-current" : ""}`}
        aria-current={loginActive ? "page" : undefined}
      >
        Login
      </Link>
    </nav>
  );
}
