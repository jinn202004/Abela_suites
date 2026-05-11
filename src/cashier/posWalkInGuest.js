/**
 * Walk-in F&B orders must link to a `users` row with role `guest`.
 * Default matches demo login in `logIn/guestsDemoAuth.js`.
 * Override in `.env`: `VITE_POS_WALK_IN_GUEST_EMAIL=guest@your.com`
 */
export function getPosWalkInGuestEmail() {
  const v = import.meta.env.VITE_POS_WALK_IN_GUEST_EMAIL;
  if (v != null && String(v).trim()) return String(v).trim().toLowerCase();
  return "guest@abela.demo";
}
