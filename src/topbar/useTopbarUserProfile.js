import { useCallback, useEffect, useState } from "react";
import {
  AUTH_TOKEN_CHANGED_EVENT,
  getStoredAuthToken,
  readTopbarMeSnapshot,
} from "../api/authApi";
import { fetchCurrentUserMeBackend } from "../api/guestApi";
import { TOPBAR } from "./roleTopbarData";

function mergeSnapshot(defaults, snap) {
  if (!snap || typeof snap !== "object") return { ...defaults };
  return {
    ...defaults,
    name: snap.name != null && String(snap.name).trim() ? String(snap.name).trim() : defaults.name,
    email: snap.email != null && String(snap.email).trim() ? String(snap.email).trim() : defaults.email,
    contact:
      snap.phone != null && String(snap.phone).trim()
        ? String(snap.phone).trim()
        : defaults.contact,
    /**
     * Never take `snap.role` into the menu badge. Snapshot is last login’s user.role; it can stay
     * “admin” after switching to the front desk / cashier / HK shell in the same tab, which mislabels
     * the portal. The badge always reflects the shell (`TOPBAR[roleKey].profile.roleLabel`).
     */
    roleLabel: defaults.roleLabel,
  };
}

function mapUserToProfile(defaults, user) {
  if (!user || typeof user !== "object") return { ...defaults };
  const fn = String(user.firstName ?? "").trim();
  const ln = String(user.lastName ?? "").trim();
  const combined = [fn, ln].filter(Boolean).join(" ").trim();
  const email = String(user.email ?? "").trim();
  const name =
    combined ||
    String(user.name ?? "").trim() ||
    (email ? email.split("@")[0] : "") ||
    defaults.name;
  const phone = String(user.phone ?? user.contactNumber ?? "").trim();
  let avatarUrl = "";
  const rawPhoto = user.profilePhotoData ?? user.profilePhotoUrl ?? "";
  const s = String(rawPhoto).trim();
  if (s && (/^data:image\//.test(s) || /^https?:\/\//i.test(s))) {
    avatarUrl = s;
  }
  return {
    ...defaults,
    name,
    email: email || defaults.email,
    contact: phone || defaults.contact,
    roleLabel: defaults.roleLabel,
    avatarUrl,
  };
}

/**
 * Loads merge of TOPBAR defaults, session snapshot, and GET /api/users/me for the bell menu.
 * @param {keyof typeof TOPBAR} roleKey
 */
export function useTopbarUserProfile(roleKey) {
  const defaults = TOPBAR[roleKey]?.profile ?? TOPBAR.guest.profile;

  const [topbarProfile, setTopbarProfile] = useState(() =>
    mergeSnapshot(defaults, readTopbarMeSnapshot()),
  );

  const refreshTopbarProfile = useCallback(async () => {
    const base = TOPBAR[roleKey]?.profile ?? TOPBAR.guest.profile;
    const token = getStoredAuthToken();
    const snap = readTopbarMeSnapshot();
    if (!token) {
      setTopbarProfile(mergeSnapshot(base, snap));
      return;
    }
    try {
      const data = await fetchCurrentUserMeBackend();
      const user = data?.user;
      if (user) {
        setTopbarProfile(mapUserToProfile(mergeSnapshot(base, snap), user));
        return;
      }
    } catch {
      /* fall through */
    }
    setTopbarProfile(mergeSnapshot(base, snap));
  }, [roleKey]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshTopbarProfile();
    });
  }, [refreshTopbarProfile]);

  useEffect(() => {
    const onTok = () => void refreshTopbarProfile();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
  }, [refreshTopbarProfile]);

  return { topbarProfile, refreshTopbarProfile };
}
