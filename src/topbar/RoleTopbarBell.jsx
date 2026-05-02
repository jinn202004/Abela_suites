import { forwardRef } from "react";
import { TopbarBellIcon } from "../frontdesks/frontdeskTopbarIcons";
import { RoleNotifDropdown } from "./RoleTopbarDropdowns";

/**
 * Shared top-bar notification control: bell, optional status dot, dropdown.
 * Each role keeps its own data hooks and open/toggle handlers; this only renders the UI.
 *
 * @param {object} props
 * @param {boolean} props.isOpen
 * @param {(e: React.MouseEvent) => void} props.onBellClick
 * @param {unknown[]} props.notifications
 * @param {(n: unknown) => void} [props.onItemClick]
 * @param {string} [props.bellIconClassName] — passed to TopbarBellIcon (omit for default SVG sizing)
 * @param {string} [props.title] — `title` on the icon button
 * @param {React.CSSProperties} [props.style]
 * @param {null | 'active' | 'muted' | 'plain'} [props.dot]
 *   - null: no dot
 *   - active: urgent unread style (.notif-dot--active); optional `dotTitle` on the span
 *   - muted: static grey dot (admin / cashier demo notifications)
 *   - plain: simple dot, aria-hidden (e.g. housekeeping “needs cleaning”)
 * @param {string} [props.dotTitle] — tooltip when dot is `active`
 */
export const RoleTopbarBell = forwardRef(function RoleTopbarBell(
  { isOpen, onBellClick, notifications, onItemClick, bellIconClassName, title = "Notifications", style, dot = null, dotTitle },
  ref,
) {
  const dotNode =
    dot == null ? null : dot === "muted" ? (
      <span className="notif-dot" />
    ) : dot === "plain" ? (
      <span className="notif-dot" aria-hidden />
    ) : (
      <span className="notif-dot notif-dot--active" aria-hidden title={dotTitle || "Unread notifications"} />
    );

  return (
    <div
      className="icon-btn"
      ref={ref}
      onClick={onBellClick}
      title={title}
      style={{ position: "relative", ...style }}
    >
      <TopbarBellIcon className={bellIconClassName} />
      {dotNode}
      <RoleNotifDropdown isOpen={isOpen} notifications={notifications} onItemClick={onItemClick} />
    </div>
  );
});
