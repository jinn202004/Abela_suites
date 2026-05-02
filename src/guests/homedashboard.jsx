import { useState, useLayoutEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import "./homedashboard.css";

// Public URLs (Vite serves `public/` at `/` — no `/public/` prefix; local assets were missing)
const RESTO_IMAGES = [
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=80",
];

const ROOMS_EVENTS_SLIDES = [
  { image: "/room-single-suite.png", name: "Single Suite", price: 824 },
  { image: "/room-executive.png", name: "Executive", price: 2940 },
  { image: "/venue-function-hall.png", name: "Function Hall", price: 12500 },
];

// --- Why Choose Us Cards ---
const WHY_CARDS = [
  {
    delay: "0s",
    title: "Modern Facilities",
    desc: "Well-maintained rooms with air conditioning, WiFi, and more",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <polyline points="9 21 9 12 15 12 15 21"/>
      </svg>
    ),
  },
  {
    delay: "0.08s",
    title: "Flexible Booking",
    desc: "6-hour and 12-hour room options available",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <polyline points="12 7 12 12 15 15"/>
      </svg>
    ),
  },
  {
    delay: "0.16s",
    title: "Event Venue",
    desc: "Perfect venue for weddings, birthdays, and more",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 12 20 22 4 22 4 12"/>
        <rect x="2" y="7" width="20" height="5"/>
        <line x1="12" y1="22" x2="12" y2="7"/>
        <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/>
        <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
      </svg>
    ),
  },
  {
    delay: "0.24s",
    title: "Affordable Rates",
    desc: "Competitive pricing for both rooms and events",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
        <line x1="1" y1="10" x2="23" y2="10"/>
      </svg>
    ),
  },
  {
    delay: "0.32s",
    title: "Friendly Staff",
    desc: "Kind and helpful staff ready to assist guests",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

// ============================================================
export default function HomeDashboard() {
  // Restaurant carousel
  const [restoIndex, setRestoIndex] = useState(0);
  const [restoFade, setRestoFade]   = useState(true);

  // Rooms & events carousel
  const [servicesIndex, setServicesIndex] = useState(0);
  const [servicesFade, setServicesFade]   = useState(true);

  /* Pixel min-height for hero <main> — fixes cream band below hero when global CSS
     from admin/booking (body flex, html/body height:100%) makes 100dvh/max() unreliable. */
  const [heroMinPx, setHeroMinPx] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0
  );

  const pageRootRef = useRef(null);

  const syncHeroViewportHeight = useCallback(() => {
    const vv = window.visualViewport?.height ?? 0;
    const inner = window.innerHeight;
    const client = document.documentElement?.clientHeight ?? 0;
    const h = Math.ceil(Math.max(vv, inner, client, 0));
    if (h > 0) {
      document.documentElement.style.setProperty("--hero-vh-px", `${h}px`);
      setHeroMinPx(h);
    }
    /* 1% of real inner height — used in CSS calc(var(--vh) * 100) so hero fills viewport on mobile */
    if (inner > 0) {
      document.documentElement.style.setProperty("--vh", `${inner * 0.01}px`);
    }
  }, []);

  useLayoutEffect(() => {
    const html = document.documentElement;
    syncHeroViewportHeight();
    requestAnimationFrame(() => syncHeroViewportHeight());
    const onOrient = () => window.setTimeout(syncHeroViewportHeight, 250);
    window.addEventListener("resize", syncHeroViewportHeight);
    window.addEventListener("load", syncHeroViewportHeight);
    window.addEventListener("orientationchange", onOrient);
    window.visualViewport?.addEventListener("resize", syncHeroViewportHeight);
    return () => {
      html.style.removeProperty("--hero-vh-px");
      html.style.removeProperty("--vh");
      window.removeEventListener("resize", syncHeroViewportHeight);
      window.removeEventListener("load", syncHeroViewportHeight);
      window.removeEventListener("orientationchange", onOrient);
      window.visualViewport?.removeEventListener("resize", syncHeroViewportHeight);
    };
  }, [syncHeroViewportHeight]);

  // --- Carousel handlers ---
  function restoSlide(direction) {
    setRestoFade(false);
    setTimeout(() => {
      setRestoIndex(i => (i + direction + RESTO_IMAGES.length) % RESTO_IMAGES.length);
      setRestoFade(true);
    }, 280);
  }

  function servicesSlide(direction) {
    setServicesFade(false);
    setTimeout(() => {
      setServicesIndex(i => (i + direction + ROOMS_EVENTS_SLIDES.length) % ROOMS_EVENTS_SLIDES.length);
      setServicesFade(true);
    }, 280);
  }

  // --- Scroll fade-in (observe all .fade-in-up inside this page after layout) ---
  useLayoutEffect(() => {
    const root = pageRootRef.current;
    if (!root) return;
    const els = root.querySelectorAll(".fade-in-up");

    const markVisibleIfInView = (el) => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight || 0;
      if (r.bottom > 0 && r.top < vh) el.classList.add("visible");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0, rootMargin: "0px 0px 12% 0px" }
    );

    els.forEach((el) => {
      observer.observe(el);
      markVisibleIfInView(el);
    });
    requestAnimationFrame(() => {
      els.forEach(markVisibleIfInView);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={pageRootRef}
      id="top"
      className="homedashboard-page"
      style={{
        position: "relative",
        width: "100%",
        margin: 0,
        padding: 0,
      }}
    >
      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-brand">
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
        </div>
        <ul className="nav-links">
          <li><a href="#top">Home</a></li>
          <li><Link to="/testimonials">Testimonials</Link></li>
          <li><Link to="/contact">Contact Us</Link></li>
        </ul>
        <Link to="/login" className="btn-login-nav">
          Login
        </Link>
      </nav>

      {/* ── HERO — inline minHeight (px) beats broken vh chain from bundled global layouts ── */}
      <main
        className="main-content"
        style={heroMinPx > 0 ? { minHeight: heroMinPx } : undefined}
      >
        <div className="hero-box">
          <h1 className="hero-title">Welcome to Abela Suites</h1>
          <div className="hero-rule">
            <span className="hero-rule-diamond"></span>
          </div>
          <h2 className="hero-subtitle">Where Services and Comforts Meet</h2>
          <p className="hero-desc">
            Stay with us, feel at home, and enjoy a place where comfort, care, and
            hospitality come together to create a truly memorable experience.
          </p>
          <a href="#services" className="btn-services">Our Services</a>
        </div>
      </main>

      {/* ── ROOMS & EVENTS (first section after hero) ── */}
      <section className="services-section" id="services">
        <div className="services-inner fade-in-up">
          <div className="services-carousel">
            <button className="services-arrow services-prev" onClick={() => servicesSlide(-1)} aria-label="Previous">&#8249;</button>
            <div className="services-img-wrapper">
              <img
                src={ROOMS_EVENTS_SLIDES[servicesIndex].image}
                alt={ROOMS_EVENTS_SLIDES[servicesIndex].name}
                className="services-img"
                style={{
                  opacity: servicesFade ? 1 : 0,
                  transform: servicesFade ? "scale(1)" : "scale(1.04)",
                  transition: "opacity 0.28s ease, transform 0.28s ease",
                }}
              />
            </div>
            <button className="services-arrow services-next" onClick={() => servicesSlide(1)} aria-label="Next">&#8250;</button>
          </div>
          <div className="services-text">
            <span className="services-label">Accommodations &amp; Events</span>
            <h2 className="services-title">Rooms &amp; Events</h2>
            <p className="services-room-pill">
              {ROOMS_EVENTS_SLIDES[servicesIndex].name}
              <span className="services-room-pill__price">
                ₱{ROOMS_EVENTS_SLIDES[servicesIndex].price.toLocaleString("en-PH")}
              </span>
            </p>
            <div className="services-rule"></div>
            <p className="services-desc">
              Experience comfort in our well-equipped rooms and celebrate your special
              occasions in our elegant event venues. Perfect for relaxation, gatherings,
              and memorable moments that last a lifetime.
            </p>
          </div>
        </div>
      </section>

      {/* ── RESTAURANT SECTION ── */}
      <section className="restaurant-section" id="restaurant">
        <div className="restaurant-inner fade-in-up">
          <div className="resto-carousel">
            <button className="resto-arrow resto-prev" onClick={() => restoSlide(-1)} aria-label="Previous">&#8249;</button>
            <div className="resto-img-wrapper">
              <img
                src={RESTO_IMAGES[restoIndex]}
                alt="Restaurant Food"
                className="resto-img"
                style={{
                  opacity: restoFade ? 1 : 0,
                  transform: restoFade ? "scale(1)" : "scale(1.04)",
                  transition: "opacity 0.28s ease, transform 0.28s ease",
                }}
              />
            </div>
            <button className="resto-arrow resto-next" onClick={() => restoSlide(1)} aria-label="Next">&#8250;</button>
          </div>
          <div className="resto-text">
            <span className="resto-label">Culinary Experience</span>
            <h2 className="resto-title">Abela's Restaurant Food</h2>
            <div className="resto-rule"></div>
            <p className="resto-desc">
              Enjoy a relaxing stay paired with delicious meals at our on-site restaurant.
              Abela Hotel and Restaurant offers cozy accommodations, tasty dishes, and a
              welcoming atmosphere — perfect for both rest and memorable dining.
            </p>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section className="why-section" id="testimonials">
        <span className="section-label">Our Promise</span>
        <h2 className="why-title">Why Choose Us?</h2>
        <div className="ornament-divider">
          <span className="ornament-diamond"></span>
        </div>
        <div className="why-grid">
          {WHY_CARDS.map((card) => (
            <div
              key={card.title}
              className="why-card fade-in-up"
              style={{ transitionDelay: card.delay }}
            >
              <div className="why-icon-box">{card.icon}</div>
              <h3 className="why-card-title">{card.title}</h3>
              <p className="why-card-desc">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HAVE QUESTIONS ── */}
      <section className="questions-section" id="contact">
        <span className="questions-eyebrow">Get In Touch</span>
        <h2 className="questions-title">Have Questions?</h2>
        <div className="ornament-divider" style={{ marginBottom: "20px" }}>
          <span className="ornament-diamond"></span>
        </div>
        <p className="questions-sub">Our team is here to help you plan your perfect stay or event</p>
        <Link to="/contact" className="btn-contact">
          Contact Us
        </Link>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <p className="footer-brand">Abela Suites</p>
        <p className="footer-main">&copy; 2026 Abela Suites. All rights reserved.</p>
        <p className="footer-sub">Experience comfort and hospitality at its finest.</p>
      </footer>
    </div>
  );
}
