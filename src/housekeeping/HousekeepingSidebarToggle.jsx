/** Top bar control: same behavior as admin_1 AdminSidebarToggle (hamburger on mobile, chevrons on desktop). */
export default function HousekeepingSidebarToggle({
  sidebarCollapsed,
  toggleSidebar,
  isMobile,
  mobileSidebarOpen,
}) {
  return (
    <button
      type="button"
      className="breadcrumb-arrow breadcrumb-arrow-btn"
      onClick={(e) => {
        e.stopPropagation();
        toggleSidebar();
      }}
      aria-expanded={isMobile ? mobileSidebarOpen : !sidebarCollapsed}
      aria-label={
        isMobile
          ? mobileSidebarOpen
            ? "Close menu"
            : "Open menu"
          : sidebarCollapsed
            ? "Expand sidebar"
            : "Collapse sidebar to icons"
      }
      title={
        isMobile
          ? mobileSidebarOpen
            ? "Close menu"
            : "Open menu"
          : sidebarCollapsed
            ? "Expand sidebar"
            : "Collapse sidebar"
      }
    >
      {isMobile ? (mobileSidebarOpen ? "✕" : "☰") : sidebarCollapsed ? "‹" : "›"}
    </button>
  );
}
