import { useRef } from "react";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import GuestTopbarActions from "./GuestTopbarActions";
import GuestSidebar from "./GuestSidebar";
import { buildGuestNavItems } from "./guestNavItems";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import "../styles/settingsTheme.css";
import "./guest-settings.css";

// --- Icons ---
const navItems = buildGuestNavItems("/settings");
const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

const settingsSections = [
  {
    label: "Account",
    items: [
      {
        href: "/myprofile",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        ),
        label: "My Profile",
        desc: "Edit your personal information",
      },
    ],
  },
  {
    label: "Legal & Policies",
    items: [
      {
        href: "/terms-condition",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        ),
        label: "Terms and Conditions",
        desc: "Read our general terms of service",
      },
      {
        href: "/terms-conditionstay",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
        ),
        label: "Terms and Conditions of Stay",
        desc: "Understand your rights during your stay",
      },
      {
        href: "/data-privacy",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        ),
        label: "Data Privacy and Policy",
        desc: "How we handle your personal data",
      },
    ],
  },
  {
    label: "About",
    items: [
      {
        href: "/about-us",
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ),
        label: "About Us",
        desc: "Learn more about Abela Suites",
      },
    ],
  },
];

export default function Settings() {
  const topbarRef = useRef(null);
  const { logoutModalOpen, requestLogout, closeLogoutModal, confirmLogout } = useRoleLogoutModal();
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

  return (
    <>
      <RailPortalShell
        rootClassName="guest-settings-root guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
        mainStyle={mainStyle}
        rootProps={{
          onClick: () => topbarRef.current?.closeMenus(),
        }}
        sidebar={
          <GuestSidebar
            navItems={navItems}
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
        {/* ── TOPBAR ── */}
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
          <GuestTopbarActions ref={topbarRef} onRequestLogout={requestLogout} />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div className="settings-wrap">

            {/* Page heading */}
            <div className="settings-heading">
              <div className="heading-icon-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width="24" height="24">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </div>
              <div>
                <h2 className="settings-title">Manage Settings</h2>
                <p className="settings-sub">Customize your account preferences and view policies</p>
              </div>
            </div>

            {/* Dynamic sections */}
            {settingsSections.map((section) => (
              <div className="settings-section" key={section.label}>
                <div className="section-label">{section.label}</div>
                <div className="settings-list">
                  {section.items.map((item) => (
                    <a href={item.href} className="settings-item" key={item.label}>
                      <span className="settings-item-icon">{item.icon}</span>
                      <div className="settings-item-text">
                        <span className="settings-item-label">{item.label}</span>
                        <span className="settings-item-desc">{item.desc}</span>
                      </div>
                      <span className="settings-item-arrow"><ChevronRight /></span>
                    </a>
                  ))}
                </div>
              </div>
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