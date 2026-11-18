import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import GuestTopbarActions from "./GuestTopbarActions";
import GuestSidebar from "./GuestSidebar";
import { buildGuestNavItems } from "./guestNavItems";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import "./terms-conditionstay.css"; // reuse the same stylesheet

const navItems = buildGuestNavItems("/settings");

const sections = [
  {
    title: "1. Check-In and Check-Out",
    items: [
      "Standard Check-in Time: 2:00 PM",
      "Standard Check-out Time: 12:00 NN",
      "Early check-in or late check-out is subject to availability and additional charges.",
    ],
  },
  {
    title: "2. Identification Upon Arrival",
    items: [
      "Guests must present the same valid ID used during the online reservation.",
      "Failure to provide proper identification may result in denied check-in without refund.",
    ],
  },
  {
    title: "3. Guest Conduct",
    items: [
      "Guests must respect other guests and hotel staff at all times.",
      "Excessive noise, illegal activities, and disruptive behavior are strictly prohibited.",
    ],
  },
  {
    title: "4. Occupancy Policy",
    items: [
      "Only registered guests are allowed to stay overnight.",
      "Additional persons may incur extra charges.",
    ],
  },
  {
    title: "5. Damage and Loss",
    items: [
      "Guests are responsible for any damage to hotel property during their stay.",
      "The hotel is not liable for lost or stolen personal belongings.",
    ],
  },
  {
    title: "6. Payments",
    items: [
      "Accepted payment methods include cash, bank transfer, and approved e-wallets.",
      "Required down payment or full payment must be completed within the specified period.",
      "Failure to pay within the deadline may result in automatic cancellation.",
    ],
  },
  {
    title: "7. Cancellation and Refund",
    items: [
      "Cancellation requests must follow the stated cancellation period.",
      "Refunds, if applicable, will be processed within 7–14 business days.",
      "No-shows or late cancellations may forfeit the down payment.",
    ],
  },
  {
    title: "8. Privacy",
    items: [
      "Personal information collected during booking is used solely for reservation and communication purposes.",
      "We do not share your information with third parties without your consent, except as required by law.",
    ],
  },
  {
    title: "9. Amendments",
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
                <h2 className="tc-title">Terms and Conditions of Stay</h2>
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
                  By checking in at Abela Suites, guests agree to comply with the following house rules:
                </p>
              </div>

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