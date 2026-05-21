import { POLICY_CONTENT } from "./policy-content.js";
import { PolicyModal } from "./policy-modal.js";

const CHECKBOX_POLICY_MAP = {
  termsCheck: "terms",
  privacyCheck: "privacy",
  stayCheck: "stay",
};

/**
 * Wire Terms & Agreements UI: policy modals, link hovers, view-before-agree.
 * @param {HTMLElement} root
 * @param {{ onViewed?: (policyId: string) => void, policies?: typeof POLICY_CONTENT }} [options]
 */
export function initTermsAgreements(root, options = {}) {
  if (!root) return null;

  const policies = options.policies || POLICY_CONTENT;
  const modal = PolicyModal.getInstance();
  const viewed = new Set();
  const cleanups = [];

  const markViewed = (policyId) => {
    if (!policyId || viewed.has(policyId)) return;
    viewed.add(policyId);
    root.querySelectorAll(`[data-ta-agreement]`).forEach((input) => {
      const key = input.getAttribute("data-ta-agreement");
      if (CHECKBOX_POLICY_MAP[key] === policyId) {
        input.removeAttribute("data-ta-locked");
        const label = input.closest("label");
        label?.classList.remove("ta-checkbox-label--locked");
      }
    });
    options.onViewed?.(policyId);
  };

  const openPolicy = (policyId, triggerEl) => {
    const policy = policies[policyId];
    if (!policy) return;
    modal.open({
      id: policyId,
      title: policy.title,
      html: policy.html,
      onClose: (id) => markViewed(id),
    });
    if (triggerEl) triggerEl.classList.add("ta-policy-link--active");
    window.setTimeout(() => triggerEl?.classList.remove("ta-policy-link--active"), 400);
  };

  root.querySelectorAll("[data-ta-policy]").forEach((el) => {
    const policyId = el.getAttribute("data-ta-policy");
    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      openPolicy(policyId, el);
    };
    el.addEventListener("click", onClick);
    cleanups.push(() => el.removeEventListener("click", onClick));
  });

  root.querySelectorAll("[data-ta-agreement]").forEach((input) => {
    const agreementKey = input.getAttribute("data-ta-agreement");
    const policyId = CHECKBOX_POLICY_MAP[agreementKey];
    if (!policyId) return;

    input.setAttribute("data-ta-locked", "true");
    const label = input.closest("label");
    label?.classList.add("ta-checkbox-label--locked");

    const onClick = (e) => {
      if (!input.checked && !viewed.has(policyId)) {
        e.preventDefault();
        showHint(root, policyId);
        openPolicy(policyId, root.querySelector(`[data-ta-policy="${policyId}"]`));
      }
    };

    const onChange = (e) => {
      if (e.target.checked && !viewed.has(policyId)) {
        e.target.checked = false;
        showHint(root, policyId);
      }
    };

    input.addEventListener("click", onClick);
    input.addEventListener("change", onChange);
    cleanups.push(() => {
      input.removeEventListener("click", onClick);
      input.removeEventListener("change", onChange);
    });
  });

  return {
    hasViewed: (policyId) => viewed.has(policyId),
    openPolicy,
    markViewed,
    destroy: () => cleanups.forEach((fn) => fn()),
  };
}

export function destroyTermsAgreements(controller) {
  controller?.destroy?.();
}

function showHint(root, policyId) {
  const hint = root.querySelector("[data-ta-hint]");
  const policy = POLICY_CONTENT[policyId];
  if (!hint || !policy) return;
  hint.textContent = `Please open and review “${policy.title}” before agreeing.`;
  hint.hidden = false;
  hint.classList.add("ta-terms-hint--visible");
  window.clearTimeout(showHint._timer);
  showHint._timer = window.setTimeout(() => {
    hint.classList.remove("ta-terms-hint--visible");
  }, 4200);
}
