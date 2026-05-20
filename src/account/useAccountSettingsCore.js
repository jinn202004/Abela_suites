import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getStoredGuestTopbarProfile, patchMyPassword, patchMyProfile } from "../api/authApi";
import { uploadProfilePhotoDirectBackend } from "../api/imageUploadApi";
import { handleImageFileInputChange } from "../utils/s3ImageUpload";
import {
  dispatchGuestProfileUpdated,
  fetchCurrentUserMeBackend,
  fetchGuestMeBackend,
  patchGuestMeBackend,
} from "../api/guestApi";
import { TOPBAR } from "../topbar/roleTopbarData";

/** @typedef {'guest'|'admin'|'frontdesk'|'cashier'|'housekeeping'} AccountSettingsVariant */

function trimStr(s) {
  return String(s ?? "").trim();
}

/** Split a placeholder full name into first / last (initial staff defaults). */
function splitPlaceholderFullName(full) {
  const s = trimStr(full);
  if (!s) return { firstName: "", lastName: "" };
  const i = s.indexOf(" ");
  if (i === -1) return { firstName: s, lastName: "" };
  return { firstName: s.slice(0, i), lastName: s.slice(i + 1).trim() };
}

function initialGuestDisplay() {
  return {
    displayName: getStoredGuestTopbarProfile().name,
    email: getStoredGuestTopbarProfile().email,
    phone: getStoredGuestTopbarProfile().contact === "—" ? "" : getStoredGuestTopbarProfile().contact,
    address: "Zone 1, Balingasag, Misamis Oriental",
  };
}

function initialStaffDisplay(variant) {
  const ph = (emailFallback, contactRaw, nameStr) => {
    const { firstName, lastName } = splitPlaceholderFullName(nameStr);
    const phone = contactRaw === "—" ? "" : trimStr(contactRaw);
    return { firstName, lastName, email: trimStr(emailFallback), phone };
  };
  switch (variant) {
    case "admin":
      return ph("faye@gmail.com", "09556678908", "Joanah Cultura");
    case "frontdesk":
      return ph(TOPBAR.frontdesk.profile.email, TOPBAR.frontdesk.profile.contact, TOPBAR.frontdesk.profile.name);
    case "cashier":
      return ph(TOPBAR.cashier.profile.email, TOPBAR.cashier.profile.contact, TOPBAR.cashier.profile.name);
    case "housekeeping":
      return ph(TOPBAR.housekeeping.profile.email, TOPBAR.housekeeping.profile.contact, TOPBAR.housekeeping.profile.name);
    default:
      return { firstName: "", lastName: "", email: "", phone: "" };
  }
}

/** Map GET /api/users/me user to staff settings form (matches User schema fields exposed by API). */
function userToStaffInfoForm(user) {
  return {
    firstName: trimStr(user?.firstName),
    lastName: trimStr(user?.lastName),
    email: trimStr(user?.email),
    phone: trimStr(user?.phone),
  };
}

function buildGuestPatch(infoForm, baselineInfo, avatarSrc, baselineAvatar) {
  const patch = {};
  if (trimStr(infoForm.displayName) !== trimStr(baselineInfo.displayName)) patch.displayName = trimStr(infoForm.displayName);
  const em = trimStr(infoForm.email).toLowerCase();
  const bem = trimStr(baselineInfo.email).toLowerCase();
  if (em !== bem) patch.email = em;
  if (trimStr(infoForm.phone) !== trimStr(baselineInfo.phone)) patch.phone = trimStr(infoForm.phone);
  if (trimStr(infoForm.address) !== trimStr(baselineInfo.address)) patch.address = trimStr(infoForm.address);
  const av = avatarSrc || "";
  const bav = baselineAvatar || "";
  if (av !== bav) patch.profilePhotoData = av;
  return patch;
}

function buildStaffPatch(infoForm, baselineInfo) {
  const patch = {};
  if (trimStr(infoForm.firstName) !== trimStr(baselineInfo.firstName)) patch.firstName = trimStr(infoForm.firstName);
  if (trimStr(infoForm.lastName) !== trimStr(baselineInfo.lastName)) patch.lastName = trimStr(infoForm.lastName);
  const em = trimStr(infoForm.email).toLowerCase();
  const bem = trimStr(baselineInfo.email).toLowerCase();
  if (em !== bem) patch.email = em;
  if (trimStr(infoForm.phone) !== trimStr(baselineInfo.phone)) patch.phone = trimStr(infoForm.phone);
  return patch;
}

function validateGuestPatch(patch) {
  const errs = {};
  if (Object.prototype.hasOwnProperty.call(patch, "displayName")) {
    if (!trimStr(patch.displayName)) errs.displayName = "Display name cannot be empty.";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "email")) {
    const e = trimStr(patch.email);
    if (!e) errs.email = "Email cannot be empty.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errs.email = "Enter a valid email address.";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "phone")) {
    const digits = String(patch.phone || "").replace(/\D/g, "");
    if (digits && !/^[0-9]{10,11}$/.test(digits)) errs.phone = "Must be 10–11 digits.";
  }
  return errs;
}

function validateStaffPatch(patch) {
  const errs = {};
  if (Object.prototype.hasOwnProperty.call(patch, "firstName")) {
    if (!trimStr(patch.firstName)) errs.firstName = "First name cannot be empty.";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "email")) {
    const e = trimStr(patch.email);
    if (!e) errs.email = "Email cannot be empty.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) errs.email = "Enter a valid email address.";
  }
  if (Object.prototype.hasOwnProperty.call(patch, "phone")) {
    const digits = String(patch.phone || "").replace(/\D/g, "");
    if (digits && !/^[0-9]{10,11}$/.test(digits)) errs.phone = "Must be 10–11 digits.";
  }
  return errs;
}

/**
 * Shared profile + password state for all account settings routes.
 * @param {AccountSettingsVariant} variant
 * @param {{ refreshTopbarProfile?: () => Promise<void> }} [opts]
 */
export function useAccountSettingsCore(variant, opts = {}) {
  const { refreshTopbarProfile } = opts;
  const location = useLocation();
  const navigate = useNavigate();

  const guestInit = initialGuestDisplay();
  const staffInit = initialStaffDisplay(variant);

  const emptyGuestForm = { displayName: "", email: "", phone: "", address: "" };
  const emptyStaffForm = { firstName: "", lastName: "", email: "", phone: "" };

  const [displayName, setDisplayName] = useState(guestInit.displayName);
  const [displayEmail, setDisplayEmail] = useState(guestInit.email);
  const [displayPhone, setDisplayPhone] = useState(guestInit.phone);
  const [displayAddress, setDisplayAddress] = useState(guestInit.address);
  const [displayStaffStatus, setDisplayStaffStatus] = useState("");

  const [activeTab, setActiveTab] = useState("info");
  const [infoForm, setInfoForm] = useState(() =>
    variant === "guest" ? { ...emptyGuestForm } : { ...staffInit },
  );
  const [baselineInfo, setBaselineInfo] = useState(() =>
    variant === "guest" ? { ...emptyGuestForm } : { ...staffInit },
  );
  const [infoErrors, setInfoErrors] = useState({});
  const [pwForm, setPwForm] = useState({ current: "", newPw: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState({});
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });
  const [strength, setStrength] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState({ visible: false, msg: "", isError: false });
  const avatarInputRef = useRef(null);
  const [avatarSrc, setAvatarSrc] = useState("");
  const [baselineAvatar, setBaselineAvatar] = useState("");

  const profileHeading =
    variant === "guest"
      ? trimStr(infoForm.displayName) || trimStr(displayName) || "—"
      : [infoForm.firstName, infoForm.lastName].filter(Boolean).join(" ").trim() || trimStr(infoForm.email) || "—";

  useEffect(() => {
    if (variant !== "guest") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchGuestMeBackend();
        const g = data?.guest;
        if (cancelled) return;
        if (!g) {
          const p = getStoredGuestTopbarProfile();
          setDisplayName(p.name);
          setDisplayEmail(p.email);
          setDisplayPhone(p.contact === "—" ? "" : p.contact);
          return;
        }
        const displayNameVal = String(g.displayName || g.name || "").trim();
        const email = String(g.email || "").trim();
        const phone = String(g.phone || g.contactNumber || "").trim();
        const address = String(g.address || "").trim();
        setDisplayName(displayNameVal);
        setDisplayEmail(email);
        setDisplayPhone(phone);
        setDisplayAddress(address);
        const photo = String(g.profilePhotoData || "").trim();
        if (photo && (/^data:image\//.test(photo) || /^https?:\/\//i.test(photo))) {
          setAvatarSrc(photo);
          setBaselineAvatar(photo);
        } else {
          setAvatarSrc("");
          setBaselineAvatar("");
        }
        const loaded = {
          displayName: displayNameVal,
          email: email || "",
          phone: phone || "",
          address: address || "",
        };
        setInfoForm(loaded);
        setBaselineInfo(loaded);
      } catch {
        if (!cancelled) {
          const p = getStoredGuestTopbarProfile();
          setDisplayName(p.name);
          setDisplayEmail(p.email);
          setDisplayPhone(p.contact === "—" ? "" : p.contact);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, location.pathname, location.key]);

  useEffect(() => {
    if (variant === "guest") return;
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchCurrentUserMeBackend();
        const u = data?.user;
        if (cancelled || !u) return;
        const form = userToStaffInfoForm(u);
        setInfoForm(form);
        setBaselineInfo(form);
        setDisplayName([form.firstName, form.lastName].filter(Boolean).join(" ").trim() || trimStr(u.name));
        setDisplayEmail(form.email);
        setDisplayPhone(form.phone);
        setDisplayStaffStatus(trimStr(u.staffStatus));
      } catch {
        /* keep placeholder from initialStaffDisplay */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, location.pathname, location.key]);

  const showToast = useCallback((msg, isError = false) => {
    setToast({ visible: true, msg, isError });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3500);
  }, []);

  const handleSaveInfo = useCallback(() => {
    const patch =
      variant === "guest"
        ? buildGuestPatch(infoForm, baselineInfo, avatarSrc, baselineAvatar)
        : buildStaffPatch(infoForm, baselineInfo);

    if (Object.keys(patch).length === 0) {
      showToast("No changes to save.", true);
      return;
    }

    const errs = variant === "guest" ? validateGuestPatch(patch) : validateStaffPatch(patch);
    setInfoErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast("Please fix the highlighted fields.", true);
      return;
    }
    setConfirmOpen(true);
  }, [variant, infoForm, baselineInfo, avatarSrc, baselineAvatar, showToast]);

  const doSaveInfo = useCallback(async () => {
    const patch =
      variant === "guest"
        ? buildGuestPatch(infoForm, baselineInfo, avatarSrc, baselineAvatar)
        : buildStaffPatch(infoForm, baselineInfo);

    if (Object.keys(patch).length === 0) {
      setConfirmOpen(false);
      return;
    }

    const errs = variant === "guest" ? validateGuestPatch(patch) : validateStaffPatch(patch);
    if (Object.keys(errs).length > 0) {
      setInfoErrors(errs);
      setConfirmOpen(false);
      showToast("Please fix the highlighted fields.", true);
      return;
    }

    if (variant === "guest") {
      try {
        const data = await patchGuestMeBackend(patch);
        const g = data?.guest;
        setConfirmOpen(false);
        if (g) {
          const loaded = {
            displayName: trimStr(g.displayName || g.name),
            email: trimStr(g.email),
            phone: trimStr(g.phone),
            address: trimStr(g.address),
          };
          setDisplayName(loaded.displayName);
          setDisplayEmail(loaded.email);
          setDisplayPhone(loaded.phone);
          setDisplayAddress(loaded.address);
          setInfoForm(loaded);
          setBaselineInfo(loaded);
          const photo = trimStr(g.profilePhotoData);
          if (photo && (/^data:image\//.test(photo) || /^https?:\/\//i.test(photo))) {
            setAvatarSrc(photo);
            setBaselineAvatar(photo);
          } else {
            setAvatarSrc("");
            setBaselineAvatar("");
          }
        }
        showToast("Information updated successfully!");
        void refreshTopbarProfile?.();
        dispatchGuestProfileUpdated();
      } catch (e) {
        setConfirmOpen(false);
        showToast(
          e?.message || "Could not save profile. Create a booking first if you have no guest profile.",
          true,
        );
      }
      return;
    }

    try {
      const data = await patchMyProfile(patch);
      setConfirmOpen(false);
      const u = data?.user;
      if (u) {
        const form = userToStaffInfoForm(u);
        setDisplayName([form.firstName, form.lastName].filter(Boolean).join(" ").trim() || trimStr(u.name));
        setDisplayEmail(form.email);
        setDisplayPhone(form.phone);
        setDisplayStaffStatus(trimStr(u.staffStatus));
        setInfoForm(form);
        setBaselineInfo(form);
      }
      showToast("Information updated successfully!");
      void refreshTopbarProfile?.();
    } catch (e) {
      setConfirmOpen(false);
      showToast(e?.message || "Could not save profile.", true);
    }
  }, [variant, infoForm, baselineInfo, avatarSrc, baselineAvatar, showToast, refreshTopbarProfile]);

  const handleAvatarChange = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (e.target) e.target.value = "";
      if (!file) return;
      await handleImageFileInputChange(file, {
        uploadFn: uploadProfilePhotoDirectBackend,
        setPreview: setAvatarSrc,
        setError: (msg) => showToast(msg || "Could not upload profile photo.", true),
      });
    },
    [showToast],
  );

  const handleSavePassword = useCallback(async () => {
    const errs = {};
    const { current, newPw, confirm } = pwForm;
    if (!current) errs.current = "Current password is required.";
    if (!newPw) errs.newPw = "New password is required.";
    else if (newPw.length < 8) errs.newPw = "Password must be at least 8 characters.";
    if (!confirm) errs.confirm = "Please confirm your new password.";
    else if (newPw && newPw !== confirm) errs.confirm = "Passwords do not match.";
    if (current && newPw && current === newPw) errs.newPw = "New password must differ from current password.";
    setPwErrors(errs);
    if (Object.keys(errs).length > 0) {
      showToast("Please fix the errors before saving.", true);
      return;
    }
    try {
      await patchMyPassword({ currentPassword: current, newPassword: newPw });
      setPwForm({ current: "", newPw: "", confirm: "" });
      setPwErrors({});
      setStrength(null);
      showToast("Password changed successfully!");
    } catch (e) {
      showToast(e?.message || "Could not change password.", true);
    }
  }, [pwForm, showToast]);

  const resetTabErrors = useCallback(() => {
    setInfoErrors({});
    setPwErrors({});
  }, []);

  return {
    variant,
    navigate,
    profileHeading,
    displayName,
    displayEmail,
    displayPhone,
    displayAddress,
    displayStaffStatus,
    avatarSrc,
    avatarInputRef,
    handleAvatarChange,
    activeTab,
    setActiveTab,
    infoForm,
    setInfoForm,
    infoErrors,
    setInfoErrors,
    pwForm,
    setPwForm,
    pwErrors,
    setPwErrors,
    showPw,
    setShowPw,
    strength,
    setStrength,
    confirmOpen,
    setConfirmOpen,
    toast,
    handleSaveInfo,
    doSaveInfo,
    handleSavePassword,
    showToast,
    resetTabErrors,
  };
}

export function passwordStrength(val) {
  if (!val) return null;
  let score = 0;
  if (val.length >= 8) score++;
  if (/[A-Z]/.test(val)) score++;
  if (/[0-9]/.test(val)) score++;
  if (/[^A-Za-z0-9]/.test(val)) score++;
  const map = [
    { w: "25%", c: "#e74c3c", t: "Weak" },
    { w: "50%", c: "#e67e22", t: "Fair" },
    { w: "75%", c: "#f1c40f", t: "Good" },
    { w: "100%", c: "#2ecc71", t: "Strong" },
  ];
  return map[score - 1] || map[0];
}
