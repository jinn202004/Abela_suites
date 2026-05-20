import { useState, useEffect } from "react";
import MarketingNavbar from "../components/MarketingNavbar";
import { Link, useNavigate } from "react-router-dom";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import { getPasswordResetToken, resetPasswordWithToken } from "../api/authApi";
import "./setPass.css";

/** Matches `be/abela-be/src/utils/passwordValidation.js` */
function passwordBackendError(password) {
  const p = String(password);
  if (p.length < 6) return "Password must be at least 6 characters";
  if (!/[a-z]/.test(p)) return "Password must contain at least one lowercase letter";
  if (!/[A-Z]/.test(p)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(p)) return "Password must contain at least one number";
  if (!/[^A-Za-z0-9]/.test(p)) return "Password must contain at least one special character";
  return null;
}

const EyeOpen = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default function SetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  useAuthRouteScroll();

  useEffect(() => {
    if (!getPasswordResetToken()) {
      navigate("/enter-code", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!showSuccess) return;
    if (countdown <= 0) {
      window.location.href = "/login";
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [showSuccess, countdown]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!getPasswordResetToken()) {
      setError("Your reset session expired. Go back and enter the code again.");
      return;
    }

    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    const pwErr = passwordBackendError(password);
    if (pwErr) {
      setError(pwErr);
      return;
    }
    if (!confirmPassword) {
      setError("Please confirm your password.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPasswordWithToken({ password });
      setShowSuccess(true);
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Could not update password.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="abela-auth-page-shell" style={{ position: "relative", width: "100%", maxWidth: "100%" }}>
      <MarketingNavbar />

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
        <div className="setnew-card">
          <h1 className="setnew-title">Set new password</h1>
          <p className="setnew-subtitle">
            At least 6 characters with upper, lower, number, and special character
          </p>

          <form className="setnew-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-wrapper">
                <input
                  type={showPass ? "text" : "password"}
                  id="password"
                  placeholder="••••••••••••"
                  value={password}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError("");
                  }}
                />
                <button type="button" className="toggle-password" onClick={() => setShowPass((v) => !v)}>
                  {showPass ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm password</label>
              <div className="password-wrapper">
                <input
                  type={showConfirm ? "text" : "password"}
                  id="confirm-password"
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  autoComplete="new-password"
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setError("");
                  }}
                />
                <button type="button" className="toggle-password" onClick={() => setShowConfirm((v) => !v)}>
                  {showConfirm ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
            </div>

            <p className={`error-message${error ? " visible" : ""}`} role="alert">
              {error}
            </p>

            <button type="submit" className="btn-confirm" disabled={submitting}>
              {submitting ? "Saving…" : "Confirm"}
            </button>

            <p className="back-login">
              <Link to="/login">Back to Log In</Link>
            </p>
          </form>
        </div>
      </main>

      {showSuccess && (
        <div className="success-overlay visible">
          <div className="success-card">
            <div className="success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#27ae60" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="success-title">Change Successfully!</h1>
            <p className="redirect-note">
              Your password has been updated.
              <br />
              Redirecting to login in <span>{countdown}</span>s…
              <br />
              <Link to="/login">Back to Log In</Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
