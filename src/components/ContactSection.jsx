import { useState } from "react";
import {
  ABELA_CONTACT,
  buildMapEmbedSrc,
  GOOGLE_MAPS_DIRECTIONS_URL,
  FACEBOOK_PAGES,
} from "../config/contactConfig";
import "./ContactSection.css";

function IconPin() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.2" fill="currentColor" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.63 2.6a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.48-1.2a2 2 0 0 1 2.11-.45c.83.3 1.7.51 2.6.63A2 2 0 0 1 22 16.92z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconMail() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg className="contact-us__ext-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

export default function ContactSection({
  businessName = ABELA_CONTACT.businessName,
  addressLine = ABELA_CONTACT.addressLine,
  addressDetail = ABELA_CONTACT.addressDetail,
  phone = ABELA_CONTACT.phone,
  email = ABELA_CONTACT.email,
} = {}) {
  const [popupOpen, setPopupOpen] = useState(true);
  const facebook = FACEBOOK_PAGES[0];
  const mapSrc = buildMapEmbedSrc();

  return (
    <section className="contact-us-section" id="contact" aria-labelledby="contact-us-heading">
      <div className="contact-us__inner">
        <header className="contact-us__header">
          <span className="contact-us__eyebrow">Get In Touch</span>
          <h2 id="contact-us-heading" className="contact-us__title">
            Contact Us
          </h2>
          <div className="contact-us__ornament" aria-hidden>
            <span className="contact-us__ornament-line" />
            <span className="contact-us__ornament-diamond" />
            <span className="contact-us__ornament-line" />
          </div>
        </header>

        <div className="contact-us__grid">
          <aside className="contact-us__sidebar" aria-label="Contact details">
            <div className="contact-us__card">
              <span className="contact-us__card-kicker">Get In Touch</span>
              <h3 className="contact-us__card-title">Contact Information</h3>

              <div className="contact-us__divider" />

              <div className="contact-us__row">
                <IconPin />
                <div>
                  <p className="contact-us__label">Address</p>
                  <p className="contact-us__value">{addressLine}</p>
                  {addressDetail ? <p className="contact-us__muted">{addressDetail}</p> : null}
                  <a
                    href={GOOGLE_MAPS_DIRECTIONS_URL}
                    className="contact-us__link-action"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Get Directions
                    <IconExternal />
                  </a>
                </div>
              </div>

              <div className="contact-us__divider" />

              <div className="contact-us__row">
                <IconPhone />
                <div>
                  <p className="contact-us__label">Phone</p>
                  <a href={`tel:${phone.replace(/\s/g, "")}`} className="contact-us__value contact-us__value--link">
                    {phone}
                  </a>
                </div>
              </div>

              <div className="contact-us__divider" />

              <div className="contact-us__row">
                <IconMail />
                <div>
                  <p className="contact-us__label">Email</p>
                  <a href={`mailto:${email}`} className="contact-us__value contact-us__value--link">
                    {email}
                  </a>
                </div>
              </div>

              <div className="contact-us__divider" />

              <div className="contact-us__row">
                <IconClock />
                <div>
                  <p className="contact-us__label">Business Hours</p>
                  <p className="contact-us__value">Monday – Sunday: 24/7</p>
                  <p className="contact-us__muted">Front desk available round the clock</p>
                </div>
              </div>

              {facebook ? (
                <>
                  <div className="contact-us__divider" />
                  <a
                    href={facebook.href}
                    className="contact-us__facebook"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="contact-us__facebook-icon" aria-hidden>
                      <IconFacebook />
                    </span>
                    <span className="contact-us__facebook-text">
                      <span className="contact-us__facebook-label">Facebook</span>
                      <span className="contact-us__facebook-sub">{facebook.label}</span>
                    </span>
                    <IconExternal />
                  </a>
                </>
              ) : null}
            </div>
          </aside>

          <div className="contact-us__map-col">
            <div className="contact-us__map-frame">
              <iframe
                title={`Map showing ${businessName}`}
                className="contact-us__map"
                src={mapSrc}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              {popupOpen ? (
                <div className="contact-us__map-popup" role="status">
                  <button
                    type="button"
                    className="contact-us__popup-close"
                    onClick={() => setPopupOpen(false)}
                    aria-label="Close location card"
                  >
                    ×
                  </button>
                  <p className="contact-us__popup-name">{businessName}</p>
                  <p className="contact-us__popup-addr">{addressLine}</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
