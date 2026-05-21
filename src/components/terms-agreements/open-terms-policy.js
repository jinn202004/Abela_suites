import { POLICY_CONTENT } from "./policy-content.js";
import { PolicyModal } from "./policy-modal.js";

/**
 * Open the full policy modal from anywhere (no DOM init required).
 * @param {"terms"|"privacy"|"stay"} policyId
 * @param {(id: string) => void} [onViewed] — called when the modal closes
 */
export function openTermsPolicy(policyId, onViewed) {
  const policy = POLICY_CONTENT[policyId];
  if (!policy) return;
  PolicyModal.getInstance().open({
    id: policyId,
    title: policy.title,
    html: policy.html,
    onClose: (id) => {
      if (typeof onViewed === "function") onViewed(id);
    },
  });
}
