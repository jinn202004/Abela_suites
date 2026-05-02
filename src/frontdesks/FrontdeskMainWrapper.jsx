import { useFrontdeskShell } from "./FrontdeskShellContext";

/**
 * Main column only (`main-wrapper` + `mainStyle` from `useFrontdeskShell`).
 * Full shell (sidebar + main) now uses `src/layouts/RailPortalShell.jsx` across front desk + housekeeping.
 */
export default function FrontdeskMainWrapper({ children }) {
  const { mainStyle } = useFrontdeskShell();
  return (
    <div className="main-wrapper" style={mainStyle}>
      {children}
    </div>
  );
}
