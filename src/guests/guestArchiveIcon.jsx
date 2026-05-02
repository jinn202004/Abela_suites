/** Sidebar icon for Archive (/booking-history); matches other guest nav icons (white stroke). */
export function GuestArchiveIcon({ size = 22 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="2"
      width={size}
      height={size}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 8v13H3V8" />
      <path d="M23 3v5H1V3z" />
      <path d="M10 12h4" />
    </svg>
  );
}
