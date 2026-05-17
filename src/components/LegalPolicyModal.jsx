import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { PrivacyPolicyBody, TermsPolicyBody } from "./legalPolicyModalContent";
import "./LegalPolicyModal.css";

function BackIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

/**
 * @param {{ doc: 'terms' | 'privacy'; visible: boolean; onClose: () => void }} props
 */
export default function LegalPolicyModal({ doc, visible, onClose }) {
  const titleId = useId();
  const panelRef = useRef(null);
  const lastActiveRef = useRef(null);

  const title = doc === "terms" ? "Terms & Conditions" : "Privacy Policy";

  useEffect(() => {
    if (!visible) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  useEffect(() => {
    if (visible) {
      lastActiveRef.current = document.activeElement;
      const t = window.setTimeout(() => {
        panelRef.current?.querySelector?.('button[data-legal-policy-close="1"]')?.focus?.();
      }, 60);
      return () => window.clearTimeout(t);
    }
    lastActiveRef.current?.focus?.();
    return undefined;
  }, [visible]);

  const node = (
    <div
      className={`legal-policy-modal-overlay${visible ? " legal-policy-modal-overlay--visible" : ""}`}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="legal-policy-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="legal-policy-modal-header">
          <button
            type="button"
            className="legal-policy-modal-header-btn"
            aria-label="Back to previous page"
            onClick={onClose}
          >
            <BackIcon />
          </button>
          <h1 id={titleId} className="legal-policy-modal-title">
            {title}
          </h1>
          <button
            type="button"
            className="legal-policy-modal-header-btn"
            data-legal-policy-close="1"
            aria-label="Close"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </header>
        <div className="legal-policy-modal-body">{doc === "terms" ? <TermsPolicyBody /> : <PrivacyPolicyBody />}</div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
