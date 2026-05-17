import { Link, NavLink, useLocation } from "react-router-dom";

function navLinkClass({ isActive }) {
  return isActive ? "nav-link nav-link--active" : "nav-link";
}

export default function MarketingNavbar() {
  const { pathname } = useLocation();

  const handleHomeClick = (e) => {
    if (pathname !== "/") return;
    e.preventDefault();
    const top = document.getElementById("top");
    if (top) top.scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <nav className="navbar" aria-label="Primary">
      <Link to="/" className="nav-brand">
        <img
          src="/logo.png"
          alt=""
          className="nav-logo-img"
          width={46}
          height={46}
          onError={(e) => {
            e.currentTarget.src = "/favicon.svg";
          }}
        />
        <span className="brand-name">Abela Suites</span>
      </Link>
      <ul className="nav-links">
        <li>
          <NavLink to="/" end className={navLinkClass} onClick={handleHomeClick}>
            Home
          </NavLink>
        </li>
        <li>
          <NavLink to="/testimonials" className={navLinkClass}>
            Testimonials
          </NavLink>
        </li>
        <li>
          <NavLink to="/contact" className={navLinkClass}>
            Contact Us
          </NavLink>
        </li>
      </ul>
      <Link to="/login" className="btn-login-nav">
        Login
      </Link>
    </nav>
  );
}
