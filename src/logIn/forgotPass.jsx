import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import { ForgotPasswordIcon } from "./authPageIcons";
import { requestPasswordReset, setPasswordResetEmail } from "../api/authApi";
import "./forgotPass.css";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useAuthRouteScroll();

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleSubmit(e) {
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

    setPending(true);
    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setPasswordResetEmail(email.trim().toLowerCase());
      navigate("/enter-code");
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Something went wrong.";
      setError(msg || "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div
      className="abela-auth-page-shell"
      style={{ position: "relative", width: "100%", maxWidth: "100%" }}
    >
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

      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/login-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "linear-gradient(135deg, rgba(20,13,3,0.45) 0%, rgba(60,42,8,0.30) 100%)",
          zIndex: 1,
        }}
      />

      <main className="main-content">
        <div className="forgot-card">
          <div className="card-icon">
            <ForgotPasswordIcon className="auth-page-icon auth-page-icon--forgot" aria-hidden />
          </div>

          <h1 className="card-title">Forgot Password</h1>
          <p className="card-subtitle">
            Enter your email and we&apos;ll send you a verification code
            <br />
            to reset your password
          </p>

          <form className="forgot-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email" />
              <input
                type="text"
                id="email"
                placeholder="Your email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
              />
            </div>

            <p className={`error-message${error ? " visible" : ""}`} role="alert">
              {error}
            </p>

            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Sending…" : "Submit"}
            </button>

            <p className="back-text">
              <Link to="/login">Back to Log In</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
