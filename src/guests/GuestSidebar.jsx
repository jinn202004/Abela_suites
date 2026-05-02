import HousekeepingSidebar from "../housekeeping/HousekeepingSidebar";

/** Guests intentionally reuse housekeeping sidebar structure for exact consistency. */
export default function GuestSidebar({
  navItems,
  logoSrc = "/logo.png",
  logoHref,
  sidebarCollapsed = false,
  isMobile = false,
  mobileSidebarOpen = false,
  closeMobileSidebar = () => {},
  shellClassName = "",
  asideStyle,
  logoWrapStyle,
  logoImgStyle,
}) {
  return (
    <HousekeepingSidebar
      navItems={navItems}
      logoSrc={logoSrc}
      logoHref={logoHref}
      sidebarCollapsed={sidebarCollapsed}
      isMobile={isMobile}
      mobileSidebarOpen={mobileSidebarOpen}
      closeMobileSidebar={closeMobileSidebar}
      shellClassName={shellClassName}
      asideStyle={asideStyle}
      logoWrapStyle={logoWrapStyle}
      logoImgStyle={logoImgStyle}
    />
  );
}
