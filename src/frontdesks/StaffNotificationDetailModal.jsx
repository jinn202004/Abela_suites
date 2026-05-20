import { useCallback } from "react";
import { useNotificationRedirect } from "../navigation/useNotificationRedirect";

/**
 * @deprecated Notification clicks navigate directly; no preview modal.
 * Kept for backward compatibility — `openStaffNotification` now redirects immediately.
 */
export function useStaffNotificationDetail(role = "frontdesk") {
  const navigateFromNotification = useNotificationRedirect(role);
  const openStaffNotification = useCallback(
    (n) => {
      navigateFromNotification(n);
    },
    [navigateFromNotification],
  );
  const closeStaffNotification = useCallback(() => {}, []);
  return {
    staffNotification: null,
    openStaffNotification,
    closeStaffNotification,
  };
}

/** @deprecated No longer rendered; redirects happen on bell item click. */
export function StaffNotificationDetailModal() {
  return null;
}
