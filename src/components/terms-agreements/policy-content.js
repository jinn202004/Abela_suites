/** Policy copy for modal display — keyed by `data-ta-policy` values. */
export const POLICY_CONTENT = {
  terms: {
    title: "Terms and Conditions",
    html: `
      <ol>
        <li><strong>Valid ID Requirement</strong>
          <ul>
            <li>A clear photo or scanned copy of a valid government-issued ID must be uploaded with your reservation request.</li>
            <li>The reservation name must match the name on the ID.</li>
          </ul>
        </li>
        <li><strong>Verification &amp; Confirmation</strong>
          <ul>
            <li>All guests are required to present a valid government-issued ID upon check-in.</li>
            <li>Failure to provide valid identification may result in denial of entry.</li>
            <li>The management reserves the right to verify the authenticity of submitted identification documents.</li>
            <li>All reservation requests are subject to approval after ID verification.</li>
          </ul>
        </li>
        <li><strong>Reservations &amp; Payments</strong>
          <ul>
            <li>Rates, taxes, and fees quoted at booking are subject to applicable local charges.</li>
            <li>Confirmed reservations may require a deposit or full prepayment as indicated during checkout.</li>
            <li>Promotional rates are non-transferable unless expressly stated in writing by the property.</li>
          </ul>
        </li>
        <li><strong>Cancellations &amp; Modifications</strong>
          <ul>
            <li>Cancellation and change policies vary by rate plan and season; refer to your confirmation email.</li>
            <li>No-shows may be charged the full stay or one night&apos;s rate, whichever is greater per property policy.</li>
          </ul>
        </li>
        <li><strong>Conduct</strong>
          <ul>
            <li>Guests must comply with house rules, quiet hours, and safety guidelines while on property.</li>
            <li>The hotel may refuse service or terminate a stay for disruptive or unlawful behavior without refund where permitted by law.</li>
          </ul>
        </li>
      </ol>
    `,
  },
  privacy: {
    title: "Data Privacy & Policy",
    html: `
      <p>We respect your privacy and are committed to protecting personal information collected during your stay and booking process.</p>
      <ol>
        <li><strong>Information We Collect</strong>
          <ul>
            <li>Contact details (name, email, phone), government ID references, payment references, and stay preferences.</li>
            <li>Technical data such as device type and booking timestamps when you use our online channels.</li>
          </ul>
        </li>
        <li><strong>How We Use Your Data</strong>
          <ul>
            <li>To process reservations, verify identity, facilitate check-in, and provide guest services.</li>
            <li>To communicate booking updates, security notices, and lawful marketing where you have opted in.</li>
          </ul>
        </li>
        <li><strong>Sharing &amp; Retention</strong>
          <ul>
            <li>Data is shared only with authorized staff, payment processors, and regulators when required by law.</li>
            <li>Records are retained only as long as necessary for operations, accounting, and legal compliance.</li>
          </ul>
        </li>
        <li><strong>Your Rights</strong>
          <ul>
            <li>You may request access, correction, or deletion of personal data subject to applicable privacy laws.</li>
            <li>Contact the front desk or data protection officer listed on your confirmation for privacy inquiries.</li>
          </ul>
        </li>
      </ol>
    `,
  },
  stay: {
    title: "Terms & Conditions of Stay",
    html: `
      <ol>
        <li><strong>Check-In &amp; Check-Out</strong>
          <ul>
            <li>Standard check-in begins at 2:00 PM; check-out is at 12:00 PM unless late checkout is pre-approved.</li>
            <li>Early arrival and late departure are accommodated when availability permits and may incur fees.</li>
          </ul>
        </li>
        <li><strong>Occupancy &amp; Visitors</strong>
          <ul>
            <li>Maximum occupancy per room type must not be exceeded; additional guests may require fees or room change.</li>
            <li>Visitors must register at the front desk; overnight guests not on the reservation may be declined.</li>
          </ul>
        </li>
        <li><strong>Property &amp; Amenities</strong>
          <ul>
            <li>Guests are responsible for any damage to room furnishings, linens, or hotel equipment.</li>
            <li>Pool, spa, and fitness facilities may have separate schedules and dress or age requirements.</li>
          </ul>
        </li>
        <li><strong>Smoking &amp; Pets</strong>
          <ul>
            <li>Designated non-smoking rooms apply cleaning fees for violations per posted hotel policy.</li>
            <li>Only registered service animals are permitted unless a pet-friendly room category was booked.</li>
          </ul>
        </li>
        <li><strong>Valuables &amp; Liability</strong>
          <ul>
            <li>In-room safes are provided; the hotel is not liable for unattended valuables except as required by law.</li>
            <li>Report lost items promptly; unclaimed articles may be disposed of after the posted holding period.</li>
          </ul>
        </li>
      </ol>
    `,
  },
};
