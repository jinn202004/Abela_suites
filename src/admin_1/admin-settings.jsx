import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarAvatar from "../topbar/TopbarAvatar";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import AdminSidebarNav from "./AdminSidebarNav";
import AdminSidebarToggle from "./AdminSidebarToggle";
import { useAdminShell } from "./AdminShellContext";
import RailPortalShell from "../layouts/RailPortalShell";
import "./admin-settings.css";
/* ─── SVG Icons (settings inner menu + dropdown) ─── */
const IconSettingsGear = ({ stroke = "white" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);
const IconPersonalInfo = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconExport = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="22" height="22">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function AdminSettings() {
  const navigate = useNavigate();
  const { mainStyle } = useAdminShell();
  const { topbarProfile } = useTopbarUserProfile("admin");

  const [notifOpen,  setNotifOpen]  = useState(false);
  const [userOpen,   setUserOpen]   = useState(false);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();

  return (
    <>
      <RailPortalShell
        rootClassName="app-layout admin-app-layout admin-settings-page"
        mainStyle={mainStyle}
        sidebar={<AdminSidebarNav logoSrc="/public/logo.png" />}
      >
        {/* ── TOPBAR ── */}
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <AdminSidebarToggle />
            <span className="breadcrumb-title">Settings</span>
          </div>
          <div className="topbar-actions">

            {/* Notification Bell */}
            <RoleTopbarBell
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((o) => !o);
                setUserOpen(false);
              }}
              notifications={TOPBAR.admin.notifications}
              bellIconClassName="topbar-icon"
              dot="muted"
            />

            {/* User Dropdown */}
            <div className="icon-btn" onClick={e => { e.stopPropagation(); setUserOpen(o => !o); setNotifOpen(false); }}>
              <TopbarAvatar src={topbarProfile.avatarUrl} className="topbar-nav-avatar" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>&#9662;</span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={{ ...TOPBAR.admin.profile, ...topbarProfile }}
                onCloseMenus={() => { setNotifOpen(false); setUserOpen(false); }}
                onLogout={() => { setNotifOpen(false); setUserOpen(false); requestLogout(); }}
              />
            </div>
          </div>
        </header>

        {/* ── CONTENT ── */}
        <main className="content" onClick={() => { setNotifOpen(false); setUserOpen(false); }}>

          <section
            className="settings-heading"
            aria-labelledby="settings-page-title"
            aria-describedby="settings-page-subtitle"
          >
            <h1 id="settings-page-title" className="settings-title">
              Manage Settings
            </h1>
            <p id="settings-page-subtitle" className="settings-sub">
              Manage your settings
            </p>
          </section>

          <div className="settings-card">
            {[
              { label: "Personal Information", icon: <IconPersonalInfo />, href: "/admin-personal-info" },
              { label: "General", icon: <IconSettingsGear stroke="currentColor" />, href: "/admin-general" },
              { label: "Export", icon: <IconExport />, href: "/admin-export" },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="settings-menu-item"
                onClick={(e) => { e.preventDefault(); navigate(item.href); }}
              >
                <span className="settings-menu-icon">{item.icon}</span>
                <span className="settings-menu-label">{item.label}</span>
              </a>
            ))}
          </div>
        </main>
      </RailPortalShell>

      <LogoutConfirmModal
        open={logoutModalOpen}
        onClose={closeLogoutModal}
        onConfirm={confirmLogout}
      />

    </>
  );
}