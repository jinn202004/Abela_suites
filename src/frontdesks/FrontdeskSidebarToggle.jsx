import { useFrontdeskShell } from "./FrontdeskShellContext";
import "./frontdesk-sidebar-collapse.css";

/** Topbar control: hamburger on mobile, chevrons on desktop (same as admin_1 AdminSidebarToggle). */
export default function FrontdeskSidebarToggle() {
  const { sidebarCollapsed, toggleSidebar, isMobile, mobileSidebarOpen } = useFrontdeskShell();

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
