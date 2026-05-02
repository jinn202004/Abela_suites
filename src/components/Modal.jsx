import { useEffect, useRef, useId, useCallback } from "react";
import { createPortal } from "react-dom";
import "./Modal.css";

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * App-wide modal: overlay + header / body / footer, focus trap, ESC, backdrop close.
 *
 * @param {boolean} open
 * @param {() => void} onClose
 * @param {import('react').ReactNode} [title] — omitted when hideHeader or contentOnly
 * @param {import('react').ReactNode} children
 * @param {import('react').ReactNode} [footer] — rendered below body (not scrolled with body when bodyScrolls)
 * @param {'sm'|'md'|'lg'|'xl'} [size='lg']
 * @param {'top'|'center'} [placement='top'] — top: scrollable from top (long forms); center: centered dialog
 * @param {string} [panelClassName] — e.g. fd-room-modal, bill-modal-box, confirm-box
 * @param {string} [bodyClassName] — e.g. modal-body-scroll
 * @param {string} [overlayClassName] — extra overlay classes
 * @param {boolean} [hideHeader]
 * @param {boolean} [contentOnly] — panel is only children (no modal-header/body/footer wrappers); use for confirm/success shells
 * @param {boolean} [closeOnBackdrop=true]
 * @param {boolean} [closeOnEscape=true]
 * @param {boolean} [lockBodyScroll=true]
 * @param {string} [ariaLabel] — required when hideHeader/contentOnly and no title
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "lg",
  placement = "top",
  panelClassName = "",
  bodyClassName = "",
  overlayClassName = "",
  hideHeader = false,
  contentOnly = false,
  closeOnBackdrop = true,
  closeOnEscape = true,
  lockBodyScroll = true,
  ariaLabel,
  shellStyle = true,
}) {
  const titleId = useId();
  const panelRef = useRef(null);
  const prevActiveRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !lockBodyScroll) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, lockBodyScroll]);

  useEffect(() => {
    if (!open) return;
    prevActiveRef.current = document.activeElement;

    const focusPanel = () => {
      const root = panelRef.current;
      if (!root) return;
      const focusables = [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (el) => !el.hasAttribute("disabled")
      );
      if (focusables.length) focusables[0].focus();
      else if (typeof root.focus === "function") root.focus();
    };

    const id = requestAnimationFrame(focusPanel);

    const onKeyDown = (e) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const focusables = [...root.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
        (el) => !el.hasAttribute("disabled") && root.contains(el)
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(id);
      document.removeEventListener("keydown", onKeyDown);
      const prev = prevActiveRef.current;
      if (prev instanceof HTMLElement) prev.focus({ preventScroll: true });
    };
  }, [open, closeOnEscape]);

  const onBackdropClick = useCallback(
    (e) => {
      if (closeOnBackdrop && e.target === e.currentTarget) onCloseRef.current?.();
    },
    [closeOnBackdrop]
  );

  if (!open) return null;

  const sizeClass =
    size === "sm" ? "modal-sm" : size === "md" ? "modal-md" : size === "xl" ? "modal-xl" : "";

  const overlayClass = [
    "modal-overlay",
    "open",
    "abel-modal",
    placement === "center" ? "abel-modal--center" : "abel-modal--top",
    overlayClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const panelClass = [shellStyle ? "modal-box" : null, "abel-modal-panel", sizeClass, panelClassName]
    .filter(Boolean)
    .join(" ");

  const dialogAria =
    hideHeader || contentOnly
      ? { "aria-label": ariaLabel || (typeof title === "string" ? title : "Dialog") }
      : { "aria-labelledby": titleId };

  const panel = contentOnly ? (
    <div
      ref={panelRef}
      className={panelClass}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      {...dialogAria}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  ) : (
    <div
      ref={panelRef}
      className={panelClass}
      role="dialog"
      aria-modal="true"
      {...dialogAria}
      onClick={(e) => e.stopPropagation()}
    >
      {!hideHeader && title != null ? (
        <div className="modal-header">
          <h3 className="modal-title" id={titleId}>
            {title}
          </h3>
          <button
            type="button"
            className="modal-close"
            onClick={() => onCloseRef.current?.()}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
      <div className={["modal-body", "abel-modal-body", bodyClassName].filter(Boolean).join(" ")}>{children}</div>
      {footer ? <div className="modal-footer abel-modal-footer">{footer}</div> : null}
    </div>
  );

  return createPortal(
    <div className={overlayClass} role="presentation" onClick={onBackdropClick}>
      {panel}
    </div>,
    document.body
  );
}
