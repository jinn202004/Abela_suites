import { useState, useRef } from "react";
import MarketingNavbar from "../components/MarketingNavbar";
import { Link, useNavigate } from "react-router-dom";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import { EnterCodeIcon } from "./authPageIcons";
import {
  getPasswordResetEmail,
  requestPasswordReset,
  verifyPasswordResetOtp,
} from "../api/authApi";
import "./enterCode.css";

export default function EnterCode() {
  const navigate = useNavigate();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendMsg, setResendMsg] = useState("");
  const [pending, setPending] = useState(false);
  const [resendPending, setResendPending] = useState(false);
  const inputs = useRef([]);

  useAuthRouteScroll();

  function handleChange(value, index) {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");
    setResendMsg("");
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
    setError("");
    setResendMsg("");
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split("").forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    const nextEmpty = newOtp.findIndex((v) => v === "");
    const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
    inputs.current[focusIdx].focus();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setResendMsg("");
    if (otp.some((d) => d === "")) {
      setError("Please enter all 6 digits.");
      return;
    }
    const em = getPasswordResetEmail();
    if (!em) {
      setError("Session expired. Start again from Forgot password.");
      return;
    }
    const code = otp.join("");
    setPending(true);
    try {
      await verifyPasswordResetOtp(em, code);
      navigate("/set-password");
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Invalid or expired code.";
      setError(msg);
    } finally {
      setPending(false);
    }
  }

  async function handleResend(e) {
    e.preventDefault();
    setError("");
    setResendMsg("");
    const em = getPasswordResetEmail();
    if (!em) {
      setError("Session expired. Start again from Forgot password.");
      return;
    }
    setResendPending(true);
    try {
      await requestPasswordReset(em);
      setResendMsg("A new verification code has been sent to your email.");
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Could not resend code.";
      setError(msg);
    } finally {
      setResendPending(false);
    }
  }

  return (
    <div
      className="abela-auth-page-shell"
      style={{ position: "relative", width: "100%", maxWidth: "100%" }}
    >
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
        <div className="code-card">
          <div className="card-icon">
            <EnterCodeIcon className="auth-page-icon auth-page-icon--enter" aria-hidden />
          </div>

          <h1 className="card-title">Enter your code</h1>
          <p className="card-subtitle">
            Enter the 6-digit code sent to your email. Codes expire in a few minutes.
          </p>

          <form className="code-form" onSubmit={handleSubmit}>
            <div className="otp-group" onPaste={handlePaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => {
                    inputs.current[i] = el;
                  }}
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

            <p className={`error-message${error ? " visible" : ""}`} role="alert">
              {error}
            </p>
            {resendMsg ? (
              <p className="card-subtitle" style={{ marginTop: "0.25rem", textAlign: "center" }} role="status">
                {resendMsg}
              </p>
            ) : null}

            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Checking…" : "Submit"}
            </button>

            <p className="resend-text">
              Didn&apos;t receive email?{" "}
              <button
                type="button"
                onClick={handleResend}
                disabled={resendPending}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  color: "inherit",
                  textDecoration: "underline",
                  cursor: resendPending ? "wait" : "pointer",
                  font: "inherit",
                }}
              >
                {resendPending ? "Sending…" : "Resend code"}
              </button>
            </p>

            <p className="back-text" style={{ marginTop: "0.75rem" }}>
              <Link to="/forgot-password">Back to Forgot password</Link>
              {" · "}
              <Link to="/login">Log In</Link>
            </p>
          </form>
        </div>
      </main>
    </div>
  );
}
