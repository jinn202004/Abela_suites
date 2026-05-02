import { Link } from "react-router-dom";
import "./RoleTopbarDropdowns.css";

const ProfileIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20" aria-hidden>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export function RoleNotifDropdown({ isOpen, notifications, onItemClick }) {
  if (!isOpen) return null;
  const list = Array.isArray(notifications) ? notifications : [];
  return (
    <div
      className="dropdown notif-dropdown open"
      role="menu"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {list.length === 0 ? (
        <div className="notif-item">
          <span className="notif-msg">No notifications</span>
        </div>
      ) : (
        list.map((n, i) => (
          <div
            key={n.id != null && String(n.id) !== "" ? String(n.id) : `nf-${i}`}
            className={`notif-item${n.read === false ? " notif-item--unread" : ""}`}
            role="menuitem"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onItemClick?.(n);
              }
            }}
            onPointerDown={(e) => {
              if (e.pointerType === "mouse" && e.button !== 0) return;
              e.preventDefault();
              e.stopPropagation();
              onItemClick?.(n);
            }}
          >
            <span className="notif-msg">{n.msg}</span>
            {n.detail != null && String(n.detail).trim() !== "" ? (
              <span className="notif-detail">{String(n.detail)}</span>
            ) : null}
            {n.time != null && n.time !== "" ? <span className="notif-time">{n.time}</span> : null}
          </div>
        ))
      )}
    </div>
  );
}

export function RoleUserDropdown({ isOpen, profile, profilePath, roleLabel: roleLabelProp, onCloseMenus, onLogout }) {
  if (!isOpen) return null;
  const p = profile || {};
  const path = profilePath || "/";
  const label = roleLabelProp || p.roleLabel || "";
  const showGuestExtras = String(label).toLowerCase() === "guest";
  const avatar = String(p.avatarUrl || "").trim();

  return (
    <div className="dropdown user-dropdown open" role="menu" onClick={(e) => e.stopPropagation()}>
      <div className="user-dropdown-profile">
        {avatar ? (
          <div className="user-dropdown-avatar-wrap">
            <img src={avatar} alt="" className="user-dropdown-avatar" />
          </div>
        ) : null}
        <div className="user-dropdown-profile-name">{p.name || "User"}</div>
        {label ? <div className="user-dropdown-profile-role">{label}</div> : null}
        <div className="user-dropdown-profile-line user-dropdown-profile-line--muted">
          {p.email ? p.email : "No email on file"}
        </div>
        <div className="user-dropdown-profile-line user-dropdown-profile-line--muted">
          {p.contact && String(p.contact).trim() && p.contact !== "—" ? p.contact : "No phone on file"}
        </div>
        {showGuestExtras ? (
          p.address && String(p.address).trim() ? (
            <div className="user-dropdown-profile-line user-dropdown-profile-line--muted">
              {String(p.address).trim()}
            </div>
          ) : (
            <div className="user-dropdown-profile-line user-dropdown-profile-line--muted">No address on file</div>
          )
        ) : null}
        {p.accountId && String(p.accountId).trim() ? (
          <div className="user-dropdown-profile-line user-dropdown-profile-id">Account ID: {String(p.accountId)}</div>
        ) : null}
      </div>
      <Link to={path} className="user-dropdown-item" role="menuitem" onClick={() => onCloseMenus?.()}>
        <ProfileIcon />
        My Profile
      </Link>
      <button type="button" className="user-dropdown-item user-dropdown-item--logout" role="menuitem" onClick={() => onLogout?.()}>
        <LogoutIcon />
        Log out
      </button>
    </div>
  );
}
