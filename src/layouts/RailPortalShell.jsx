/**
 * Shared rail UI shell: gold sidebar + main column with synced `marginLeft` / width.
 * Housekeeping uses `housekeeping-portal-layout`, front desk `frontdesk-app` (or `app-layout` variants),
 * guests `guest-portal-layout`, etc. Only `rootClassName`, `sidebar`, and `children` differ per role/route.
 */
export default function RailPortalShell({
  /** Primary portal class, e.g. `housekeeping-portal-layout`, `frontdesk-app`, `app-layout rooms-page frontdesk-app` */
  rootClassName,
  /** Optional rail state classes from layout hooks (collapsed / mobile shell). */
  shellClassName = "",
  rootStyle,
  mainStyle,
  sidebar,
  children,
  /** Spread onto the root node (e.g. `onClick` on bills to close menus). */
  rootProps = {},
}) {
  const cn = [rootClassName, shellClassName].filter(Boolean).join(" ").trim();
  return (
    <div className={cn || undefined} style={rootStyle} {...rootProps}>
      {sidebar}
      <div className="main-wrapper" style={mainStyle}>
        {children}
      </div>
    </div>
  );
}
