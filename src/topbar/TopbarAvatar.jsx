import "./TopbarAvatar.css";

/** Fallback size for nav avatar placeholder (see TopbarAvatar.css). */
export const TOPBAR_NAV_AVATAR_SIZE = 40;

/** Size for avatar in the account dropdown header. */
export const TOPBAR_DROPDOWN_AVATAR_SIZE = 88;

const DefaultAvatarSvg = ({ size = 28 }) => (
  <svg
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="currentColor"
    aria-hidden
    className="topbar-avatar-fallback-icon"
  >
    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
  </svg>
);

/**
 * Circular avatar for top navigation (beside notification bell).
 * @param {{ src?: string, alt?: string, size?: number, className?: string }} props
 */
export function TopbarAvatar({ src, alt = "", size, className = "" }) {
  const url = String(src || "").trim();
  const showImg =
    url && (/^https?:\/\//i.test(url) || /^data:image\//.test(url));
  const isNav = /\btopbar-nav-avatar\b/.test(className);
  const resolvedSize = size ?? (isNav ? undefined : TOPBAR_NAV_AVATAR_SIZE);
  const style =
    resolvedSize != null ? { width: resolvedSize, height: resolvedSize } : undefined;
  const fallbackSize = resolvedSize ?? TOPBAR_NAV_AVATAR_SIZE;

  return (
    <span
      className={`topbar-avatar ${className}`.trim()}
      style={style}
      aria-hidden={!alt}
    >
      {showImg ? (
        <img src={url} alt={alt} className="topbar-avatar-img" />
      ) : (
        <span className="topbar-avatar-placeholder">
          <DefaultAvatarSvg size={Math.round(fallbackSize * 0.7)} />
        </span>
      )}
    </span>
  );
}

export default TopbarAvatar;
