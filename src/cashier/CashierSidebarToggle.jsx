/**
 * Top bar control: hamburger/close on mobile, chevrons on desktop (matches admin_1 / housekeeping).
 */
export default function CashierSidebarToggle({
  sidebarCollapsed,
  toggleSidebar,
  isMobile,
  mobileSidebarOpen,
}) {
  return (
    <button
      type="button"
      className="breadcrumb-sidebar-toggle"
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
      {isMobile ? (
        mobileSidebarOpen ? "✕" : "☰"
      ) : (
        <span className="breadcrumb-arrow" aria-hidden>
          &#8250;
        </span>
      )}
    </button>
  );
}
