import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import TopbarAvatar from "../topbar/TopbarAvatar";
import { TOPBAR } from "../topbar/roleTopbarData";
import { RoleUserDropdown } from "../topbar/RoleTopbarDropdowns";
import { RoleTopbarBell } from "../topbar/RoleTopbarBell";
import { TopbarChatIcon } from "../frontdesks/frontdeskTopbarIcons";
import { useTopbarUserProfile } from "../topbar/useTopbarUserProfile";
import { useGuestTopbarNotifications } from "./useGuestTopbarNotifications";
import GuestChatPanel from "./GuestChatPanel";

/**
 * Shared guest portal topbar: Notifications → Chat → Profile.
 * Matches existing bell/avatar styling and mutual-exclusion behavior.
 *
 * Ref: `{ closeMenus, loadGuestNotifications }`
 */
const GuestTopbarActions = forwardRef(function GuestTopbarActions(
  { onRequestLogout, profileOverride },
  ref,
) {
  const navigate = useNavigate();
  const {
    notifRef,
    notifOpen,
    setNotifOpen,
    bellUnreadCount,
    displayNotifications,
    loadGuestNotifications,
  } = useGuestTopbarNotifications();
  const { topbarProfile } = useTopbarUserProfile("guest");
  const profile = profileOverride ?? topbarProfile;

  const [chatOpen, setChatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef(null);
  const chatBtnRef = useRef(null);

  const closeMenus = useCallback(() => {
    setNotifOpen(false);
    setUserOpen(false);
  }, [setNotifOpen]);

  useImperativeHandle(ref, () => ({ closeMenus, loadGuestNotifications }), [
    closeMenus,
    loadGuestNotifications,
  ]);

  useEffect(() => {
    const onMouseDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [notifRef, setNotifOpen]);

  const openChat = (e) => {
    e.stopPropagation();
    setChatOpen(true);
    closeMenus();
  };

  return (
    <>
      <div className="topbar-actions">
        <RoleTopbarBell
          ref={notifRef}
          isOpen={notifOpen}
          onBellClick={(e) => {
            e.stopPropagation();
            setNotifOpen((v) => !v);
            setUserOpen(false);
            setChatOpen(false);
          }}
          notifications={displayNotifications}
          bellIconClassName="topbar-icon"
          dot={bellUnreadCount > 0 ? "active" : null}
          onItemClick={(n) => {
            const bookingId = String(n?.bookingId || "").trim();
            closeMenus();
            setChatOpen(false);
            if (bookingId) navigate(`/my-bookings/${bookingId}`);
          }}
        />

        <div
          className="icon-btn"
          ref={chatBtnRef}
          onClick={openChat}
          title="Chat with Front Desk"
          style={{ position: "relative" }}
        >
          <TopbarChatIcon className="topbar-icon" />
        </div>

        <div
          className="icon-btn"
          ref={userRef}
          onClick={(e) => {
            e.stopPropagation();
            setUserOpen((v) => !v);
            setNotifOpen(false);
            setChatOpen(false);
          }}
        >
          <TopbarAvatar src={profile.avatarUrl} className="topbar-nav-avatar" />
          <span
            className="user-arrow"
            style={{ transform: userOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            ▾
          </span>
          <RoleUserDropdown
            isOpen={userOpen}
            profile={profile}
            profilePath={TOPBAR.guest.profilePath}
            onCloseMenus={closeMenus}
            onLogout={() => {
              closeMenus();
              onRequestLogout?.();
            }}
          />
        </div>
      </div>

      <GuestChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
    </>
  );
});

export default GuestTopbarActions;
