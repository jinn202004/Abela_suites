import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "abela-admin-sidebar-collapsed";
/** Match frontdesk/sidebar template width. */
const RAIL_EXPANDED = 240;
const RAIL_COLLAPSED = 64;
const MOBILE_BREAKPOINT = 768;
const MOBILE_DRAWER_WIDTH = "50vw";
const TOPBAR_STRIP_PX = 62;
const LOGO_EXPANDED = 80;
const LOGO_COLLAPSED = 28;
const LOGO_MOBILE = 120;
const PAD_EXPANDED = 15;

const AdminShellContext = createContext(null);

export function AdminShellProvider({ children }) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= MOBILE_BREAKPOINT;
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      if (typeof window === "undefined") return false;
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    const el = document.documentElement;
    if (!isMobile && sidebarCollapsed) el.setAttribute("data-admin-sidebar-collapsed", "true");
    else el.removeAttribute("data-admin-sidebar-collapsed");
    return () => el.removeAttribute("data-admin-sidebar-collapsed");
  }, [isMobile, sidebarCollapsed]);

  const toggleSidebar = useCallback(() => {
    if (isMobile) {
      setMobileSidebarOpen((o) => !o);
      return;
    }
    setSidebarCollapsed((c) => !c);
  }, [isMobile]);

  const railPx = isMobile ? 0 : sidebarCollapsed ? RAIL_COLLAPSED : RAIL_EXPANDED;
  const isCompactLogo = !isMobile && sidebarCollapsed;
  const logoPx = isMobile ? LOGO_MOBILE : isCompactLogo ? LOGO_COLLAPSED : LOGO_EXPANDED;
  const padX = isCompactLogo ? 4 : PAD_EXPANDED;

  const asideStyle = useMemo(
    () => ({
      width: isMobile ? MOBILE_DRAWER_WIDTH : railPx,
      minWidth: isMobile ? MOBILE_DRAWER_WIDTH : railPx,
      maxWidth: isMobile ? MOBILE_DRAWER_WIDTH : railPx,
      overflowX: "hidden",
      transform: isMobile ? (mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
      boxShadow: isMobile && mobileSidebarOpen ? "0 10px 26px rgba(0, 0, 0, 0.22)" : "none",
      zIndex: isMobile ? 700 : undefined,
      transition:
        "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s ease, box-shadow 0.2s ease",
    }),
    [isMobile, mobileSidebarOpen, railPx]
  );

  const mainStyle = useMemo(
    () => ({
      marginLeft: railPx,
      width: `calc(100% - ${railPx}px)`,
      transition:
        "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    }),
    [railPx]
  );

  const logoWrapStyle = useMemo(() => {
    const base = {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      lineHeight: 0,
      flexShrink: 0,
      boxSizing: "border-box",
      transition:
        "padding 0.3s cubic-bezier(0.4, 0, 0.2, 1), height 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    };
    if (isCompactLogo) {
      return {
        ...base,
        height: TOPBAR_STRIP_PX,
        minHeight: TOPBAR_STRIP_PX,
        maxHeight: TOPBAR_STRIP_PX,
        padding: `0 ${padX}px`,
      };
    }
    return {
      ...base,
      height: "auto",
      minHeight: 0,
      maxHeight: "none",
      padding: `${PAD_EXPANDED}px ${padX}px`,
    };
  }, [isCompactLogo, padX]);

  const logoImgStyle = useMemo(
    () => ({
      width: logoPx,
      height: logoPx,
      maxWidth: logoPx,
      maxHeight: logoPx,
      minWidth: 0,
      minHeight: 0,
      aspectRatio: "1",
      borderWidth: isCompactLogo ? 1 : 2,
      flexShrink: 0,
      flexGrow: 0,
      display: "block",
      transition:
        "width 0.3s, height 0.3s, border-width 0.3s, max-width 0.3s, max-height 0.3s",
    }),
    [isCompactLogo, logoPx]
  );

  const closeMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(false);
  }, []);

  const value = {
    sidebarCollapsed,
    isMobile,
    mobileSidebarOpen,
    setSidebarCollapsed,
    closeMobileSidebar,
    toggleSidebar,
    asideStyle,
    mainStyle,
    logoWrapStyle,
    logoImgStyle,
    shellClassName: `admin-rail-shell${!isMobile && sidebarCollapsed ? " sidebar-collapsed" : ""}${isMobile ? " admin-mobile-shell" : ""}${isMobile && mobileSidebarOpen ? " mobile-open" : ""}`,
  };

  return <AdminShellContext.Provider value={value}>{children}</AdminShellContext.Provider>;
}

export function useAdminShell() {
  const ctx = useContext(AdminShellContext);
  if (!ctx) throw new Error("useAdminShell must be used within AdminShellProvider");
  return ctx;
}
