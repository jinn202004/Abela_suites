import { backendUrl } from './config'

/** sessionStorage key for JWT from `POST /api/auth/login` */
export const AUTH_TOKEN_KEY = "abela_auth_token";

/** Fired on same-tab login/logout when the stored JWT changes (see `storeToken` / `clearStoredAuthToken`). */
export const AUTH_TOKEN_CHANGED_EVENT = "abela-auth-token-changed";

function notifyAuthTokenChanged() {
  try {
    window.dispatchEvent(new Event(AUTH_TOKEN_CHANGED_EVENT));
  } catch {
    /* ignore */
  }
}

export const GUEST_EMAIL_KEY = "abela_guest_email";
export const GUEST_DISPLAY_NAME_KEY = "abela_guest_display_name";

/** Last logged-in user fields for topbar when GET /api/users/me is slow or unavailable. */
export const TOPBAR_ME_SNAPSHOT_KEY = "abela_topbar_me_snapshot";

export function writeTopbarMeSnapshot(user) {
  if (!user || typeof user !== "object") return;
  try {
    const fn = String(user.firstName ?? "").trim();
    const ln = String(user.lastName ?? "").trim();
    const combined = [fn, ln].filter(Boolean).join(" ").trim();
    const name = String(user.name ?? "").trim() || combined;
    sessionStorage.setItem(
      TOPBAR_ME_SNAPSHOT_KEY,
      JSON.stringify({
        email: String(user.email ?? "")
          .trim()
          .toLowerCase(),
        name,
        firstName: fn,
        lastName: ln,
        phone: String(user.phone ?? "").trim(),
        role: String(user.role ?? "guest").trim(),
      }),
    );
  } catch {
    /* ignore */
  }
}

export function readTopbarMeSnapshot() {
  try {
    const raw = sessionStorage.getItem(TOPBAR_ME_SNAPSHOT_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o && typeof o === "object" ? o : null;
  } catch {
    return null;
  }
}

function displayNameFromUser(user) {
  if (!user) return "";
  const fn = String(user.firstName ?? "").trim();
  const ln = String(user.lastName ?? "").trim();
  const both = [fn, ln].filter(Boolean).join(" ");
  if (both) return both;
  const em = String(user.email ?? "").trim();
  if (em) return em.split("@")[0] || em;
  return "Guest";
}

/** Call after successful API login when `user.role === "guest"` (topbar + bookings filter). */
export function persistGuestProfile(user) {
  if (!user || String(user.role) !== "guest") return;
  try {
    const email = String(user.email ?? "")
      .trim()
      .toLowerCase();
    if (email) sessionStorage.setItem(GUEST_EMAIL_KEY, email);
    sessionStorage.setItem(GUEST_DISPLAY_NAME_KEY, displayNameFromUser(user));
  } catch {
    /* ignore */
  }
}

/** Call after any successful login so staff/guest topbars can show real name, email, phone. */
export function persistSessionAfterLogin(user) {
  writeTopbarMeSnapshot(user);
  persistGuestProfile(user);
}

const GUEST_PROFILE_DEFAULT = {
  name: "Guest",
  email: "guest@abela.local",
  contact: "—",
  roleLabel: "Guest",
};

/** Topbar user menu: uses API-backed name/email when present (see `persistGuestProfile`). */
export function getStoredGuestTopbarProfile() {
  try {
    const email = sessionStorage.getItem(GUEST_EMAIL_KEY);
    const name = sessionStorage.getItem(GUEST_DISPLAY_NAME_KEY);
    const derivedName =
      name || (email ? String(email).split("@")[0] : "") || GUEST_PROFILE_DEFAULT.name;
    return {
      ...GUEST_PROFILE_DEFAULT,
      ...(email ? { email } : {}),
      name: derivedName,
    };
  } catch {
    return { ...GUEST_PROFILE_DEFAULT };
  }
}

export function clearStoredAuthToken() {
  try {
    sessionStorage.removeItem(AUTH_TOKEN_KEY);
    sessionStorage.removeItem(TOPBAR_ME_SNAPSHOT_KEY);
    sessionStorage.removeItem(GUEST_EMAIL_KEY);
    sessionStorage.removeItem(GUEST_DISPLAY_NAME_KEY);
    notifyAuthTokenChanged();
  } catch {
    /* ignore */
  }
}

/** Current JWT for `Authorization: Bearer`, if any. */
export function getStoredAuthToken() {
  try {
    const t = sessionStorage.getItem(AUTH_TOKEN_KEY);
    return t && String(t).trim() ? String(t).trim() : "";
  } catch {
    return "";
  }
}

/**
 * Role from login snapshot or JWT payload (`role` claim).
 * @returns {string | null}
 */
export function getSessionRole() {
  const snap = readTopbarMeSnapshot();
  if (snap?.role) return String(snap.role).trim().toLowerCase();
  const t = getStoredAuthToken();
  if (!t) return null;
  try {
    const parts = t.split(".");
    const payload = parts[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(b64));
    const r = json && json.role != null ? String(json.role).trim().toLowerCase() : "";
    return r || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/auth/logout — revokes the access token on the server (see backend auth controller).
 * Safe to call without a token (client-only logout). Does not throw on network/API errors.
 */
export async function logoutUser() {
  const token = getStoredAuthToken();
  if (!token) return { ok: true, revoked: false };

  try {
    const res = await fetch(backendUrl("/api/auth/logout"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return { ok: true, revoked: !!data.revoked };
    }
    return { ok: false, status: res.status, error: data.error };
  } catch {
    return { ok: false, network: true };
  }
}

function storeToken(token) {
  try {
    sessionStorage.setItem(AUTH_TOKEN_KEY, token);
    notifyAuthTokenChanged();
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ email: string, password: string, firstName: string, lastName: string, phone?: string }} body
 */
export async function registerUser(body) {
  const res = await fetch(backendUrl("/api/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: String(body.email || "").trim().toLowerCase(),
      password: body.password,
      firstName: body.firstName.trim(),
      lastName: body.lastName.trim(),
      phone: (body.phone || "").trim(),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Registration failed");
    err.status = res.status;
    throw err;
  }
  return data.user;
}

/**
 * @returns {Promise<{ token: string, user: object }>}
 */
export async function loginUser(email, password) {
  const pwd = typeof password === "string" ? password.trim() : password;
  const res = await fetch(backendUrl("/api/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password: pwd,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || "Login failed");
    err.status = res.status;
    throw err;
  }
  if (data.token) storeToken(data.token);
  if (data.user) persistSessionAfterLogin(data.user);
  return data;
}

/**
 * PATCH /api/users/me — partial profile update (Bearer JWT).
 * Only include fields you want to change: name, email, phone, firstName, lastName, …
 * @param {Record<string, unknown>} body
 * @returns {Promise<object>} Parsed JSON (typically `{ user }`).
 */
export async function patchMyProfile(body) {
  const token = getStoredAuthToken();
  if (!token) {
    const err = new Error("You are not signed in. Log in again to update your profile.");
    err.status = 401;
    throw err;
  }
  const payload = body && typeof body === "object" ? body : {};
  const res = await fetch(backendUrl("/api/users/me"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  let data = {};
  try {
    const text = await res.text();
    if (text) data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : res.status === 401
          ? "Session expired or invalid. Sign in again."
          : `Could not update profile (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (data.user) persistSessionAfterLogin(data.user);
  return data;
}

/**
 * Used by `tryCredentials` for real accounts (email + password).
 * @returns {Promise<{ ok: true, role: string } | { ok: false, reason?: 'auth' | 'network' }>}
 */
export async function tryBackendLogin(emailTrimmedLower, password) {
  const pwd = typeof password === "string" ? password.trim() : password;
  try {
    const res = await fetch(backendUrl("/api/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: emailTrimmedLower,
        password: pwd,
      }),
    });

    let data = {};
    try {
      const text = await res.text();
      if (text) data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (!res.ok) {
      const msg = typeof data.error === "string" ? data.error.trim() : "";
      if (res.status >= 500) {
        return {
          ok: false,
          reason: "server",
          message: msg || `Server error (${res.status}). Check the backend terminal, MongoDB, and JWT_SECRET.`,
        };
      }
      if (res.status === 401) {
        return {
          ok: false,
          reason: "auth",
          message: msg || "Invalid email or password.",
        };
      }
      return {
        ok: false,
        reason: "auth",
        message: msg || `Login failed (${res.status}).`,
      };
    }

    if (!data.token || !data.user?.role) {
      return { ok: false, reason: "auth", message: "Invalid login response from server." };
    }
    storeToken(data.token);
    persistSessionAfterLogin(data.user);
    return { ok: true, role: data.user.role };
  } catch {
    return { ok: false, reason: "network" };
  }
}

/**
 * PATCH /api/users/me — change password (Bearer JWT).
 * @param {{ currentPassword: string, newPassword: string }} body
 * @returns {Promise<object>} Parsed JSON (typically `{ user }`).
 */
export async function patchMyPassword({ currentPassword, newPassword }) {
  const token = getStoredAuthToken();
  if (!token) {
    const err = new Error("You are not signed in. Log in again to change your password.");
    err.status = 401;
    throw err;
  }
  const res = await fetch(backendUrl("/api/users/me"), {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      currentPassword: String(currentPassword ?? ""),
      newPassword: String(newPassword ?? ""),
    }),
  });
  let data = {};
  try {
    const text = await res.text();
    if (text) data = JSON.parse(text);
  } catch {
    data = {};
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : res.status === 401
          ? "Session expired or invalid. Sign in again."
          : `Could not update password (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  if (data.user) persistSessionAfterLogin(data.user);
  return data;
}

/* ── Password reset (email OTP + short-lived JWT) ── */

const PASSWORD_RESET_EMAIL_KEY = "abela_pw_reset_email";
const PASSWORD_RESET_TOKEN_KEY = "abela_pw_reset_token";

export function clearPasswordResetFlow() {
  try {
    sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY);
    sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function getPasswordResetEmail() {
  try {
    const v = sessionStorage.getItem(PASSWORD_RESET_EMAIL_KEY);
    return v && String(v).trim() ? String(v).trim().toLowerCase() : "";
  } catch {
    return "";
  }
}

export function setPasswordResetEmail(email) {
  try {
    const e = String(email ?? "").trim().toLowerCase();
    if (e) sessionStorage.setItem(PASSWORD_RESET_EMAIL_KEY, e);
    else sessionStorage.removeItem(PASSWORD_RESET_EMAIL_KEY);
  } catch {
    /* ignore */
  }
}

export function getPasswordResetToken() {
  try {
    const v = sessionStorage.getItem(PASSWORD_RESET_TOKEN_KEY);
    return v && String(v).trim() ? String(v).trim() : "";
  } catch {
    return "";
  }
}

export function setPasswordResetToken(token) {
  try {
    const t = String(token ?? "").trim();
    if (t) sessionStorage.setItem(PASSWORD_RESET_TOKEN_KEY, t);
    else sessionStorage.removeItem(PASSWORD_RESET_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} email
 * @returns {Promise<{ message?: string, expiresInMinutes?: number }>}
 */
export async function requestPasswordReset(email) {
  const em = String(email ?? "").trim().toLowerCase();
  if (!em) {
    const err = new Error("Email is required.");
    err.status = 400;
    throw err;
  }
  const res = await fetch(backendUrl("/api/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: em }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : res.status === 404
          ? "No account found with this email address."
          : `Could not send verification code (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * @param {string} [email] — optional if already stored via `setPasswordResetEmail`
 * @param {string} otp
 * @returns {Promise<string>} `resetToken` (JWT)
 */
export async function verifyPasswordResetOtp(email, otp) {
  const em =
    String(email ?? "").trim().toLowerCase() || getPasswordResetEmail();
  const code = String(otp ?? "").replace(/\D/g, "");
  if (!em) {
    const err = new Error("Session expired. Start again from Forgot password.");
    err.status = 400;
    throw err;
  }
  if (code.length !== 6) {
    const err = new Error("Enter the 6-digit code.");
    err.status = 400;
    throw err;
  }
  const res = await fetch(backendUrl("/api/auth/verify-reset-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: em, otp: code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "Invalid or expired code.";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const token = data.resetToken;
  if (!token || typeof token !== "string") {
    throw new Error("Invalid response from server.");
  }
  setPasswordResetToken(token);
  return token;
}

/**
 * @param {{ resetToken?: string, password: string }} opts
 */
export async function resetPasswordWithToken(opts) {
  const password = typeof opts === "string" ? opts : String(opts?.password ?? "");
  const t =
    (typeof opts === "object" && opts?.resetToken != null
      ? String(opts.resetToken).trim()
      : "") || getPasswordResetToken();
  if (!t) {
    const err = new Error("Session expired. Start again from Forgot password.");
    err.status = 401;
    throw err;
  }
  const res = await fetch(backendUrl("/api/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ resetToken: t, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : `Could not reset password (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  clearPasswordResetFlow();
  return data;
}

/**
 * @param {{ email: string, token: string }} body
 */
export async function verifyEmailAccount({ email, token }) {
  const em = String(email ?? "").trim().toLowerCase();
  const t = String(token ?? "").trim();
  if (!em || !t) {
    const err = new Error("Invalid verification link.");
    err.status = 400;
    throw err;
  }
  const res = await fetch(backendUrl("/api/auth/verify-email"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email: em, token: t }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : "Could not verify email.";
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * Resend verification: signed-in user needs no body; otherwise pass `{ email }`.
 * @param {{ email?: string }} [opts]
 */
export async function sendVerificationEmail(opts = {}) {
  const token = getStoredAuthToken();
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const email = opts.email != null ? String(opts.email).trim().toLowerCase() : "";
  const res = await fetch(backendUrl("/api/auth/send-verification-email"), {
    method: "POST",
    headers,
    body: JSON.stringify(email ? { email } : {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof data.error === "string" && data.error.trim()
        ? data.error.trim()
        : `Could not send verification email (${res.status}).`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data;
}
