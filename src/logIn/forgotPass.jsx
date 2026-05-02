import { useState } from "react";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import { ForgotPasswordIcon } from "./authPageIcons";
import "./forgotPass.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  useAuthRouteScroll();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!email.includes("@")) {
      setError("Email must include an @ symbol (e.g. name@gmail.com).");
      return;
    }

    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address (e.g. name@gmail.com).");
      return;
    }

    // All good → redirect
    window.location.href = "/enter-code";
  }

  return (
    <div
      className="abela-auth-page-shell"
      style={{ position: "relative", width: "100%", maxWidth: "100%" }}
    >

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <div className="nav-brand">
          <img src="/public/logo.png" alt="Abela Suites Logo" className="nav-logo-img" />
          <span className="brand-name">Abela Suites</span>
        </div>
        <ul className="nav-links">
          <li><a href="#">Home</a></li>
          <li><a href="#">Testimonials</a></li>
          <li><a href="/contact">Contact Us</a></li>
        </ul>
        <a href="/login" className="btn-login-nav">Login</a>
      </nav>

     {/* ── BACKGROUND IMAGE ── */}
      <div style={{
        position: "fixed",
        inset: 0,
        backgroundImage: "url('/login-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        zIndex: 0,
      }}></div>

      {/* ── DARK OVERLAY ── */}
      <div style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, rgba(20,13,3,0.45) 0%, rgba(60,42,8,0.30) 100%)",
        zIndex: 1,
      }}></div>


      {/* ── FORGOT PASSWORD CARD ── */}
      <main className="main-content">
        <div className="forgot-card">

          {/* Lock Icon */}
          <div className="card-icon">
            <ForgotPasswordIcon className="auth-page-icon auth-page-icon--forgot" aria-hidden />
          </div>

          {/* Heading */}
          <h1 className="card-title">Forgot Password</h1>
          <p className="card-subtitle">
            Enter your email and we'll send you a link to reset<br />your password
          </p>

          {/* Form */}
          <form className="forgot-form" onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="email"></label>
              <input
                type="text"
                id="email"
                placeholder="Your email"
                autoComplete="off"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(""); }}
              />
            </div>

            {/* Error Message */}
            <p className={`error-message${error ? " visible" : ""}`} role="alert">
              {error}
            </p>

            <button type="submit" className="btn-primary">Submit</button>

            <p className="back-text">
              <a href="/login">Back to Log In</a>
            </p>

          </form>
        </div>
      </main>
    </div>
  );
}