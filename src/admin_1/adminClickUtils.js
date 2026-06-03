/** Selectors for controls that must not open admin row/card detail views. */
const ADMIN_ACTION_TARGET_SELECTOR = [
  ".action-cell",
  ".rooms-action-cell",
  ".rooms-action-btn",
  ".oh-action-cell",
  ".rm-action-btns",
  ".rm-dish-footer",
  ".rm-thumb-btn",
  ".rm-dish-img-wrap--previewable",
  ".icon-action",
  ".sm-status-select-wrap",
  ".sm-status-select",
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
].join(", ");

/** @param {import("react").MouseEvent | import("react").KeyboardEvent} e */
export function shouldSkipAdminRowClick(e) {
  return !!e.target.closest(ADMIN_ACTION_TARGET_SELECTOR);
}

/** @param {import("react").MouseEvent} e */
export function handleAdminRowActivate(e, handler) {
  if (shouldSkipAdminRowClick(e)) return;
  handler();
}

/** @param {import("react").KeyboardEvent} e */
export function handleAdminRowKeyDown(e, handler) {
  if (e.key !== "Enter" && e.key !== " ") return;
  if (shouldSkipAdminRowClick(e)) return;
  e.preventDefault();
  handler();
}
