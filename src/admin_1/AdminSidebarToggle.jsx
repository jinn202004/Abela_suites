import { useAdminShell } from "./AdminShellContext";
import "./admin-sidebar-collapse.css";

/** Topbar chevron: toggles between full labels and icon-only sidebar */
export default function AdminSidebarToggle() {
  const { sidebarCollapsed, toggleSidebar, isMobile, mobileSidebarOpen } = useAdminShell();

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
