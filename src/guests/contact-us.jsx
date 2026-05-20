import { useLayoutEffect } from "react";
import MarketingNavbar from "../components/MarketingNavbar";
import ContactSection from "../components/ContactSection";
import "./homedashboard.css";
import "./contact-us.css";

export default function ContactUs() {
  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add("homedashboard-route");
    html.classList.remove("abela-auth-scroll");
    window.scrollTo(0, 0);
    return () => html.classList.remove("homedashboard-route");
  }, []);

  return (
    <div
      className="homedashboard-page contact-page-shell"
      style={{
        position: "relative",
        width: "100%",
        margin: 0,
        padding: 0,
      }}
    >
      <MarketingNavbar />

      <ContactSection />

      <footer className="footer">
        <p className="footer-brand">Abela Suites</p>
        <p className="footer-main">&copy; 2026 Abela Suites. All rights reserved.</p>
        <p className="footer-sub">Experience comfort and hospitality at its finest.</p>
      </footer>
    </div>
  );
}
