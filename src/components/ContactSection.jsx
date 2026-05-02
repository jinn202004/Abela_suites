import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ContactSection.css'

const MAP_EMBED_SRC =
  'https://www.openstreetmap.org/export/embed.html?bbox=124.88%2C8.71%2C124.99%2C8.78&layer=mapnik&marker=8.7442%2C124.9419'

const DIRECTIONS_URL =
  'https://www.google.com/maps/search/?api=1&query=Balingasag%2C+Misamis+Oriental+Philippines'

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
  )
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
  )
}

function IconMail() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M22 6l-10 7L2 6" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="contact-us__row-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.5V12l3.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconExternal() {
  return (
    <svg className="contact-us__ext-icon" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M18 13v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15 3h6v6M10 14L21 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconChevron() {
  return (
    <span className="contact-us__chevron" aria-hidden>
      &gt;
    </span>
  )
}

export default function ContactSection({
  businessName = 'Abela Suites',
  addressLine = 'Balingasag, Misamis Oriental',
  phone = '09123456789',
  email = 'info@abelasuites.com',
}) {
  const [popupOpen, setPopupOpen] = useState(true)

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
          <div className="contact-us__map-col">
            <div className="contact-us__map-frame">
              <iframe
                title={`Map showing ${businessName}`}
                className="contact-us__map"
                src={MAP_EMBED_SRC}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
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

          <aside className="contact-us__sidebar" aria-label="Contact details and links">
            <div className="contact-us__card contact-us__card--elevated">
              <span className="contact-us__card-kicker">Get In Touch</span>
              <h3 className="contact-us__card-title">Contact Information</h3>

              <div className="contact-us__divider" />

              <div className="contact-us__row">
                <IconPin />
                <div>
                  <p className="contact-us__label">Address</p>
                  <p className="contact-us__value">{addressLine}</p>
                  <a
                    href={DIRECTIONS_URL}
                    className="contact-us__link-green"
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
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className="contact-us__value contact-us__value--link">
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
                  <p className="contact-us__muted">Front Desk Available Round the Clock</p>
                </div>
              </div>
            </div>

            <div className="contact-us__card contact-us__card--mint">
              <span className="contact-us__card-kicker contact-us__card-kicker--muted">Quick Links</span>
              <ul className="contact-us__quick-list">
                <li>
                  <a href="/#services" className="contact-us__quick-link">
                    <IconChevron />
                    View Our Services
                  </a>
                </li>
                <li>
                  <Link to="/guest-room" className="contact-us__quick-link">
                    <IconChevron />
                    Book a Room
                  </Link>
                </li>
                <li>
                  <Link to="/guest-events" className="contact-us__quick-link">
                    <IconChevron />
                    Book an Event
                  </Link>
                </li>
              </ul>
            </div>

            <div className="contact-us__card contact-us__card--elevated">
              <span className="contact-us__card-kicker contact-us__card-kicker--muted">Follow Us</span>
              <div className="contact-us__social">
                <a
                  href="https://www.facebook.com/"
                  className="contact-us__social-btn contact-us__social-btn--fb"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Facebook"
                >
                  <span className="contact-us__social-f">f</span>
                </a>
                <a
                  href="https://www.instagram.com/"
                  className="contact-us__social-btn contact-us__social-btn--ig"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Instagram"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="17" cy="7" r="1.2" fill="currentColor" />
                  </svg>
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  )
}
