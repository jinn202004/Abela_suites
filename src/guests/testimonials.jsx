import { useState, useLayoutEffect, useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchTestimonialsPublic, GUEST_PROFILE_UPDATED_EVENT } from "../api/guestApi";
import "./homedashboard.css";
import "./testimonials.css";

const HTML_ROUTE_CLASS = "homedashboard-route";

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

function GuestAvatar({ src }) {
  const [broken, setBroken] = useState(false);
  const showImg = Boolean(src && !broken);

  return (
    <div className={`tm-avatar${showImg ? " tm-avatar--has-img" : ""}`} aria-hidden>
      {showImg ? (
        <img src={src} alt="" onError={() => setBroken(true)} />
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )}
    </div>
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
      <nav className="navbar" aria-label="Primary">
        <div className="nav-brand">
          <Link to="/" className="tm-brand-link">
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
        </div>
        <ul className="nav-links">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/testimonials" className="tm-nav-current" aria-current="page">
              Testimonials
            </Link>
          </li>
          <li>
            <Link to="/contact">Contact Us</Link>
          </li>
        </ul>
        <Link to="/login" className="btn-login-nav">
          Login
        </Link>
      </nav>

      <main className="testimonials-main">
        <h1 className="tm-page-title">Guest&apos;s Review</h1>
        <p className="tm-page-sub">Recent guest reviews</p>

        {loading ? (
          <p className="tm-state">Loading reviews…</p>
        ) : error ? (
          <p className="tm-state tm-state--error">{error}</p>
        ) : items.length === 0 ? (
          <div className="tm-empty">
            <p className="tm-state">No reviews are published here yet.</p>
            <p className="tm-empty-hint">
              Guests can leave a review after a stay is marked <strong>completed</strong>, from{" "}
              <strong>Booking History</strong> in their account.
            </p>
            <details className="tm-empty-details">
              <summary className="tm-empty-summary">Property / developer</summary>
              <p className="tm-empty-dev">
                If the API has <code className="tm-code">TESTIMONIALS_REQUIRE_APPROVAL=true</code>, only approved reviews are
                listed—run <code className="tm-code">npm run approve-reviews</code> in <code className="tm-code">be/abela-be</code>{" "}
                or remove that line from <code className="tm-code">.env</code>. Ensure the frontend hits the same database
                (leave <code className="tm-code">VITE_API_BASE_URL</code> unset in dev so <code className="tm-code">/api</code>{" "}
                proxies to port 5000). Restart the backend after changing <code className="tm-code">.env</code>.
              </p>
            </details>
          </div>
        ) : (
          <div className="tm-grid">
            {items.map((r) => {
              const id = r.id || `${r.guestName}-${r.reviewedAt || ""}`;
              const isOpen = expanded[id];
              const body = String(r.comment || "");
              const long = body.length > 220;
              const showText = long && !isOpen ? `${body.slice(0, 220).trim()}…` : body;
              const email = String(r.email || "").trim();

              return (
                <article key={id} className="tm-card">
                  <header className="tm-card-head">
                    <GuestAvatar src={r.profilePhotoUrl} />
                    <div className="tm-card-user">
                      <h3 className="tm-card-name">{r.guestName}</h3>
                      {email ? <p className="tm-card-email">{email}</p> : null}
                    </div>
                    <Stars count={r.rating} />
                  </header>
                  <p className="tm-card-body">{showText}</p>
                  {long ? (
                    <button type="button" className="tm-see-more" onClick={() => toggleMore(id)}>
                      {isOpen ? "see less" : "see more..."}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
