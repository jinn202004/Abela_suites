import { useState, useEffect } from "react";
import MarketingNavbar from "../components/MarketingNavbar";
import { Link, useNavigate } from "react-router-dom";
import { useAuthRole } from "../context/AuthRoleContext";
import { registerUser, loginUser } from "../api/authApi";
import { getHomePathForRole } from "./rolePaths";
import { useAuthRouteScroll } from "./useAuthRouteScroll";
import styles from "./signUp.module.css";

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

export default function SignUp() {
  const navigate = useNavigate();
  const { setRole } = useAuthRole();
  const [fields, setFields] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    agreeTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [strength, setStrength] = useState({ pct: "0%", color: "", text: "" });
  const [showStrength, setShowStrength] = useState(false);
  const [modalActive, setModalActive] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailVerifyHint, setShowEmailVerifyHint] = useState(false);

  useAuthRouteScroll();

  /* ── PASSWORD STRENGTH ── */
  useEffect(() => {
    const val = fields.password;
    if (!val) { setShowStrength(false); return; }
    setShowStrength(true);
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/[0-9]/.test(val)) score++;
    if (/[^A-Za-z0-9]/.test(val)) score++;
    const levels = [
      { pct: "25%", color: "#e74c3c", text: "Weak" },
      { pct: "50%", color: "#e67e22", text: "Fair" },
      { pct: "75%", color: "#f1c40f", text: "Good" },
      { pct: "100%", color: "#27ae60", text: "Strong" },
    ];
    setStrength(levels[score - 1] || levels[0]);
  }, [fields.password]);

  /* ── FIELD CHANGE ── */
  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFields((prev) => ({ ...prev, [id]: type === "checkbox" ? checked : value }));
    setErrors((prev) => ({ ...prev, [id]: "" }));
    setBanner("");
  };

  /* ── VALIDATION + API ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors = {};
    const emailReg = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneReg = /^[+]?[\d\s\-().]{7,20}$/;

    if (!fields.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!fields.lastName.trim()) newErrors.lastName = "Last name is required.";

    if (!fields.email.trim()) {
      newErrors.email = "Email address is required.";
    } else if (!emailReg.test(fields.email.trim())) {
      newErrors.email = "Please enter a valid email address (e.g. name@email.com).";
    }

    if (fields.phone && !phoneReg.test(fields.phone.trim())) {
      newErrors.phone = "Please enter a valid phone number.";
    }

    if (!fields.password) {
      newErrors.password = "Password is required.";
    } else {
      const pwErr = passwordBackendError(fields.password);
      if (pwErr) newErrors.password = pwErr;
    }

    if (!fields.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password.";
    } else if (fields.password && fields.confirmPassword !== fields.password) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (!fields.agreeTerms) {
      newErrors.agreeTerms = "You must agree to the Terms & Conditions.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setBanner("Please fix the errors above before creating your account.");
      return;
    }

    setBanner("");
    setIsSubmitting(true);
    const emailTrim = fields.email.trim().toLowerCase();
    let registered = false;
    try {
      const newUser = await registerUser({
        email: emailTrim,
        password: fields.password,
        firstName: fields.firstName,
        lastName: fields.lastName,
        phone: fields.phone,
      });
      registered = true;
      setShowEmailVerifyHint(Boolean(newUser && newUser.emailVerified === false));
    } catch (err) {
      const st = Number(err?.status);
      if (st === 409) {
        const base =
          err.message ||
          "An account with this email already exists. Try Log in, or use a different email address.";
        setBanner(`${base} — We sent: ${emailTrim}`);
      } else {
        setBanner(
          err.message || "Could not create your account. Check that the server is running and try again.",
        );
      }
    }

    if (registered) {
      try {
        const { user } = await loginUser(emailTrim, fields.password);
        setRole(user.role);
        setModalActive(true);
        setTimeout(() => setModalVisible(true), 10);
      } catch (loginErr) {
        setBanner(
          `Your account was created, but automatic sign-in failed (${loginErr.message || "unknown error"}). Open Log in and sign in with the same email and password you just used.`,
        );
      }
    }
    setIsSubmitting(false);
  };

  /* ── MODAL CLOSE ── */
  const closeModal = () => {
    setModalVisible(false);
    setShowEmailVerifyHint(false);
    setTimeout(() => setModalActive(false), 300);
  };

  const goToGuestHome = () => {
    navigate(getHomePathForRole("guest"));
  };

  /* ── EYE ICON SVG ── */
  const EyeOpen = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );

  const EyeClosed = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );

  /* ── FIELD ERROR HELPER ── */
  const FieldError = ({ id }) =>
    errors[id] ? (
      <span className={`${styles.fieldErr} ${styles.fieldErrVisible}`}>
        {errors[id]}
      </span>
    ) : (
      <span className={styles.fieldErr} />
    );

  return (
    <div className={`${styles.signupPage} abela-auth-page-shell`}>
      <MarketingNavbar />

{/* BACKGROUND */}
      <div className={styles.bgImage} />
      <div className={styles.bgOverlay} />

      {/* SUCCESS MODAL */}
      <div
        className={`${styles.modalOverlay} ${modalActive ? styles.modalOverlayActive : ""}`}
        onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
      >
        <div className={`${styles.modalCard} ${modalVisible ? styles.modalCardVisible : ""}`}>
          <div className={styles.modalIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
              fill="none" stroke="#b89635" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 className={styles.modalTitle}>You&apos;re signed in!</h2>
          <p className={styles.modalMessage}>
            Welcome to <strong>Abela Suites</strong>.<br />
            Your account is saved and you&apos;re logged in.<br />
            {showEmailVerifyHint ? (
              <>
                Check your email for a verification link. If you did not receive it, you can resend from account
                settings while signed in.
                <br />
              </>
            ) : null}
            Continue to your guest home to start booking.
          </p>
          <button type="button" className={styles.modalBtn} onClick={goToGuestHome}>
            Continue to home
          </button>
        </div>
      </div>

      {/* SIGN UP CARD */}
      <main className="main-content">
        <div className={styles.signupCard}>

          {/* Card Logo */}
          <div className={styles.cardLogo}>
            <img src="/public/Abela-removebg-preview.png" alt="Abela Suites Logo" className={styles.cardLogoImg} />
            <div className={styles.cardDivider} />
          </div>

          {/* Form */}
          <form className={styles.signupForm} onSubmit={handleSubmit} noValidate>

            {/* FULL NAME FIELDS */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="firstName">First Name</label>
                <input
                  type="text"
                  id="firstName"
                  placeholder="First name"
                  autoComplete="off"
                  value={fields.firstName}
                  onChange={handleChange}
                  className={errors.firstName ? styles.inputError : ""}
                />
                <FieldError id="firstName" />
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="lastName">Last Name</label>
                <input
                  type="text"
                  id="lastName"
                  placeholder="Last name"
                  autoComplete="off"
                  value={fields.lastName}
                  onChange={handleChange}
                  className={errors.lastName ? styles.inputError : ""}
                />
                <FieldError id="lastName" />
              </div>
            </div>

            {/* EMAIL */}
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter your email"
                autoComplete="email"
                inputMode="email"
                value={fields.email}
                onChange={handleChange}
                className={errors.email ? styles.inputError : ""}
              />
              <FieldError id="email" />
            </div>

            {/* PHONE */}
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <input
                type="text"
                id="phone"
                placeholder="e.g. +63 912 345 6789"
                autoComplete="off"
                value={fields.phone}
                onChange={handleChange}
                className={errors.phone ? styles.inputError : ""}
              />
              <FieldError id="phone" />
            </div>

            {/* PASSWORD */}
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  placeholder="Create a password"
                  value={fields.password}
                  onChange={handleChange}
                  className={errors.password ? styles.inputError : ""}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
              <FieldError id="password" />
              {showStrength && (
                <>
                  <div className={styles.strengthBarWrap}>
                    <div
                      className={styles.strengthBar}
                      style={{ width: strength.pct, backgroundColor: strength.color }}
                    />
                  </div>
                  <span
                    className={styles.strengthLabel}
                    style={{ color: strength.color }}
                  >
                    {strength.text}
                  </span>
                </>
              )}
            </div>

            {/* CONFIRM PASSWORD */}
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className={styles.passwordWrapper}>
                <input
                  type={showConfirm ? "text" : "password"}
                  id="confirmPassword"
                  placeholder="Repeat your password"
                  value={fields.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? styles.inputError : ""}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowConfirm((v) => !v)}
                >
                  {showConfirm ? <EyeClosed /> : <EyeOpen />}
                </button>
              </div>
              <FieldError id="confirmPassword" />
            </div>

            {/* BANNER */}
            <p className={`${styles.errorMessage} ${banner ? styles.errorMessageVisible : ""}`}>
              {banner}
            </p>

            <p className={styles.signupHint}>
              One account per email on this hotel site. If you already signed up once, use{" "}
              <Link to="/login">Log In</Link> instead of signing up again. To test with Gmail, you can use an alias
              such as <span className={styles.signupHintMono}>yourname+abela2@gmail.com</span> — that counts as a
              different address.
            </p>

            {/* TERMS */}
            <div className={styles.termsRow}>
              <label className={styles.termsLabel}>
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={fields.agreeTerms}
                  onChange={handleChange}
                />
                I agree to the{" "}
                <a href="#" className={styles.termsLink}>Terms &amp; Conditions</a>
                {" "}and{" "}
                <a href="#" className={styles.termsLink}>Privacy Policy</a>
              </label>
              <FieldError id="agreeTerms" />
            </div>

            {/* SUBMIT */}
            <button type="submit" className={styles.btnPrimary} disabled={isSubmitting}>
              {isSubmitting ? "Creating account…" : "Create Account"}
            </button>

            <p className={styles.loginText}>
              Already have an account? <Link to="/login">Log In</Link>
            </p>

          </form>
        </div>
      </main>
    </div>
  );
}