/** Same image paths as sidebar / login (first match wins). */
export const ADMIN_LOGO_CANDIDATES = [
  "/Abela-removebg-preview.png",
  "/logo.png",
  "/public/logo.png",
  "/images/logo.png",
];

export const ADMIN_LOGO_PRIMARY = ADMIN_LOGO_CANDIDATES[0];

/** Advance to the next logo URL when `<img onError>` fires. */
export function nextAdminLogoSrc(current) {
  const idx = ADMIN_LOGO_CANDIDATES.indexOf(current);
  if (idx < 0) return ADMIN_LOGO_CANDIDATES[1] ?? null;
  return ADMIN_LOGO_CANDIDATES[idx + 1] ?? null;
}
