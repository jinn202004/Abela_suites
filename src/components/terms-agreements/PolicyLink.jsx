import { openTermsPolicy } from "./open-terms-policy";

/**
 * Gold policy link — opens the full-policy modal on click.
 */
export function PolicyLink({ policyId, children, onViewed, className = "ta-policy-link" }) {
  return (
    <button
      type="button"
      className={className}
      data-ta-policy={policyId}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        openTermsPolicy(policyId, onViewed);
      }}
    >
      {children}
    </button>
  );
}
