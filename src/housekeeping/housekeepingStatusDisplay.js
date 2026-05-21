/**
 * Shared cleaning status labels and badge classes for Housekeeping + Front Desk.
 * Asset catalog statuses: needs_cleaning | cleaning_in_progress | ready | available | occupied
 * Task statuses: pending | in_progress | completed
 */

export const HK_ASSET_STATUS = {
  NEEDS_CLEANING: "needs_cleaning",
  CLEANING_IN_PROGRESS: "cleaning_in_progress",
  READY: "ready",
  AVAILABLE: "available",
  RESERVED: "reserved",
  OCCUPIED: "occupied",
};

/** User-facing labels for room/venue catalog status. */
export function assetStatusToDisplayLabel(statusRaw) {
  const s = String(statusRaw ?? "").trim().toLowerCase();
  if (s === HK_ASSET_STATUS.AVAILABLE) return "Ready for Use";
  if (s === HK_ASSET_STATUS.RESERVED) return "Reserved";
  if (s === HK_ASSET_STATUS.OCCUPIED) return "Occupied";
  if (s === HK_ASSET_STATUS.NEEDS_CLEANING) return "Needs Cleaning";
  if (s === HK_ASSET_STATUS.CLEANING_IN_PROGRESS) return "Cleaning in Progress";
  if (s === HK_ASSET_STATUS.READY) return "Cleaning Complete";
  return String(statusRaw ?? "").trim() || "—";
}

/** Inventory list: cleaned + vacant rooms/venues show as ready for guests. */
export function assetStatusForInventoryDisplay(statusRaw) {
  const s = String(statusRaw ?? "").trim().toLowerCase();
  if (s === HK_ASSET_STATUS.AVAILABLE || s === HK_ASSET_STATUS.READY) {
    return "Ready for Use";
  }
  return assetStatusToDisplayLabel(statusRaw);
}

export function taskTabToLabel(tab) {
  if (tab === "pending") return "Pending";
  if (tab === "inprogress") return "In Progress";
  if (tab === "completed") return "Completed";
  return tab;
}

export function getAssetStatusBadgeClass(displayLabel) {
  const s = String(displayLabel ?? "").trim();
  if (s === "Needs Cleaning") return "badge-needclean";
  if (s === "Cleaning in Progress") return "badge-inprogress";
  if (s === "Cleaning Complete") return "badge-completed";
  if (s === "Ready for Use") return "badge-available";
  if (s === "Reserved") return "badge-pending";
  if (s === "Occupied") return "badge-occupied";
  return "badge-neutral";
}

/** Front desk room override dropdown — Needs Cleaning or Available only. */
export const FRONTDESK_HK_STATUS_OPTIONS = [
  { value: HK_ASSET_STATUS.NEEDS_CLEANING, label: "Needs Cleaning" },
  { value: HK_ASSET_STATUS.AVAILABLE, label: "Available" },
];

/** Map catalog status to the two-option front desk select value (occupied / in-progress are read-only). */
export function frontDeskSelectValueFromRaw(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === HK_ASSET_STATUS.AVAILABLE || s === HK_ASSET_STATUS.READY) {
    return HK_ASSET_STATUS.AVAILABLE;
  }
  if (s === HK_ASSET_STATUS.OCCUPIED || s === HK_ASSET_STATUS.CLEANING_IN_PROGRESS) {
    return s;
  }
  return HK_ASSET_STATUS.NEEDS_CLEANING;
}

export function frontDeskStatusLabel(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  if (s === HK_ASSET_STATUS.AVAILABLE || s === HK_ASSET_STATUS.READY) return "Available";
  if (s === HK_ASSET_STATUS.OCCUPIED) return "Occupied";
  if (s === HK_ASSET_STATUS.CLEANING_IN_PROGRESS) return "In Progress";
  if (s === HK_ASSET_STATUS.NEEDS_CLEANING) return "Needs Cleaning";
  return "—";
}

/** Front desk HK page: manual status override only when not occupied or actively being cleaned. */
export function frontDeskHousekeepingStatusEditable(raw) {
  const s = String(raw ?? "").trim().toLowerCase();
  return s !== HK_ASSET_STATUS.OCCUPIED && s !== HK_ASSET_STATUS.CLEANING_IN_PROGRESS;
}
