import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import MarketingNavbar from "../components/MarketingNavbar";
import {
  fetchRoomsCatalog,
  fetchPublicEventVenuesCatalog,
  fetchPublicMenuCatalog,
} from "../api/guestApi";
import { backendUrl } from "../api/config";
import { useFadeCarousel } from "../hooks/useFadeCarousel";
import { ImagePreviewModal } from "../components/ImagePreviewModal";
import "./homedashboard.css";

const LANDING_SYNC_MS = 12000;
const CAROUSEL_AUTO_MS = 2000;

const FALLBACK_ROOM_SLIDES = [
  { image: "/room-single-suite.png", name: "Single Suite", price: 824, meta: "Room" },
  { image: "/room-executive.png", name: "Executive", price: 2940, meta: "Room" },
];

const FALLBACK_EVENT_SLIDES = [
  { image: "/venue-function-hall.png", name: "Function Hall", price: 12500, meta: "Event venue" },
];

const FALLBACK_FOOD_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",
    name: "Chef's selection",
    price: 0,
    meta: "Available now",
  },
  {
    image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
    name: "House favorites",
    price: 0,
    meta: "Available now",
  },
];

function resolveCatalogImage(raw, placeholderLabel) {
  const s = String(raw ?? "").trim();
  if (!s) {
    return `https://placehold.co/900x600/f5f0e8/6b5a3e?text=${encodeURIComponent(placeholderLabel)}`;
  }
  if (/^https?:\/\//i.test(s) || s.startsWith("data:") || s.startsWith("blob:")) return s;
  const path = s.startsWith("/") ? s : `/${s}`;
  return backendUrl(path);
}

function catalogRoomsToSlides(rooms) {
  const list = Array.isArray(rooms) ? rooms : [];
  const mapped = list
    .slice()
    .sort((a, b) => {
      const na = parseInt(String(a.roomNumber ?? "").replace(/\D/g, ""), 10);
      const nb = parseInt(String(b.roomNumber ?? "").replace(/\D/g, ""), 10);
      if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
      return String(a.roomNumber ?? "").localeCompare(String(b.roomNumber ?? ""));
    })
    .map((r) => {
      const price = Number(r.price);
      const name =
        String(r.package ?? "").trim() ||
        String(r.title ?? "").trim() ||
        `Room ${String(r.roomNumber ?? "").trim() || "—"}`;
      return {
        image: resolveCatalogImage(r.image, name),
        name,
        price: Number.isFinite(price) ? price : 0,
        meta: String(r.roomNumber ?? "").trim() ? `Room ${r.roomNumber}` : "Room",
      };
    });
  return mapped.length > 0 ? mapped : null;
}

function catalogEventsToSlides(venues) {
  const list = Array.isArray(venues) ? venues : [];
  const mapped = list
    .slice()
    .sort((a, b) => String(a.eventNum ?? "").localeCompare(String(b.eventNum ?? "")))
    .map((v) => {
      const price = Number(v.price);
      const name =
        String(v.package ?? "").trim() ||
        String(v.name ?? "").trim() ||
        String(v.venueName ?? "").trim() ||
        "Event venue";
      return {
        image: resolveCatalogImage(v.imageUrl || v.image, name),
        name,
        price: Number.isFinite(price) ? price : 0,
        meta: String(v.type ?? "Event").trim() || "Event venue",
      };
    });
  return mapped.length > 0 ? mapped : null;
}

function catalogMenuToSlides(menu) {
  const list = Array.isArray(menu) ? menu : [];
  const mapped = list
    .slice()
    .sort((a, b) => String(a.itemName ?? a.name ?? "").localeCompare(String(b.itemName ?? b.name ?? "")))
    .map((m) => {
      const price = Number(m.price);
      const name = String(m.itemName ?? m.name ?? "").trim() || "Dish";
      const category = String(m.category ?? m.categoryId ?? "").trim();
      return {
        image: resolveCatalogImage(m.imageUrl, name),
        name,
        price: Number.isFinite(price) ? price : 0,
        meta: category || "Available now",
      };
    });
  return mapped.length > 0 ? mapped : null;
}

function slidesEqual(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (x.image !== y.image || x.name !== y.name || x.price !== y.price || x.meta !== y.meta) {
      return false;
    }
  }
  return true;
}

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

function CatalogCarousel({
  slides,
  index,
  fade,
  onPrev,
  onNext,
  onDot,
  onHoverChange,
  onImageClick,
  ariaLabel,
}) {
  const current = slides[index] ?? slides[0];
  if (!current) return null;

  return (
    <div
      className="catalog-carousel"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocusCapture={() => onHoverChange(true)}
      onBlurCapture={() => onHoverChange(false)}
    >
      <button type="button" className="catalog-arrow catalog-prev" onClick={onPrev} aria-label="Previous slide">
        &#8249;
      </button>
      <button
        type="button"
        className="catalog-img-wrapper catalog-img-wrapper--previewable"
        onClick={() => onImageClick?.(index)}
        aria-label={`View full-size photo of ${current.name}`}
      >
        <img
          src={current.image}
          alt=""
          aria-hidden="true"
          className="catalog-img"
          style={{
            opacity: fade ? 1 : 0,
            transform: fade ? "scale(1)" : "scale(1.04)",
            transition: "opacity 0.28s ease, transform 0.28s ease",
          }}
        />
        <span className="catalog-img-zoom-hint" aria-hidden="true">
          View photo
        </span>
      </button>
      <button type="button" className="catalog-arrow catalog-next" onClick={onNext} aria-label="Next slide">
        &#8250;
      </button>
      {slides.length > 1 ? (
        <div className="catalog-dots" role="tablist" aria-label={`${ariaLabel} slides`}>
          {slides.map((slide, i) => (
            <button
              key={`${slide.name}-${i}`}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Go to ${slide.name}`}
              className={`catalog-dot${i === index ? " catalog-dot--active" : ""}`}
              onClick={() => onDot(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CatalogCarouselSection({
  id,
  reverse,
  label,
  title,
  description,
  slides,
  carousel,
  onHoverChange,
  onImageClick,
  linkTo,
  linkLabel,
  liveCount,
}) {
  const current = slides[carousel.index] ?? slides[0];
  const showPrice = current && Number(current.price) > 0;

  return (
    <section className={`catalog-section${reverse ? " catalog-section--reverse" : ""}`} id={id}>
      <div className="catalog-inner fade-in-up">
        <CatalogCarousel
          slides={slides}
          index={carousel.index}
          fade={carousel.fade}
          onPrev={() => carousel.advance(-1)}
          onNext={() => carousel.advance(1)}
          onDot={carousel.goTo}
          onHoverChange={onHoverChange}
          onImageClick={onImageClick}
          ariaLabel={title}
        />
        <div className="catalog-text">
          <span className="catalog-label">{label}</span>
          <h2 className="catalog-title">{title}</h2>
          {current ? (
            <p className="catalog-pill">
              <span className="catalog-pill__meta">{current.meta}</span>
              <span className="catalog-pill__name">{current.name}</span>
              {showPrice ? (
                <span className="catalog-pill__price">₱{current.price.toLocaleString("en-PH")}</span>
              ) : null}
            </p>
          ) : null}
          <div className="catalog-rule" />
          <p className="catalog-desc">{description}</p>
          {typeof liveCount === "number" && liveCount > 0 ? (
            <p className="catalog-live-count" aria-live="polite">
              {liveCount} {liveCount === 1 ? "option" : "options"} available now
            </p>
          ) : null}
          {linkTo && linkLabel ? (
            <Link to={linkTo} className="catalog-cta">
              {linkLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}

export default function HomeDashboard() {
  const [roomSlides, setRoomSlides] = useState(FALLBACK_ROOM_SLIDES);
  const [eventSlides, setEventSlides] = useState(FALLBACK_EVENT_SLIDES);
  const [foodSlides, setFoodSlides] = useState(FALLBACK_FOOD_SLIDES);

  const [roomsPaused, setRoomsPaused] = useState(false);
  const [eventsPaused, setEventsPaused] = useState(false);
  const [foodPaused, setFoodPaused] = useState(false);
  const [catalogPreview, setCatalogPreview] = useState(null);

  const openCatalogPreview = useCallback((slides, slideIndex) => {
    const images = (slides ?? [])
      .map((s) => ({
        src: String(s?.image ?? "").trim(),
        alt: String(s?.name ?? "").trim(),
        caption: String(s?.name ?? "").trim(),
      }))
      .filter((item) => item.src);
    if (!images.length) return;
    const idx = Math.min(Math.max(0, slideIndex), images.length - 1);
    setCatalogPreview({ images, index: idx });
  }, []);

  const roomsCarousel = useFadeCarousel(roomSlides, {
    intervalMs: CAROUSEL_AUTO_MS,
    paused: roomsPaused,
  });
  const eventsCarousel = useFadeCarousel(eventSlides, {
    intervalMs: CAROUSEL_AUTO_MS,
    paused: eventsPaused,
  });
  const foodCarousel = useFadeCarousel(foodSlides, {
    intervalMs: CAROUSEL_AUTO_MS,
    paused: foodPaused,
  });

  const syncLandingCatalogs = useCallback(async () => {
    const [roomsRes, eventsRes, menuRes] = await Promise.allSettled([
      fetchRoomsCatalog(),
      fetchPublicEventVenuesCatalog(),
      fetchPublicMenuCatalog(),
    ]);

    if (roomsRes.status === "fulfilled") {
      const built = catalogRoomsToSlides(roomsRes.value);
      if (built) {
        setRoomSlides((prev) => (slidesEqual(prev, built) ? prev : built));
      }
    }
    if (eventsRes.status === "fulfilled") {
      const built = catalogEventsToSlides(eventsRes.value);
      if (built) {
        setEventSlides((prev) => (slidesEqual(prev, built) ? prev : built));
      }
    }
    if (menuRes.status === "fulfilled") {
      const built = catalogMenuToSlides(menuRes.value);
      if (built) {
        setFoodSlides((prev) => (slidesEqual(prev, built) ? prev : built));
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await syncLandingCatalogs();
    };
    run();
    const id = window.setInterval(run, LANDING_SYNC_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [syncLandingCatalogs]);

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
      <MarketingNavbar />

      <main
        className="main-content"
        style={heroMinPx > 0 ? { minHeight: heroMinPx } : undefined}
      >
        <div className="hero-box">
          <h1 className="hero-title">Welcome to Abela Suites</h1>
          <div className="hero-rule">
            <span className="hero-rule-diamond" />
          </div>
          <h2 className="hero-subtitle">Where Services and Comforts Meet</h2>
          <p className="hero-desc">
            Stay with us, feel at home, and enjoy a place where comfort, care, and
            hospitality come together to create a truly memorable experience.
          </p>
          <a href="#services" className="btn-services">Our Services</a>
        </div>
      </main>

      <div id="services" className="landing-services-hub" aria-label="Our services">
        <CatalogCarouselSection
          id="rooms"
          label="Accommodations"
          title="Rooms"
          description="Browse our live room catalog — the same listings used for guest bookings and front desk availability. Rates and packages update automatically when staff changes them."
          slides={roomSlides}
          carousel={roomsCarousel}
          onHoverChange={setRoomsPaused}
          onImageClick={(idx) => openCatalogPreview(roomSlides, idx)}
          liveCount={roomSlides.length}
        />

        <CatalogCarouselSection
          id="events"
          reverse
          label="Celebrations & gatherings"
          title="Event packages"
          description="Explore bookable event venues and packages synced from our events module. Perfect for weddings, birthdays, meetings, and special occasions."
          slides={eventSlides}
          carousel={eventsCarousel}
          onHoverChange={setEventsPaused}
          onImageClick={(idx) => openCatalogPreview(eventSlides, idx)}
          liveCount={eventSlides.length}
        />

        <CatalogCarouselSection
          id="restaurant"
          label="Culinary experience"
          title="Available food"
          description="Today's available dishes from our restaurant menu — the same catalog our cashier POS uses. Items marked available appear here in real time."
          slides={foodSlides}
          carousel={foodCarousel}
          onHoverChange={setFoodPaused}
          onImageClick={(idx) => openCatalogPreview(foodSlides, idx)}
          liveCount={foodSlides.length}
        />
      </div>

      <ImagePreviewModal
        open={Boolean(catalogPreview)}
        onClose={() => setCatalogPreview(null)}
        images={catalogPreview?.images}
        initialIndex={catalogPreview?.index ?? 0}
      />

      <section className="why-section" id="testimonials">
        <span className="section-label">Our Promise</span>
        <h2 className="why-title">Why Choose Us?</h2>
        <div className="ornament-divider">
          <span className="ornament-diamond" />
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

      <section className="questions-section" id="contact">
        <span className="questions-eyebrow">Get In Touch</span>
        <h2 className="questions-title">Have Questions?</h2>
        <div className="ornament-divider" style={{ marginBottom: "20px" }}>
          <span className="ornament-diamond" />
        </div>
        <p className="questions-sub">Our team is here to help you plan your perfect stay or event</p>
        <Link to="/contact" className="btn-contact">
          Contact Us
        </Link>
      </section>

      <footer className="footer">
        <p className="footer-brand">Abela Suites</p>
        <p className="footer-main">&copy; 2026 Abela Suites. All rights reserved.</p>
        <p className="footer-sub">Experience comfort and hospitality at its finest.</p>
      </footer>
    </div>
  );
}
