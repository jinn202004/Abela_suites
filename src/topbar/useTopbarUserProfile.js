import { useCallback, useEffect, useState } from "react";
import {
  AUTH_TOKEN_CHANGED_EVENT,
  getStoredAuthToken,
  readTopbarMeSnapshot,
} from "../api/authApi";
import { fetchCurrentUserMeBackend, fetchGuestMeBackend, GUEST_PROFILE_UPDATED_EVENT } from "../api/guestApi";
import { TOPBAR } from "./roleTopbarData";

function photoToAvatarUrl(raw) {
  const s = String(raw ?? "").trim();
  if (s && (/^data:image\//.test(s) || /^https?:\/\//i.test(s))) return s;
  return "";
}

function mergeSnapshot(defaults, snap) {
  if (!snap || typeof snap !== "object") return { ...defaults };
  const snapAvatar = photoToAvatarUrl(snap.profilePhotoData);
  return {
    ...defaults,
    name: snap.name != null && String(snap.name).trim() ? String(snap.name).trim() : defaults.name,
    email: snap.email != null && String(snap.email).trim() ? String(snap.email).trim() : defaults.email,
    contact:
      snap.phone != null && String(snap.phone).trim()
        ? String(snap.phone).trim()
        : defaults.contact,
    avatarUrl: snapAvatar || defaults.avatarUrl || "",
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
  const avatarUrl = photoToAvatarUrl(user.profilePhotoData ?? user.profilePhotoUrl);
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
    let profile = mergeSnapshot(base, snap);
    try {
      const data = await fetchCurrentUserMeBackend();
      const user = data?.user;
      if (user) {
        profile = mapUserToProfile(mergeSnapshot(base, snap), user);
      }
    } catch {
      /* keep snapshot merge */
    }
    if (roleKey === "guest") {
      try {
        const guestData = await fetchGuestMeBackend();
        const g = guestData?.guest;
        const guestPhoto = photoToAvatarUrl(g?.profilePhotoData);
        if (guestPhoto) {
          profile = { ...profile, avatarUrl: guestPhoto };
        }
      } catch {
        /* guest profile optional */
      }
    }
    setTopbarProfile(profile);
  }, [roleKey]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshTopbarProfile();
    });
  }, [refreshTopbarProfile]);

  useEffect(() => {
    const onTok = () => void refreshTopbarProfile();
    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
    if (roleKey === "guest") {
      const onGuest = () => void refreshTopbarProfile();
      window.addEventListener(GUEST_PROFILE_UPDATED_EVENT, onGuest);
      return () => {
        window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
        window.removeEventListener(GUEST_PROFILE_UPDATED_EVENT, onGuest);
      };
    }
    return () => window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, onTok);
  }, [refreshTopbarProfile, roleKey]);

  return { topbarProfile, refreshTopbarProfile };
}
