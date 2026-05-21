import { POLICY_CONTENT } from "./policy-content.js";
import { openTermsPolicy } from "./open-terms-policy.js";

/**
 * Wire policy link clicks inside a terms root (vanilla HTML demo / non-React).
 * Checkboxes are not handled here — they only confirm agreement in the app forms.
 * @param {HTMLElement} root
 * @param {{ onViewed?: (policyId: string) => void, policies?: typeof POLICY_CONTENT, bindPolicyLinks?: boolean }} [options]
 */
export function initTermsAgreements(root, options = {}) {
  if (!root) return null;

  const policies = options.policies || POLICY_CONTENT;
  const cleanups = [];

  const openPolicy = (policyId, triggerEl) => {
    if (!policies[policyId]) return;
    openTermsPolicy(policyId, (id) => options.onViewed?.(id));
    if (triggerEl) triggerEl.classList.add("ta-policy-link--active");
    window.setTimeout(() => triggerEl?.classList.remove("ta-policy-link--active"), 400);
  };

  if (options.bindPolicyLinks !== false) {
    root.querySelectorAll("[data-ta-policy]").forEach((el) => {
      if (el.hasAttribute("data-ta-react-link")) return;
      const policyId = el.getAttribute("data-ta-policy");
      const onClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        openPolicy(policyId, el);
      };
      el.addEventListener("click", onClick);
      cleanups.push(() => el.removeEventListener("click", onClick));
    });
  }

  return {
    openPolicy,
    destroy: () => cleanups.forEach((fn) => fn()),
  };
}

export function destroyTermsAgreements(controller) {
  controller?.destroy?.();
}
