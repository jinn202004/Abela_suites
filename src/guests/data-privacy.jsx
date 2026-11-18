import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import GuestTopbarActions from "./GuestTopbarActions";
import GuestSidebar from "./GuestSidebar";
import { buildGuestNavItems } from "./guestNavItems";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import "./data-privacy.css";

const navItems = buildGuestNavItems("/settings");

const sections = [
  {
    title: "1. Information We Collect",
    items: [
      "Full name",
      "Contact number and email address",
      "Valid government-issued ID",
      "Reservation and payment details",
    ],
  },
  {
    title: "2. Purpose of Data Collection",
    items: [
      "Reservation processing",
      "Identity verification",
      "Billing and payment confirmation",
      "Security and safety purposes",
    ],
  },
  {
    title: "3. Data Protection",
    items: [
      "All personal information is securely stored and accessible only to authorized personnel.",
      "Information will not be shared with unauthorized third parties unless required by law.",
    ],
  },
  {
    title: "4. Data Retention",
    items: [
      "Personal data will be retained only as long as necessary for business and legal purposes.",
      "Upon request, guests may ask for deletion of their data, subject to legal obligations.",
    ],
  },
  {
    title: "5. Guest Rights",
    items: [
      "You have the right to access, correct, or request deletion of your personal data.",
      "For concerns, contact us at our front desk or official email address.",
    ],
  },
  {
    title: "6. Cookies and Online Data",
    items: [
      "Our website may use cookies to improve your browsing experience.",
      "No sensitive personal data is collected through cookies.",
    ],
  },
  {
    title: "7. Policy Updates",
    items: [
      "Abela Suites reserves the right to update this Privacy Policy at any time.",
      "Continued use of our services after changes means acceptance of the updated policy.",
    ],
  },
];

export default function DataPrivacy() {
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
          <GuestTopbarActions onRequestLogout={requestLogout} />
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="content">
          <div className="tc-wrap">

            {/* Heading */}
            <div className="tc-heading">
             <a href="/settings" className="back-arrow">‹</a>
              <div>
                <h2 className="tc-title">Data Privacy and Policy</h2>
                <p className="tc-sub">Read the terms and conditions of our hotel</p>
              </div>
            </div>

            {/* Card */}
            <div className="tc-card">

              {/* Hotel Logo */}
              <div className="tc-hotel-header">
                <img src="/public/Abela-removebg-preview.png" alt="Abela Suites" className="tc-hotel-logo" />
              </div>

              <hr className="tc-divider" />

              {/* Intro */}
              <p className="dp-intro">
                <strong className="dp-brand">Abela Suites</strong> values and respects your privacy.
                We are committed to protecting your personal information in compliance with the
                Data Privacy Act of 2012.
              </p>

              <hr className="tc-divider" />

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