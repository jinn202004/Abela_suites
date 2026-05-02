import { useState, useRef } from "react";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import { EnterCodeIcon } from "./authPageIcons";
import "./enterCode.css";

export default function EnterCode() {
  const [otp, setOtp]     = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const inputs            = useRef([]);

  useAuthRouteScroll();

  function handleChange(value, index) {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    if (value && index < 5) {
      inputs.current[index + 1].focus();
    }
  }

  function handleKeyDown(e, index) {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1].focus();
    }
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split("").forEach((char, i) => { newOtp[i] = char; });
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((v) => v === "");
    const focusIdx  = nextEmpty === -1 ? 5 : nextEmpty;
    inputs.current[focusIdx].focus();
  }

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (otp.some((d) => d === "")) {
      setError("Please enter all 6 digits.");
      return;
    }
    window.location.href = "/set-password";
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

      {/* ── ENTER CODE CARD ── */}
      <main className="main-content">
        <div className="code-card">

          {/* Icon */}
          <div className="card-icon">
            <EnterCodeIcon className="auth-page-icon auth-page-icon--enter" aria-hidden />
          </div>

          {/* Heading */}
          <h1 className="card-title">Enter your code</h1>
          <p className="card-subtitle">A code has been sent to your email address.</p>

          {/* Form */}
          <form className="code-form" onSubmit={handleSubmit}>

            {/* 6 OTP Boxes */}
            <div className="otp-group" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => (inputs.current[i] = el)}
                  className="otp-input"
                  type="text"
                  maxLength={1}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={digit}
                  onChange={(e) => handleChange(e.target.value, i)}
                  onKeyDown={(e) => handleKeyDown(e, i)}
                />
              ))}
            </div>

            {/* Error Message */}
            <p className={`error-message${error ? " visible" : ""}`} role="alert">
              {error}
            </p>

            <button type="submit" className="btn-primary">Submit</button>

            <p className="resend-text">
              Didn't receive email? <a href="#">Click to resend</a>
            </p>

          </form>
        </div>
      </main>
    </div>
  );
}