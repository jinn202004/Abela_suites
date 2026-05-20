import { useState, useLayoutEffect, useEffect } from "react";
import MarketingNavbar from "../components/MarketingNavbar";
import { fetchTestimonialsPublic, GUEST_PROFILE_UPDATED_EVENT } from "../api/guestApi";
import "./homedashboard.css";
import "./testimonials.css";

const HTML_ROUTE_CLASS = "homedashboard-route";
const SKELETON_COUNT = 3;

function Stars({ count = 5 }) {
  const n = Math.min(5, Math.max(0, Number(count) || 0));
  return (
    <div className="tm-stars" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`tm-star${i <= n ? " tm-star--on" : ""}`}>
          ★
        </span>
      ))}
    </div>
  );
}

function GuestAvatar({ src, name }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(src && !broken);
  const initial = String(name || "G").trim().charAt(0).toUpperCase() || "G";

  return (
    <div className={`tm-avatar${showImg ? " tm-avatar--has-img" : ""}`} aria-hidden>
      {showImg ? (
        <img src={src} alt="" onError={() => setBroken(true)} />
      ) : (
        <span className="tm-avatar-initial">{initial}</span>
      )}
    </div>
  );
}

function maskEmail(email) {
  const s = String(email || "").trim();
  if (!s || !s.includes("@")) return "";
  const [local, domain] = s.split("@");
  if (!domain) return "";
  if (local.length <= 1) return `•••@${domain}`;
  const visible = local.slice(0, 2);
  return `${visible}${"•".repeat(Math.min(4, Math.max(1, local.length - 2)))}@${domain}`;
}

function formatReviewDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function TestimonialSkeleton() {
  return (
    <article className="tm-card tm-card--skeleton" aria-hidden>
      <div className="tm-card-head">
        <div className="tm-skel tm-skel--avatar" />
        <div className="tm-skel-block">
          <div className="tm-skel tm-skel--line tm-skel--short" />
          <div className="tm-skel tm-skel--line tm-skel--xs" />
        </div>
        <div className="tm-skel tm-skel--stars" />
      </div>
      <div className="tm-skel tm-skel--line" />
      <div className="tm-skel tm-skel--line tm-skel--med" />
    </article>
  );
}

function TestimonialsHeader({ count, loading }) {
  return (
    <header className="tm-hero">
      <span className="tm-hero-eyebrow">Guest voices</span>
      <h1 className="tm-page-title">Guest&apos;s Review</h1>
      <div className="tm-hero-ornament" aria-hidden>
        <span className="tm-hero-ornament-line" />
        <span className="tm-hero-ornament-diamond" />
        <span className="tm-hero-ornament-line" />
      </div>
      <p className="tm-page-sub">
        {loading
          ? "Loading recent guest reviews…"
          : count > 0
            ? `${count} recent ${count === 1 ? "review" : "reviews"} from our guests`
            : "Recent guest reviews"}
      </p>
    </header>
  );
}

function TestimonialCard({ review, index, expanded, onToggle }) {
  const id = review.id || `${review.guestName}-${review.reviewedAt || ""}`;
  const isOpen = expanded[id];
  const body = String(review.comment || "").trim();
  const long = body.length > 220;
  const showText = long && !isOpen ? `${body.slice(0, 220).trim()}…` : body;
  const emailMasked = maskEmail(review.email);
  const reviewedLabel = formatReviewDate(review.reviewedAt);

  return (
    <article
      className="tm-card tm-card--visible"
      style={{ animationDelay: `${Math.min(index, 8) * 0.07}s` }}
    >
      <span className="tm-card-quote" aria-hidden>
        &ldquo;
      </span>
      <header className="tm-card-head">
        <GuestAvatar src={review.profilePhotoUrl} name={review.guestName} />
        <div className="tm-card-user">
          <h2 className="tm-card-name">{review.guestName}</h2>
          {emailMasked ? <p className="tm-card-email">{emailMasked}</p> : null}
          {reviewedLabel ? (
            <time className="tm-card-date" dateTime={review.reviewedAt}>
              {reviewedLabel}
            </time>
          ) : null}
        </div>
        <Stars count={review.rating} />
      </header>
      <div className="tm-card-main">
        <p className="tm-card-body">
          {showText || <span className="tm-card-body--muted">No comment provided.</span>}
        </p>
        {long ? (
          <button type="button" className="tm-see-more" onClick={() => onToggle(id)}>
            {isOpen ? "See less" : "See more"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function Testimonials() {
  const [expanded, setExpanded] = useState({});
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useLayoutEffect(() => {
    const html = document.documentElement;
    html.classList.add(HTML_ROUTE_CLASS);
    return () => {
      html.classList.remove(HTML_ROUTE_CLASS);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const load = async (isInitial) => {
      if (isInitial) {
        setLoading(true);
        setError("");
      }
      try {
        const list = await fetchTestimonialsPublic();
        if (!cancelled) setItems(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) {
          if (isInitial) setError(e?.message || "Could not load reviews.");
          setItems([]);
        }
      } finally {
        if (!cancelled && isInitial) setLoading(false);
      }
    };
    void load(true);
    const onProfile = () => void load(false);
    window.addEventListener(GUEST_PROFILE_UPDATED_EVENT, onProfile);
    return () => {
      cancelled = true;
      window.removeEventListener(GUEST_PROFILE_UPDATED_EVENT, onProfile);
    };
  }, []);

  const toggleMore = (id) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  return (
    <div className="homedashboard-page testimonials-shell">
      <MarketingNavbar />

      <main className="testimonials-main">
        <TestimonialsHeader count={items.length} loading={loading} />

        {loading ? (
          <div className="tm-grid tm-grid--loading" aria-busy="true" aria-label="Loading reviews">
            {Array.from({ length: SKELETON_COUNT }, (_, i) => (
              <TestimonialSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="tm-panel tm-panel--error" role="alert">
            <p className="tm-state tm-state--error">{error}</p>
            <p className="tm-panel-hint">Please refresh the page or try again in a moment.</p>
          </div>
        ) : items.length === 0 ? (
          <div className="tm-panel tm-panel--empty">
            <div className="tm-empty-icon" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="tm-state">No reviews are published here yet.</p>
            <p className="tm-empty-hint">
              Guests can leave a review after a stay is marked <strong>completed</strong>, from{" "}
              <strong>Booking History</strong> in their account.
            </p>
          </div>
        ) : (
          <div className="tm-grid">
            {items.map((r, i) => (
              <TestimonialCard
                key={r.id || `${r.guestName}-${i}`}
                review={r}
                index={i}
                expanded={expanded}
                onToggle={toggleMore}
              />
            ))}
          </div>
        )}
      </main>

      <footer className="footer testimonials-footer">
        <p className="footer-brand">Abela Suites</p>
        <p className="footer-main">&copy; 2026 Abela Suites. All rights reserved.</p>
      </footer>
    </div>
  );
}
