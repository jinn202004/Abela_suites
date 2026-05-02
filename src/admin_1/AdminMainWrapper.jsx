import { useAdminShell } from "./AdminShellContext";

/** Applies the same margin/width as the cashier rail so the main column tracks the sidebar. */
export default function AdminMainWrapper({ children }) {
  const { mainStyle } = useAdminShell();
  return (
    <div className="main-wrapper" style={mainStyle}>
      {children}
    </div>
  );
}
