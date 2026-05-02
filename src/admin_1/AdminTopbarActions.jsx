import { useEffect, useRef, useState } from "react";
import { TopbarUserIcon } from "../frontdesks/frontdeskTopbarIcons";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TOPBAR } from "../topbar/roleTopbarData";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";

/**
 * @param {object} props
 * @param {unknown[]} [props.notifications] — pass `[]` for empty live feed; omit for default demo list
 * @param {boolean} [props.bellAttention] — `true`: urgent dot; `false`: no dot; `undefined`: muted dot (legacy pages)
 * @param {() => void} [props.onNotificationsPanelOpen] — e.g. mark staff notifications read when opening bell
 * @param {(item: unknown) => void} [props.onNotificationItemClick]
 */
export default function AdminTopbarActions({
  notifications,
  onRequestLogout,
  bellAttention,
  onNotificationsPanelOpen,
  onNotificationItemClick,
}) {
  const { topbarProfile } = useTopbarUserProfile("admin");
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);
  const list =
    notifications === undefined
      ? TOPBAR.admin.notifications
      : Array.isArray(notifications)
        ? notifications
        : TOPBAR.admin.notifications;

  const bellDot =
    bellAttention === true ? "active" : bellAttention === false ? null : "muted";

  useEffect(() => {
    const onMouseDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className="topbar-actions">
      <RoleTopbarBell
        ref={notifRef}
        isOpen={notifOpen}
        onBellClick={(e) => {
          e.stopPropagation();
          setNotifOpen((v) => {
            const opening = !v;
            if (opening) onNotificationsPanelOpen?.();
            return opening;
          });
          setUserOpen(false);
        }}
        notifications={list}
        bellIconClassName="topbar-icon"
        dot={bellDot}
        dotTitle={bellAttention === true ? "Pending or unread alerts" : undefined}
        onItemClick={(n) => {
          onNotificationItemClick?.(n);
          setNotifOpen(false);
        }}
      />

      <div
        className="icon-btn"
        ref={userRef}
        onClick={(e) => {
          e.stopPropagation();
          setUserOpen((v) => !v);
          setNotifOpen(false);
        }}
      >
        <TopbarUserIcon className="topbar-icon" />
        <span
          className="user-arrow"
          style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          &#9662;
        </span>
        <RoleUserDropdown
          isOpen={userOpen}
          profile={topbarProfile}
          profilePath={TOPBAR.admin.profilePath}
          onCloseMenus={() => {
            setNotifOpen(false);
            setUserOpen(false);
          }}
          onLogout={() => {
            setNotifOpen(false);
            setUserOpen(false);
            onRequestLogout?.();
          }}
        />
      </div>
    </div>
  );
}
