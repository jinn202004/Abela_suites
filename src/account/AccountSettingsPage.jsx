import { useEffect, useRef, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { TOPBAR } from "../topbar/roleTopbarData";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import AdminSidebarNav from "../admin_1/AdminSidebarNav";
import AdminSidebarToggle from "../admin_1/AdminSidebarToggle";
import { useAdminShell } from "../admin_1/AdminShellContext";
import { useFrontdeskShell } from "../frontdesks/FrontdeskShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import FrontdeskSidebarToggle from "../frontdesks/FrontdeskSidebarToggle";
import FrontdeskSidebar from "../frontdesks/FrontdeskSidebar";
import {
  StaffNotificationDetailModal,
  useStaffNotificationDetail,
} from "../frontdesks/StaffNotificationDetailModal";
import { useFrontdeskPendingNotifications } from "../frontdesks/useFrontdeskPendingNotifications";
import { useCashierSidebarLayout } from "../cashier/useCashierSidebarLayout";
import { useCashierUnifiedBell } from "../cashier/useCashierUnifiedBell";
import CashierSidebarToggle from "../cashier/CashierSidebarToggle";
import HousekeepingSidebar from "../housekeeping/HousekeepingSidebar";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import { useHousekeepingCleaningNotifications } from "../housekeeping/useHousekeepingCleaningNotifications";
import { useHousekeepingSidebarLayout } from "../housekeeping/useHousekeepingSidebarLayout";
import { useGuestTopbarNotifications } from "../guests/useGuestTopbarNotifications";
import GuestSidebar from "../guests/GuestSidebar";
import { GuestArchiveIcon } from "../guests/guestArchiveIcon";
import { useGuestSidebarLayout } from "../guests/useGuestSidebarLayout";
import { passwordStrength, useAccountSettingsCore } from "./useAccountSettingsCore";
import {
  cashierSettingsNavItems,
  frontdeskSettingsNavItems,
  housekeepingSettingsNavItems,
} from "./settingsShellNav";

import "../styles/settingsTheme.css";
import "../guests/myprofile.css";
import "../admin_1/personal-info.css";
import "../frontdesks/frontdesk-settings.css";
import "../cashier/cashier-settings.css";
import "../cashier/cashier-sidebar-shared.css";
import "../housekeeping/settings.css";

/** Guest profile form — aligns with Guest schema (displayName, email, phone, address). */
const GUEST_INFO_FIELDS = [
  { id: "displayName", label: "Display name", type: "text", placeholder: "Your name as shown to the hotel" },
  { id: "email", label: "Email", type: "email", placeholder: "Email address" },
  { id: "phone", label: "Phone", type: "text", placeholder: "e.g. 09XXXXXXXXX", maxLen: 11 },
  { id: "address", label: "Address", type: "text", placeholder: "Street, city, province" },
];

/** Staff user form — aligns with PATCH /api/users/me (firstName, lastName, email, phone). */
const STAFF_INFO_FIELDS = [
  { id: "firstName", label: "First name", type: "text", placeholder: "First name" },
  { id: "lastName", label: "Last name", type: "text", placeholder: "Last name" },
  { id: "email", label: "Email", type: "email", placeholder: "Email address" },
  { id: "phone", label: "Phone", type: "text", placeholder: "e.g. 09XXXXXXXXX", maxLen: 11 },
];

const EyeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="17" height="17">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EditPencilIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="12" height="12">
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </svg>
);

function SettingsPageBody({ core, backHref, showBackArrow, avatarSize = "52", avatarFill = "#9e7e2a" }) {
  const {
    variant,
    profileHeading,
    displayEmail,
    displayPhone,
    displayAddress,
    displayDepartment,
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
    resetTabErrors,
  } = core;

  const infoFields = variant === "guest" ? GUEST_INFO_FIELDS : STAFF_INFO_FIELDS;

  return (
    <>
      <main className="content">
        <div className="st-wrap">
          <div className="st-top-row">
            <div className="st-heading">
              {showBackArrow ? (
                <a href={backHref} className="back-arrow">
                  ‹
                </a>
              ) : null}
              <div>
                <h2 className="st-title">My Profile</h2>
                <p className="st-sub">Manage your profile</p>
              </div>
            </div>
            <div className="st-tab-row">
              <button
                type="button"
                className={`st-tab${activeTab === "info" ? " active" : ""}`}
                onClick={() => {
                  setActiveTab("info");
                  resetTabErrors();
                }}
              >
                Change Information
              </button>
              <button
                type="button"
                className={`st-tab${activeTab === "password" ? " active" : ""}`}
                onClick={() => {
                  setActiveTab("password");
                  resetTabErrors();
                }}
              >
                Change Password
              </button>
            </div>
          </div>

          <div className="st-layout">
            <div className="st-profile-card">
              <div className="st-avatar-wrap">
                <label htmlFor="acctAvatarInput" style={{ cursor: "pointer" }}>
                  <div className="st-avatar" style={{ position: "relative" }}>
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="Avatar"
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          borderRadius: "50%",
                        }}
                      />
                    ) : (
                      <svg viewBox="0 0 24 24" width={avatarSize} height={avatarSize} fill={avatarFill}>
                        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                      </svg>
                    )}
                  </div>
                </label>
                <input
                  ref={avatarInputRef}
                  type="file"
                  id="acctAvatarInput"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={handleAvatarChange}
                />
                <div className="st-avatar-edit" onClick={() => avatarInputRef.current?.click()} role="presentation">
                  <EditPencilIcon />
                </div>
              </div>
              <h3 className="st-profile-name">{profileHeading}</h3>
              <hr className="st-profile-divider" />
              <div className="st-profile-info">
                <p>
                  <span className="st-info-label">Email:</span> {displayEmail || "—"}
                </p>
                <p>
                  <span className="st-info-label">Phone:</span> {displayPhone || "—"}
                </p>
                {variant === "guest" ? (
                  <p>
                    <span className="st-info-label">Address:</span> {displayAddress || "—"}
                  </p>
                ) : (
                  <>
                    <p>
                      <span className="st-info-label">Department:</span> {displayDepartment || "—"}
                    </p>
                    <p>
                      <span className="st-info-label">Staff status:</span> {displayStaffStatus || "—"}
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="st-form-card">
              {activeTab === "info" && (
                <div className="st-panel">
                  <h3 className="st-panel-title">Change Information</h3>
                  <hr className="st-panel-divider" />
                  {infoFields.map(({ id, label, type, placeholder, maxLen }) => (
                    <div className="st-form-group" key={id}>
                      <label className="st-label">{label}</label>
                      <input
                        type={type}
                        className={`st-input${infoErrors[id] ? " input-error" : ""}`}
                        placeholder={placeholder}
                        maxLength={maxLen}
                        value={infoForm[id] ?? ""}
                        onChange={(e) => {
                          let val = e.target.value;
                          if (id === "phone") val = val.replace(/\D/g, "");
                          setInfoForm((f) => ({ ...f, [id]: val }));
                          setInfoErrors((err) => ({ ...err, [id]: "" }));
                        }}
                      />
                      {infoErrors[id] && <span className="st-field-err">{infoErrors[id]}</span>}
                    </div>
                  ))}
                  <div className="st-form-actions">
                    <button type="button" className="st-save-btn" onClick={handleSaveInfo}>
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {activeTab === "password" && (
                <div className="st-panel">
                  <h3 className="st-panel-title">Change Password</h3>
                  <hr className="st-panel-divider" />
                  {[
                    { id: "current", label: "Current Password", placeholder: "Enter your current password" },
                    { id: "newPw", label: "New Password", placeholder: "Minimum 8 characters" },
                    { id: "confirm", label: "Confirm Password", placeholder: "Re-enter new password" },
                  ].map(({ id, label, placeholder }) => (
                    <div className="st-form-group" key={id}>
                      <label className="st-label">{label}</label>
                      <div className="st-pw-wrap">
                        <input
                          type={showPw[id] ? "text" : "password"}
                          className={`st-input${pwErrors[id] ? " input-error" : ""}`}
                          placeholder={placeholder}
                          value={pwForm[id]}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPwForm((f) => ({ ...f, [id]: val }));
                            setPwErrors((err) => ({ ...err, [id]: "" }));
                            if (id === "newPw") setStrength(passwordStrength(val));
                            if (id === "confirm" && pwForm.newPw && val && pwForm.newPw !== val) {
                              setPwErrors((err) => ({ ...err, confirm: "Passwords do not match." }));
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={`st-pw-eye${showPw[id] ? " eye-active" : ""}`}
                          tabIndex={-1}
                          onClick={() => setShowPw((s) => ({ ...s, [id]: !s[id] }))}
                        >
                          <EyeIcon />
                        </button>
                      </div>
                      {id === "newPw" && strength && (
                        <>
                          <div className="st-strength-bar">
                            <div className="st-strength-fill" style={{ width: strength.w, background: strength.c }} />
                          </div>
                          <span className="st-strength-label" style={{ color: strength.c }}>
                            {strength.t}
                          </span>
                        </>
                      )}
                      {pwErrors[id] && <span className="st-field-err">{pwErrors[id]}</span>}
                    </div>
                  ))}
                  <div className="st-form-actions">
                    <button type="button" className="st-save-btn" onClick={handleSavePassword}>
                      Save Password
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {confirmOpen && (
        <div className="st-confirm-backdrop active">
          <div className="st-confirm-dialog">
            <div className="st-confirm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="#e74c3c" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10" />
              </svg>
              <span className="st-confirm-exclaim">!</span>
            </div>
            <p className="st-confirm-msg">
              Are you sure you want
              <br />
              to save these changes?
            </p>
            <div className="st-confirm-btns">
              <button type="button" className="st-btn-no" onClick={() => setConfirmOpen(false)}>
                No
              </button>
              <button type="button" className="st-btn-yes" onClick={() => void doSaveInfo()}>
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.visible && (
        <div className="st-toast active" style={{ borderColor: toast.isError ? "#e74c3c" : "#2ecc71" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke={toast.isError ? "#e74c3c" : "#2ecc71"} strokeWidth="2.2" width="22" height="22">
            {toast.isError ? (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <polyline points="9 12 11 14 15 10" />
              </>
            )}
          </svg>
          <span>{toast.msg}</span>
        </div>
      )}
    </>
  );
}

/* ─── Guest ─── */
const GuestHomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="30" height="30">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const GuestRoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="30" height="30">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
  </svg>
);
const GuestEventIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="30" height="30">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const GuestSettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="30" height="30">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const guestNavItems = [
  { label: "Homepage", icon: <GuestHomeIcon />, href: "/home" },
  { label: "Rooms", icon: <GuestRoomIcon />, href: "/rooms" },
  { label: "Event Venues", icon: <GuestEventIcon />, href: "/event-venues" },
  { label: "Archive", icon: <GuestArchiveIcon size={30} />, href: "/booking-history" },
  { label: "Settings", icon: <GuestSettingsIcon />, href: "/settings", active: true },
];

function GuestAccountSettings() {
  const { topbarProfile, refreshTopbarProfile } = useTopbarUserProfile("guest");
  const core = useAccountSettingsCore("guest", { refreshTopbarProfile });
  const {
    notifRef,
    notifOpen,
    setNotifOpen,
    bellUnreadCount,
    displayNotifications,
  } = useGuestTopbarNotifications();
  const {
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useGuestSidebarLayout();
  const [userOpen, setUserOpen] = useState(false);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const toggleNotif = (e) => {
    e.stopPropagation();
    setNotifOpen((o) => !o);
    setUserOpen(false);
  };
  const toggleUser = (e) => {
    e.stopPropagation();
    setUserOpen((o) => !o);
    setNotifOpen(false);
  };

  return (
    <>
      <RailPortalShell
        rootClassName="myprofile-page-root guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
        mainStyle={mainStyle}
        rootProps={{
          onClick: () => {
            setNotifOpen(false);
            setUserOpen(false);
          },
        }}
        sidebar={
          <GuestSidebar
            navItems={guestNavItems}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            mobileSidebarOpen={mobileSidebarOpen}
            closeMobileSidebar={closeMobileSidebar}
            shellClassName={shellClassName}
            asideStyle={asideStyle}
            logoWrapStyle={logoWrapStyle}
            logoImgStyle={logoImgStyle}
          />
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <HousekeepingSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={toggleNotif}
              notifications={displayNotifications}
              bellIconClassName="topbar-icon"
              dot={bellUnreadCount > 0 ? "active" : null}
              onItemClick={(n) => {
                const bookingId = String(n?.bookingId || "").trim();
                setNotifOpen(false);
                setUserOpen(false);
                if (bookingId) core.navigate(`/my-bookings/${bookingId}`);
              }}
            />
            <div className="icon-btn" onClick={toggleUser} title="Account" style={{ position: "relative" }}>
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={{
                  ...TOPBAR.guest.profile,
                  ...topbarProfile,
                  name: core.profileHeading,
                  email: core.displayEmail,
                  contact: core.displayPhone,
                  avatarUrl: core.avatarSrc || topbarProfile.avatarUrl,
                }}
                profilePath={TOPBAR.guest.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
        </header>
        <SettingsPageBody core={core} backHref="/settings" showBackArrow />
      </RailPortalShell>
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

function AdminAccountSettings() {
  const { mainStyle } = useAdminShell();
  const { refreshTopbarProfile } = useTopbarUserProfile("admin");
  const core = useAccountSettingsCore("admin", { refreshTopbarProfile });
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setNotifOpen(false);
      setUserOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const mergedProfile = {
    ...TOPBAR.admin.profile,
    name: core.profileHeading,
    email: core.displayEmail,
    contact: core.displayPhone,
  };

  return (
    <>
      <RailPortalShell
        rootClassName="settings-page"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav logoSrc="/images/logo.png" />}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
                setUserOpen(false);
              }}
              notifications={TOPBAR.admin.notifications}
              bellIconClassName="topbar-icon"
              dot="muted"
            />
            <div
              className="icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                setUserOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={mergedProfile}
                profilePath={TOPBAR.admin.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
        </header>
        <SettingsPageBody core={core} backHref="/admin-settings" showBackArrow />
      </RailPortalShell>
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

function FrontdeskAccountSettings() {
  const { topbarProfile, refreshTopbarProfile } = useTopbarUserProfile("frontdesk");
  const core = useAccountSettingsCore("frontdesk", { refreshTopbarProfile });
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const { pendingCount, displayNotifications, markStaffNotificationsSeen } = useFrontdeskPendingNotifications({
    bookingType: "all",
  });
  const { staffNotification, openStaffNotification, closeStaffNotification } = useStaffNotificationDetail();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { mainStyle } = useFrontdeskShell();

  useEffect(() => {
    function onDoc(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggleNotif = (e) => {
    e.stopPropagation();
    setUserOpen(false);
    setNotifOpen((o) => {
      if (!o) void markStaffNotificationsSeen();
      return !o;
    });
  };
  const toggleUser = (e) => {
    e.stopPropagation();
    setUserOpen((o) => !o);
    setNotifOpen(false);
  };

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout frontdesk-settings-page frontdesk-app"
        mainStyle={mainStyle}
        rootProps={{
          onClick: () => {
            setNotifOpen(false);
            setUserOpen(false);
          },
        }}
        sidebar={<FrontdeskSidebar navItems={frontdeskSettingsNavItems} logoSrc="/public/logo.png" />}
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <FrontdeskSidebarToggle />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={toggleNotif}
              notifications={displayNotifications}
              dot={pendingCount > 0 ? "active" : null}
              dotTitle="Pending or unread alerts"
              onItemClick={(n) => {
                setNotifOpen(false);
                setUserOpen(false);
                openStaffNotification(n);
              }}
            />
            <div className="icon-btn" ref={userRef} onClick={toggleUser} title="Account" style={{ position: "relative" }}>
              <TopbarUserIcon />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={{
                  ...TOPBAR.frontdesk.profile,
                  ...topbarProfile,
                  name: core.profileHeading,
                  email: core.displayEmail,
                  contact: core.displayPhone,
                }}
                profilePath={TOPBAR.frontdesk.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
        </header>
        <SettingsPageBody core={core} showBackArrow={false} avatarSize="96" avatarFill="#b8922a" />
      </RailPortalShell>
      <StaffNotificationDetailModal notification={staffNotification} onClose={closeStaffNotification} />
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

function CashierAccountSettings() {
  const navigate = useNavigate();
  const { topbarProfile, refreshTopbarProfile } = useTopbarUserProfile("cashier");
  const core = useAccountSettingsCore("cashier", { refreshTopbarProfile });
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
  const { bellNotifications, hasUnreadBell, handleNotifItemClick } = useCashierUnifiedBell({
    displayName: topbarProfile?.name || TOPBAR.cashier.profile.name,
    onOrderNotificationClick: (n) =>
      navigate("/order-history", { state: { focusOrderId: n.orderId, fromNotification: true } }),
    onMenuNotificationRead: (n) =>
      navigate("/cashier", { state: { focusMenuItemId: n.menuItemId, fromNotification: true } }),
  });
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const {
    collapsed: sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useCashierSidebarLayout();

  const toggleNotif = (e) => {
    e.stopPropagation();
    setNotifOpen((o) => !o);
    setUserOpen(false);
  };
  const toggleUser = (e) => {
    e.stopPropagation();
    setUserOpen((o) => !o);
    setNotifOpen(false);
  };

  return (
    <>
      {isMobile && mobileSidebarOpen && (
        <div className="cashier-mobile-backdrop" onClick={closeMobileSidebar} aria-hidden />
      )}
      <RailPortalShell
        rootClassName="cashier-settings-page-root"
        shellClassName={shellClassName}
        mainStyle={mainStyle}
        rootProps={{
          onClick: () => {
            setNotifOpen(false);
            setUserOpen(false);
          },
        }}
        sidebar={
          <aside className={`sidebar ${shellClassName}`} style={asideStyle}>
            {isMobile && (
              <button type="button" className="cashier-mobile-close-btn" onClick={closeMobileSidebar} aria-label="Close menu">
                ×
              </button>
            )}
            <div className="sidebar-logo" style={logoWrapStyle}>
              <img src="/logo.png" alt="Abela Suites Logo" className="sidebar-logo-img" style={logoImgStyle} />
            </div>
            <nav className="sidebar-nav">
              {cashierSettingsNavItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.href}
                  end={item.end}
                  onClick={() => {
                    if (isMobile) closeMobileSidebar();
                  }}
                  className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <CashierSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              isOpen={notifOpen}
              onBellClick={toggleNotif}
              onItemClick={handleNotifItemClick}
              notifications={bellNotifications}
              bellIconClassName="topbar-icon"
              dot={hasUnreadBell ? "active" : "muted"}
            />
            <div className="icon-btn" onClick={toggleUser} title="Account" style={{ position: "relative" }}>
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={{
                  ...topbarProfile,
                  name: core.profileHeading || topbarProfile.name,
                  email: core.displayEmail || topbarProfile.email,
                  contact: core.displayPhone || topbarProfile.contact,
                }}
                profilePath={TOPBAR.cashier.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
        </header>
        <SettingsPageBody core={core} showBackArrow={false} />
      </RailPortalShell>
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

function HousekeepingAccountSettings() {
  const { refreshTopbarProfile } = useTopbarUserProfile("housekeeping");
  const core = useAccountSettingsCore("housekeeping", { refreshTopbarProfile });
  const { needsCleaningCount, displayNotifications, markHousekeepingInboxSeen } =
    useHousekeepingCleaningNotifications();
  const {
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    closeMobileSidebar,
    toggleSidebar,
    shellClassName,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
  } = useHousekeepingSidebarLayout();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  const toggleNotif = (e) => {
    e.stopPropagation();
    setNotifOpen((o) => {
      if (!o) void markHousekeepingInboxSeen();
      return !o;
    });
    setUserOpen(false);
  };
  const toggleUser = (e) => {
    e.stopPropagation();
    setUserOpen((o) => !o);
    setNotifOpen(false);
  };

  return (
    <>
      <RailPortalShell
        rootClassName="hk-settings-page-root housekeeping-portal-layout"
        shellClassName={shellClassName}
        mainStyle={mainStyle}
        rootProps={{
          onClick: () => {
            setNotifOpen(false);
            setUserOpen(false);
          },
        }}
        sidebar={
          <HousekeepingSidebar
            navItems={housekeepingSettingsNavItems}
            sidebarCollapsed={sidebarCollapsed}
            isMobile={isMobile}
            mobileSidebarOpen={mobileSidebarOpen}
            closeMobileSidebar={closeMobileSidebar}
            shellClassName={shellClassName}
            asideStyle={asideStyle}
            logoWrapStyle={logoWrapStyle}
            logoImgStyle={logoImgStyle}
          />
        }
      >
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <HousekeepingSidebarToggle
              sidebarCollapsed={sidebarCollapsed}
              toggleSidebar={toggleSidebar}
              isMobile={isMobile}
              mobileSidebarOpen={mobileSidebarOpen}
            />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">
            <RoleTopbarBell
              isOpen={notifOpen}
              onBellClick={toggleNotif}
              notifications={displayNotifications}
              bellIconClassName="topbar-icon"
              title="Rooms & venues waiting to be cleaned"
              dot={needsCleaningCount > 0 ? "plain" : null}
            />
            <div className="icon-btn" onClick={toggleUser} title="Account" style={{ position: "relative" }}>
              <TopbarUserIcon className="topbar-icon" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
                ▾
              </span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={{
                  ...TOPBAR.housekeeping.profile,
                  name: core.profileHeading,
                  email: core.displayEmail,
                  contact: core.displayPhone,
                }}
                profilePath={TOPBAR.housekeeping.profilePath}
                onCloseMenus={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                }}
                onLogout={() => {
                  setNotifOpen(false);
                  setUserOpen(false);
                  requestLogout();
                }}
              />
            </div>
          </div>
        </header>
        <SettingsPageBody core={core} showBackArrow={false} />
      </RailPortalShell>
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}

const VARIANT_VIEW = {
  guest: GuestAccountSettings,
  admin: AdminAccountSettings,
  frontdesk: FrontdeskAccountSettings,
  cashier: CashierAccountSettings,
  housekeeping: HousekeepingAccountSettings,
};

/**
 * Single account settings UI for every role: shared forms + password flow; shell (sidebar/topbar) per variant.
 * @param {{ variant: keyof VARIANT_VIEW }} props
 */
export default function AccountSettingsPage({ variant }) {
  const Comp = VARIANT_VIEW[variant];
  if (!Comp) return null;
  return <Comp />;
}
