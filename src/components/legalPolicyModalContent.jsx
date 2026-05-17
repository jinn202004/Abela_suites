/**
 * Exact hotel policy copy for Terms & Conditions and Privacy Policy modals.
 * Do not change wording.
 */

export function TermsPolicyBody() {
  return (
    <>
      <h2 className="legal-policy-modal__h2">Check-In and Check-Out</h2>
      <ul className="legal-policy-modal__ul">
        <li>
          Standard Check-in Time: <strong>2:00 PM</strong>
        </li>
        <li>
          Standard Check-out Time: <strong>12:00 NN</strong>
        </li>
        <li>Early check-in or late check-out is subject to availability and may incur additional charges.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Reservation and Payment</h2>
      <ul className="legal-policy-modal__ul">
        <li>Reservations are confirmed only after successful payment or booking approval.</li>
        <li>Guests must provide accurate booking information.</li>
        <li>The hotel reserves the right to cancel fraudulent or incomplete reservations.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Cancellation and Refund Policy</h2>
      <ul className="legal-policy-modal__ul">
        <li>Cancellation and refund requests are subject to hotel policies.</li>
        <li>Refund processing times may vary depending on the payment method used.</li>
        <li>
          Bookings paid through <strong>GCash</strong> are strictly <strong>non-refundable</strong> once the payment has
          been confirmed.
        </li>
        <li>Guests are advised to review their booking details carefully before completing payment.</li>
        <li>Refund exceptions, if any, are subject to hotel management approval.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Identification Upon Arrival</h2>
      <ul className="legal-policy-modal__ul">
        <li>Guests must present the same valid ID used during the online reservation.</li>
        <li>Failure to provide proper identification may result in denied check-in without refund.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Guest Conduct</h2>
      <ul className="legal-policy-modal__ul">
        <li>Guests must respect other guests and hotel staff at all times.</li>
        <li>Excessive noise, illegal activities, violence, and disruptive behavior are strictly prohibited.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Occupancy Policy</h2>
      <ul className="legal-policy-modal__ul">
        <li>Only registered guests are allowed to stay overnight.</li>
        <li>Additional persons may incur extra charges.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Visitors Policy</h2>
      <ul className="legal-policy-modal__ul">
        <li>Visitors may be required to register at the front desk.</li>
        <li>The hotel reserves the right to limit visitor access for safety and security purposes.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Damage and Loss</h2>
      <ul className="legal-policy-modal__ul">
        <li>Guests are responsible for any damage to hotel property.</li>
        <li>Repair or replacement costs will be charged accordingly.</li>
        <li>The hotel is not liable for lost, stolen, or unattended personal belongings.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Non-Smoking Policy</h2>
      <ul className="legal-policy-modal__ul">
        <li>Smoking is strictly prohibited in non-designated areas.</li>
        <li>Violations may result in penalties or cleaning fees.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Prohibited Activities</h2>
      <ul className="legal-policy-modal__ul">
        <li>
          Possession of illegal substances, weapons, or involvement in unlawful activities is strictly prohibited within
          hotel premises.
        </li>
      </ul>

      <h2 className="legal-policy-modal__h2">Pets Policy</h2>
      <ul className="legal-policy-modal__ul">
        <li>Pets are only allowed in designated pet-friendly areas or rooms, if applicable.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Force Majeure</h2>
      <ul className="legal-policy-modal__ul">
        <li>
          The hotel shall not be held responsible for delays, cancellations, or service interruptions caused by natural
          disasters, emergencies, power outages, or events beyond its control.
        </li>
      </ul>
    </>
  );
}

export function PrivacyPolicyBody() {
  return (
    <>
      <h2 className="legal-policy-modal__h2">Information We Collect</h2>
      <p className="legal-policy-modal__p">We may collect the following information:</p>
      <ul className="legal-policy-modal__ul">
        <li>Full name</li>
        <li>Contact number and email address</li>
        <li>Valid government-issued ID</li>
        <li>Reservation and payment details</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Purpose of Data Collection</h2>
      <p className="legal-policy-modal__p">Collected information is used for:</p>
      <ul className="legal-policy-modal__ul">
        <li>Reservation processing</li>
        <li>Identity verification</li>
        <li>Billing and payment confirmation</li>
        <li>Customer support and communication</li>
        <li>Security and safety purposes</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Data Protection</h2>
      <ul className="legal-policy-modal__ul">
        <li>All personal information is securely stored and accessible only to authorized personnel.</li>
        <li>Information will not be shared with unauthorized third parties unless required by law.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Data Sharing</h2>
      <ul className="legal-policy-modal__ul">
        <li>Personal information may only be shared with trusted payment providers or legal authorities when necessary.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Data Retention</h2>
      <ul className="legal-policy-modal__ul">
        <li>Personal data will be retained only as long as necessary for business and legal purposes.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">User Rights</h2>
      <ul className="legal-policy-modal__ul">
        <li>
          Guests may request access, correction, or deletion of their personal information, subject to applicable laws and
          hotel policies.
        </li>
      </ul>

      <h2 className="legal-policy-modal__h2">Cookies and Website Usage</h2>
      <ul className="legal-policy-modal__ul">
        <li>The website may use cookies and analytics tools to improve user experience and system performance.</li>
      </ul>

      <h2 className="legal-policy-modal__h2">Security Measures</h2>
      <ul className="legal-policy-modal__ul">
        <li>
          The hotel implements reasonable technical and organizational measures to protect user data from unauthorized
          access, loss, or misuse.
        </li>
      </ul>

      <h2 className="legal-policy-modal__h2">Policy Updates</h2>
      <ul className="legal-policy-modal__ul">
        <li>The hotel reserves the right to update or modify this Privacy Policy at any time.</li>
        <li>Continued use of the system indicates acceptance of the updated policy.</li>
      </ul>
    </>
  );
}
