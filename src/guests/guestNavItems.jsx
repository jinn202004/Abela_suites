import { GuestArchiveIcon } from "./guestArchiveIcon";

export const GuestHomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
  </svg>
);

export const GuestRoomIcon = () => (
  <svg viewBox="0 0 24 24" fill="white" width="22" height="22">
    <path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9a4 4 0 0 0-4-4z" />
  </svg>
);

export const GuestEventIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const GuestRestaurantIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <path d="M3 11h18" />
    <path d="M5 11V5a2 2 0 0 1 4 0v6" />
    <path d="M11 11V3h2v8" />
    <path d="M15 11V5a2 2 0 0 1 4 0v6" />
    <path d="M4 21h16" />
    <path d="M6 15v6" />
    <path d="M18 15v6" />
  </svg>
);

export const GuestSettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="22" height="22">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const NAV_DEFS = [
  { label: "Homepage", icon: GuestHomeIcon, href: "/home" },
  { label: "Rooms", icon: GuestRoomIcon, href: "/rooms" },
  { label: "Event Venues", icon: GuestEventIcon, href: "/event-venues" },
  { label: "Restaurant Menu", icon: GuestRestaurantIcon, href: "/restaurant-menu" },
  { label: "Archive", icon: GuestArchiveIcon, href: "/booking-history", archive: true },
  { label: "Settings", icon: GuestSettingsIcon, href: "/settings" },
];

/** Shared guest sidebar items — pass active href (e.g. "/restaurant-menu"). */
export function buildGuestNavItems(activeHref = "") {
  const active = String(activeHref || "").trim();
  return NAV_DEFS.map((item) => {
    const Icon = item.icon;
    const icon = item.archive ? <GuestArchiveIcon /> : <Icon />;
    return {
      label: item.label,
      icon,
      href: item.href,
      active: active === item.href,
    };
  });
}
