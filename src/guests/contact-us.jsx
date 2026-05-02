import { useLayoutEffect } from "react";
import { Link } from "react-router-dom";
import ContactSection from "../components/ContactSection";
import "./homedashboard.css";

export default function ContactUs() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.remove("abela-auth-scroll");
    window.scrollTo(0, 0);
  }, []);

  return (
    <div
      className="homedashboard-page"
      style={{
        position: "relative",
        width: "100%",
        margin: 0,
        padding: 0,
      }}
    >
      <nav className="navbar">
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
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/testimonials">Testimonials</Link>
          </li>
          <li>
            <Link to="/contact" aria-current="page">
              Contact Us
            </Link>
          </li>
        </ul>
        <Link to="/login" className="btn-login-nav">
          Login
        </Link>
      </nav>

      <ContactSection />

      <footer className="footer">
        <p className="footer-brand">Abela Suites</p>
        <p className="footer-main">&copy; 2026 Abela Suites. All rights reserved.</p>
        <p className="footer-sub">Experience comfort and hospitality at its finest.</p>
      </footer>
    </div>
  );
}
