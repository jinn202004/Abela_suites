import { useCallback, useEffect, useImperativeHandle, useRef, useState, forwardRef } from "react";
import TopbarAvatar from "./TopbarAvatar";
import { RoleUserDropdown } from "./RoleTopbarDropdowns";
import { RoleTopbarBell } from "./RoleTopbarBell";
import { TOPBAR } from "./roleTopbarData";
import { useTopbarUserProfile } from "./useTopbarUserProfile";

/**
 * Shared bell + user menu for staff shells (admin rail, front desk, housekeeping, cashier, …).
 * Matches `admin_1` topbar: `topbar-actions` row, `bellIconClassName` / `topbar-icon`, `mousedown` outside close,
 * opening one menu closes the other.
 *
 * Ref: `{ closeMenus() }` — closes bell + user UI and runs `onMenusClosedExtra` (e.g. after navigating from a notification).
 *
 * @param {object} props
 * @param {keyof typeof TOPBAR} [props.roleKey]
 * @param {string} [props.profilePath]
 * @param {unknown[]} [props.notifications]
 * @param {boolean} [props.bellAttention]
 * @param {null | 'active' | 'muted' | 'plain'} [props.dot]
 * @param {string} [props.dotTitle]
 * @param {string} [props.bellTitle]
 * @param {() => void} [props.onNotificationsPanelOpen]
 * @param {(item: unknown) => void} [props.onNotificationItemClick]
 * @param {() => void} [props.onRequestLogout]
 * @param {object} [props.dropdownProfile] — if set, passed to the user dropdown instead of `useTopbarUserProfile` (e.g. cashier settings merged with form state).
 * @param {() => void} [props.onMenusClosedExtra]
 * @param {import('react').ReactNode} [props.middleSlot] — e.g. chat icon between bell and profile
 * @param {() => void} [props.onMiddleSlotClose] — called when bell or profile opens
 */
const StaffTopbarActions = forwardRef(function StaffTopbarActions(
  {
    roleKey = "admin",
    profilePath: profilePathProp,
    notifications,
    onRequestLogout,
    bellAttention,
    dot,
    dotTitle,
    bellTitle,
    onNotificationsPanelOpen,
    onNotificationItemClick,
    onMenusClosedExtra,
    dropdownProfile,
    middleSlot,
    onMiddleSlotClose,
  },
  ref,
) {
  const cfg = TOPBAR[roleKey] ?? TOPBAR.guest;
  const { topbarProfile } = useTopbarUserProfile(roleKey);
  const profileForDropdown = dropdownProfile != null ? dropdownProfile : topbarProfile;
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const userRef = useRef(null);

  const profilePath = profilePathProp ?? cfg.profilePath ?? "/";

  const list =
    notifications === undefined
      ? cfg.notifications
      : Array.isArray(notifications)
        ? notifications
        : cfg.notifications;

  const bellDot =
    dot !== undefined ? dot : bellAttention === true ? "active" : bellAttention === false ? null : "muted";

  const hideMenusOnly = useCallback(() => {
    setNotifOpen(false);
    setUserOpen(false);
  }, []);

  const closeMenus = useCallback(() => {
    hideMenusOnly();
    onMenusClosedExtra?.();
  }, [hideMenusOnly, onMenusClosedExtra]);

  useImperativeHandle(ref, () => ({ closeMenus, hideMenusOnly }), [closeMenus, hideMenusOnly]);

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
            if (opening) {
              onNotificationsPanelOpen?.();
              onMiddleSlotClose?.();
            }
            return !v;
          });
          setUserOpen(false);
        }}
        notifications={list}
        bellIconClassName="topbar-icon"
        title={bellTitle ?? "Notifications"}
        dot={bellDot}
        dotTitle={dotTitle ?? (bellAttention === true ? "Pending or unread alerts" : undefined)}
        onItemClick={(n) => {
          onNotificationItemClick?.(n);
          hideMenusOnly();
        }}
      />

      {middleSlot}

      <div
        className="icon-btn icon-btn--profile"
        ref={userRef}
        onClick={(e) => {
          e.stopPropagation();
          setUserOpen((v) => {
            if (!v) onMiddleSlotClose?.();
            return !v;
          });
          setNotifOpen(false);
        }}
      >
        <TopbarAvatar src={profileForDropdown?.avatarUrl} className="topbar-nav-avatar" />
        <span
          className="user-arrow"
          style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
        >
          &#9662;
        </span>
        <RoleUserDropdown
          isOpen={userOpen}
          profile={profileForDropdown}
          onCloseMenus={closeMenus}
          onLogout={() => {
            closeMenus();
            onRequestLogout?.();
          }}
        />
      </div>
    </div>
  );
});

export default StaffTopbarActions;
