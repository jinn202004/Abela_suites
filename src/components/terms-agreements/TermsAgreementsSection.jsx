import { PolicyLink } from "./PolicyLink";
import { POLICY_CONTENT } from "./policy-content";

/**
 * Terms (inline, full text) + required agreement checkboxes.
 * Privacy & stay open modals via PolicyLink; main terms are read in the scroll area above.
 */
export default function TermsAgreementsSection({
  variant = "event",
  termsChecked,
  privacyChecked,
  stayChecked,
  onTermsChange,
  onPrivacyChange,
  onStayChange,
  errors = {},
  onPolicyViewed,
}) {
  const isEvent = variant === "event";
  const termsBlockClass = isEvent ? "ev-terms-block" : "terms-block";
  const agreementsBlockClass = isEvent ? "ev-agreements-block" : "agreements-block";
  const checkboxClass = isEvent ? "ev-checkbox-label" : "checkbox-label";
  const fieldErrClass = isEvent ? "ev-field-err" : "field-error";

  const errTerms = errors.termsCheck ?? errors.chkTerms;
  const errPrivacy = errors.privacyCheck ?? errors.chkPrivacy;
  const errStay = errors.stayCheck ?? errors.chkTOS;

  return (
    <div className="ta-terms-agreements ta-terms-agreements--stacked" data-ta-root>
      <section className={`${termsBlockClass} ta-terms-read-block`}>
        <h3 className="ta-section-title">Terms and Conditions</h3>
        <div
          className="ta-terms-inline-body"
          tabIndex={0}
          aria-label="Terms and conditions — full text"
          dangerouslySetInnerHTML={{ __html: POLICY_CONTENT.terms.html }}
        />
      </section>

      <section className={`${agreementsBlockClass} ta-agreements-checkboxes`}>
        <h3 className="ta-section-title">Required Agreements</h3>
        <ul className="ta-agreements-list">
          <li className="ta-agreement-item">
            <label className={`${checkboxClass}${errTerms ? (isEvent ? " ev-check-error" : " check-error") : ""}`}>
              <input type="checkbox" checked={!!termsChecked} onChange={onTermsChange} />
              <span className="ta-agreement-text">
                I have read and accept the{" "}
                <span className="ta-policy-label">Terms and Conditions</span>
              </span>
            </label>
            {errTerms ? (
              <span className={`${fieldErrClass}${isEvent ? " visible" : ""}`}>
                {typeof errTerms === "string" ? errTerms : "You must accept the Terms and Conditions."}
              </span>
            ) : null}
          </li>

          <li className="ta-agreement-item">
            <div className="ta-agreement-line">
              <label className={`${checkboxClass}${errPrivacy ? (isEvent ? " ev-check-error" : " check-error") : ""}`}>
                <input type="checkbox" checked={!!privacyChecked} onChange={onPrivacyChange} />
                <span className="ta-agreement-text">I have read and agree to the</span>
              </label>
              <PolicyLink policyId="privacy" onViewed={onPolicyViewed}>
                Data Privacy &amp; Policy
              </PolicyLink>
            </div>
            {errPrivacy ? (
              <span className={`${fieldErrClass}${isEvent ? " visible" : ""}`}>
                {typeof errPrivacy === "string" ? errPrivacy : "Please agree to the Data Privacy Policy."}
              </span>
            ) : null}
          </li>

          <li className="ta-agreement-item">
            <div className="ta-agreement-line">
              <label className={`${checkboxClass}${errStay ? (isEvent ? " ev-check-error" : " check-error") : ""}`}>
                <input type="checkbox" checked={!!stayChecked} onChange={onStayChange} />
                <span className="ta-agreement-text">I have read and agree to the</span>
              </label>
              <PolicyLink policyId="stay" onViewed={onPolicyViewed}>
                Terms &amp; Conditions of Stay
              </PolicyLink>
            </div>
            {errStay ? (
              <span className={`${fieldErrClass}${isEvent ? " visible" : ""}`}>
                {typeof errStay === "string" ? errStay : "Please agree to the Terms & Conditions of Stay."}
              </span>
            ) : null}
          </li>
        </ul>
      </section>
    </div>
  );
}
