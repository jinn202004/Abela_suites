import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import GuestTopbarActions from "./GuestTopbarActions";
import GuestSidebar from "./GuestSidebar";
import { buildGuestNavItems } from "./guestNavItems";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import "./terms-condition.css";

const navItems = buildGuestNavItems("/settings");

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