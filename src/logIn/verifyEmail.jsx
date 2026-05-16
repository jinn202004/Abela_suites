import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import { sendVerificationEmail, verifyEmailAccount } from "../api/authApi";
import "./enterCode.css";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const email = useMemo(() => String(searchParams.get("email") || "").trim().toLowerCase(), [searchParams]);

  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [resendBusy, setResendBusy] = useState(false);
  useAuthRouteScroll();

  const runVerify = useCallback(async () => {
    if (!token || !email) {
      setStatus("error");
      setMessage("This verification link is invalid. Use the link from your email or request a new one.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const data = await verifyEmailAccount({ email, token });
      setStatus("ok");
      setMessage(typeof data.message === "string" ? data.message : "Email verified.");
    } catch (err) {
      setStatus("error");
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Could not verify email.";
      setMessage(msg);
    }
  }, [email, token]);

  useEffect(() => {
    void runVerify();
  }, [runVerify]);

  async function handleResend() {
    if (!email) return;
    setResendBusy(true);
    setMessage("");
    try {
      await sendVerificationEmail({ email });
      setMessage("If the account exists and needs verification, an email was sent.");
    } catch (err) {
      const msg = err && typeof err === "object" && "message" in err ? String(err.message) : "Could not resend.";
      setMessage(msg);
    } finally {
      setResendBusy(false);
    }
  }

  return (
    <div className="abela-auth-page-shell" style={{ position: "relative", width: "100%", maxWidth: "100%" }}>
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
        <div className="code-card">
          <h1 className="card-title">Email verification</h1>
          <p className="card-subtitle">
            {status === "loading" ? "Verifying your email…" : null}
            {status === "ok" ? (
              <>
                {message}
                <br />
                <br />
                <Link to="/guests">Continue to guest home</Link>
              </>
            ) : null}
            {status === "error" ? message : null}
            {status === "idle" && !token ? "Open the link from your registration email." : null}
          </p>
          {status === "error" && email ? (
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button type="button" className="btn-primary" onClick={() => void handleResend()} disabled={resendBusy}>
                {resendBusy ? "Sending…" : "Resend verification email"}
              </button>
            </div>
          ) : null}
          <p className="back-text" style={{ marginTop: "1.25rem" }}>
            <Link to="/login">Back to Log In</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
