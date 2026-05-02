import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthRole } from "../context/AuthRoleContext";
import { getHomePathForRole } from "./rolePaths";
import { tryCredentials } from "./tryCredentials";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import "./login.css";

// --- Eye Icons ---
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

// ============================================================
export default function Login() {
  const navigate = useNavigate();
  const { setRole } = useAuthRole();
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPass, setShowPass]   = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors]       = useState({});
  const [banner, setBanner]       = useState("");

  const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  useAuthRouteScroll();

  function resetErrors() {
    setErrors({});
    setBanner("");
  }

  /** Align with LoginModal + tryCredentials: demo users are short names; password may be "123". */
  function validate() {
    const errs = {};
    let msg = "";
    const trimmed = email.trim();

    if (!trimmed && !password) {
      errs.email = "Email address is required.";
      errs.password = "Password is required.";
      msg = "Please fill in your email and password to continue.";
    } else {
      if (!trimmed) {
        errs.email = "Email address is required.";
      } else if (trimmed.includes("@") && !emailReg.test(trimmed)) {
        errs.email = "Please enter a valid email address (e.g. name@email.com).";
      }

      if (!password) {
        errs.password = "Password is required.";
      }

      if (Object.keys(errs).length > 0) {
        if (!trimmed) {
          msg = "Please enter your email address.";
        }
        else if (trimmed.includes("@") && !emailReg.test(trimmed)) {
          msg = "The email address you entered is not valid.";
        } else if (!password) msg = "Please enter your password.";
        else msg = "Please fix the errors above before continuing.";
      }
    }

    setErrors(errs);
    setBanner(msg);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin(e) {
    e.preventDefault();
    resetErrors();
    if (!validate()) return;
    const result = await tryCredentials(email, password);
    if (result.ok) {
      setRole(result.role);
      if (result.role === "guest") {
        sessionStorage.setItem("abela_guest_email", email.trim().toLowerCase());
      }
      navigate(getHomePathForRole(result.role));
      return;
    }
    if (result.reason === "network") {
      setBanner(
        "Could not reach the login server. Wait a few seconds after starting the app, then try again. If it keeps failing, check that the backend is running on port 5000.",
      );
    } else if (result.reason === "server") {
      setBanner(
        result.message ||
          "The login server returned an error. Check the backend terminal, MongoDB, and that JWT_SECRET is set in be/abela-be/.env.",
      );
    } else {
      setBanner(
        result.message ||
          "Invalid email or password. If you have not registered yet, use Sign Up first. Check for extra spaces in your password or a typo in your email.",
      );
    }
  }

  return (
    <div className="login-page abela-auth-page-shell">
      {/* ── BACKGROUND IMAGE ── */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url('/login-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: 0,
        pointerEvents: "none",
      }}></div>

      {/* ── DARK OVERLAY ── */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.4)",
        zIndex: 1,
        pointerEvents: "none",
      }}></div>

      <nav className="navbar">
        <div className="nav-brand">
          <img src="/logo.png" alt="Abela Suites Logo" className="nav-logo-img" />
          <span className="brand-name">Abela Suites</span>
        </div>
        <ul className="nav-links">
          <li><Link to="/">Home</Link></li>
          <li><a href="#testimonials">Testimonials</a></li>
          <li><Link to="/contact">Contact Us</Link></li>
        </ul>
        <Link to="/login" className="btn-login-nav">Login</Link>
      </nav>

      <main className="main-content">
        <div className="login-card">

          <div className="card-logo">
            <img src="/Abela-removebg-preview.png" alt="Abela Suites Logo" className="card-logo-img" />
            <div className="card-divider"></div>
          </div>

          <form className="login-form" onSubmit={handleLogin} noValidate>

            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                type="text"
                id="email"
                name="email"
                placeholder="Enter your email"
                autoComplete="username"
                value={email}
                className={errors.email ? "input-error" : ""}
                onChange={e => { setEmail(e.target.value); setErrors(er => ({ ...er, email: "" })); setBanner(""); }}
              />
              <span className={`field-err${errors.email ? " visible" : ""}`}>{errors.email}</span>
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  className={errors.password ? "input-error" : ""}
                  onChange={e => { setPassword(e.target.value); setErrors(er => ({ ...er, password: "" })); setBanner(""); }}
                />
                <button type="button" className="toggle-password" onClick={() => setShowPass(s => !s)}>
                  {showPass ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <span className={`field-err${errors.password ? " visible" : ""}`}>{errors.password}</span>
            </div>

            <div className="form-options">
              <label className="remember-label">
                <input type="checkbox" checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)} />
                Remember me
              </label>
              <Link to="/forgot-password" className="forgot-link">Forgot Password?</Link>
            </div>

            <p className={`error-message${banner ? " visible" : ""}`} role="status" aria-live="polite">
              {banner}
            </p>

            <button type="submit" className="btn-primary">Log In</button>

            <p className="signup-text">
              Don&apos;t have an account? <Link to="/signup">Sign Up</Link>
            </p>

          </form>
        </div>
      </main>
    </div>
  );
}
