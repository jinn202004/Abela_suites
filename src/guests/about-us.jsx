import { LogoutConfirmModal } from "../topbar/LogoutConfirmModal";
import { useRoleLogoutModal } from "../topbar/useRoleLogoutModal";
import GuestTopbarActions from "./GuestTopbarActions";
import GuestSidebar from "./GuestSidebar";
import { buildGuestNavItems } from "./guestNavItems";
import { useGuestSidebarLayout } from "./useGuestSidebarLayout";
import RailPortalShell from "../layouts/RailPortalShell";
import HousekeepingSidebarToggle from "../housekeeping/HousekeepingSidebarToggle";
import "./about-us.css";

const navItems = buildGuestNavItems("/settings");

export default function AboutUs() {
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
        rootStyle={{ display: "flex", minHeight: "100vh", width: "100%" }}
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
                <h2 className="tc-title">About Us</h2>
                <p className="tc-sub">Read the terms and conditions of our hotel</p>
              </div>
            </div>

            {/* Card */}
            <div className="tc-card">

              {/* Hotel Logo */}
              <div className="tc-hotel-header">
                <img src="/public/Abela-removebg-preview.png" alt="Abela Suites" className="tc-hotel-logo" />
              </div>

              <h2 className="about-title">About Abela Suites</h2>

              <hr className="tc-divider" />

              {/* About Content */}
              <div className="about-body">
                <p className="about-para">
                  We offer well-maintained and fully furnished rooms, spacious event and venue spaces
                  for celebrations and corporate gatherings, along with convenient booking and secure
                  payment options to ensure a comfortable and hassle-free experience for our guests.
                  We also have an in-house restaurant, so you never have to worry about satisfying
                  your cravings during your stay.
                </p>
                <p className="about-para">
                  Our mission is to deliver exceptional hospitality by upholding the highest standards
                  of professionalism, cleanliness, safety, and customer satisfaction. We are committed
                  to creating a welcoming and comfortable environment where every guest feels valued,
                  respected, and cared for. Through dedicated service, attention to detail, and
                  continuous improvement, we strive to exceed expectations and provide memorable
                  experiences for all who choose to stay and celebrate with us.
                </p>
                <p className="about-tagline">
                  At Abela Suites, your comfort and security are our priority.
                </p>
              </div>

            </div>
          </div>
        </main>
      </RailPortalShell>
      <LogoutConfirmModal open={logoutModalOpen} onClose={closeLogoutModal} onConfirm={confirmLogout} />
    </>
  );
}
