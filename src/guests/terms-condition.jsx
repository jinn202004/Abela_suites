import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarAvatar from "../topbar/TopbarAvatar";
import { TOPBAR } from "../topbar/roleTopbarData";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import GuestSidebar from "./GuestSidebar";
import { GuestArchiveIcon } from "./guestArchiveIcon";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import "./terms-condition.css";

// --- Icons ---
const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);
const RoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
  </svg>
);
const EventIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);
const navItems = [
  { label: "Homepage",     icon: <HomeIcon />,     href: "/home"           },
  { label: "Rooms",        icon: <RoomIcon />,     href: "/rooms"                       },
  { label: "Event Venues", icon: <EventIcon />,    href: "/event-venues"                },
  { label: "Archive",      icon: <GuestArchiveIcon />, href: "/booking-history" },
  { label: "Settings",     icon: <SettingsIcon />, href: "/settings",  active: true   },
];

const sections = [
  {
    title: "1. Reservations",
    items: [
      "All bookings are subject to availability and management approval.",
      "A reservation is confirmed only upon receipt of the required payment and verification of submitted details.",
      "The name on the reservation must match the valid government-issued ID provided.",
    ],
  },
  {
    title: "2. Valid Identification Requirement",
    items: [
      "A clear photo or scanned copy of a valid government-issued ID must be uploaded during booking.",
      "If booking on behalf of another person, a signed authorization letter and a copy of their valid ID must be submitted.",
    ],
  },
  {
    title: "3. Payments",
    items: [
      "Accepted payment methods include cash, bank transfer, and approved e-wallets.",
      "Required down payment or full payment must be completed within the specified period.",
      "Failure to pay within the deadline may result in automatic cancellation.",
    ],
  },
  {
    title: "4. Cancellation and Refund",
    items: [
      "Cancellation requests must follow the stated cancellation period.",
      "Refunds, if applicable, will be processed within 7–14 business days.",
      "No-shows or late cancellations may forfeit the down payment.",
    ],
  },
  {
    title: "5. Check-In and Check-Out",
    items: [
      "Standard check-in time is 2:00 PM and check-out is 12:00 NN.",
      "Early check-in or late check-out is subject to availability and may incur additional charges.",
      "Guests must present a valid ID and reservation confirmation upon check-in.",
    ],
  },
  {
    title: "6. Guest Conduct",
    items: [
      "Guests are expected to maintain decorum and respect hotel property and staff.",
      "Any damage to hotel property will be charged to the responsible guest.",
      "Abela Suites reserves the right to refuse service or remove guests who violate hotel policies.",
    ],
  },
  {
    title: "7. Privacy",
    items: [
      "Personal information collected during booking is used solely for reservation and communication purposes.",
      "We do not share your information with third parties without your consent, except as required by law.",
    ],
  },
  {
    title: "8. Amendments",
    items: [
      "Abela Suites reserves the right to update these Terms and Conditions at any time.",
      "Continued use of our services after changes constitutes acceptance of the updated terms.",
    ],
  },
];

export default function TermsCondition() {
  const navigate = useNavigate();
  const { topbarProfile } = useTopbarUserProfile("guest");
  const {
    notifRef,
    notifOpen,
    setNotifOpen,
    bellUnreadCount,
    displayNotifications,
  } = useGuestTopbarNotifications();
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
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

  useEffect(() => {
    const onMouseDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [notifRef, setNotifOpen]);

  return (
    <>
      <RailPortalShell
        rootClassName="guest-doc-page guest-portal-layout"
        shellClassName={shellClassName}
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%", background: "#f5f0e8" }}
        mainStyle={mainStyle}
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
          <div className="topbar-actions">
            <RoleTopbarBell
              ref={notifRef}
              isOpen={notifOpen}
              onBellClick={(e) => {
                e.stopPropagation();
                setNotifOpen((v) => !v);
                setUserOpen(false);
              }}
              notifications={displayNotifications}
              bellIconClassName="topbar-icon"
              dot={bellUnreadCount > 0 ? "active" : null}
              onItemClick={(n) => {
                const bookingId = String(n?.bookingId || "").trim();
                setNotifOpen(false);
                setUserOpen(false);
                if (bookingId) navigate(`/my-bookings/${bookingId}`);
              }}
            />
            <div
              className="icon-btn"
              ref={userRef}
              style={{ position: "relative" }}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setUserOpen((v) => !v);
                setNotifOpen(false);
              }}
            >
              <TopbarAvatar src={topbarProfile.avatarUrl} className="topbar-nav-avatar" />
              <span className="user-arrow" style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</span>
              <RoleUserDropdown
                isOpen={userOpen}
                profile={topbarProfile}
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

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div className="tc-wrap">

            {/* Heading */}
            <div className="tc-heading">
              <a href="/settings" className="back-arrow">‹</a>
              <div>
                <h2 className="tc-title">Terms and Conditions</h2>
                <p className="tc-sub">Read the terms and conditions of our hotel</p>
              </div>
            </div>

            {/* Card */}
            <div className="tc-card">

              {/* Hotel Logo + Welcome */}
              <div className="tc-hotel-header">
                <img src="/public/Abela-removebg-preview.png" alt="Abela Suites" className="tc-hotel-logo" />
                <h2 className="tc-welcome">Welcome to Abela Suites</h2>
                <p className="tc-intro">
                  By accessing our website, creating an account, or making a reservation, you agree to
                  the following Terms and Conditions:
                </p>
              </div>

              {/* Sections */}
              <div className="tc-content">
                {sections.map((section) => (
                  <div className="tc-section" key={section.title}>
                    <p className="tc-section-title">{section.title}</p>
                    <ul className="tc-list">
                      {section.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

            </div>
          </div>
        </main>
      </RailPortalShell>
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}