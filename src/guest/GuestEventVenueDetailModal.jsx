import { useEffect, useId } from 'react'
import ModalFrame from '../components/ModalFrame'
import { venueAmenitiesList, venueDescriptionText, venueLocationText, venuePriceRaw } from './venueFields'

function formatPax(venue) {
  if (venue == null) return null
  const n = Number(venue.capacity)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  if (venue.limit != null && String(venue.limit).trim() !== '') {
    const nums = String(venue.limit).match(/\d+/g)
    if (nums?.length) return Math.max(...nums.map(Number))
  }
  return null
}

function formatPriceDisplay(price) {
  if (price == null || String(price).trim() === '') return null
  const t = String(price).trim()
  return t.startsWith('₱') ? t : `₱${t}`
}

function formatVenuePrice(venue) {
  return formatPriceDisplay(venuePriceRaw(venue))
}

/**
 * @param {{ id?: string | number } | null} venue — when null, modal is closed
 * @param {function} onClose
 * @param {function} [onBook] — called with venue when user taps Book
 */
export default function GuestEventVenueDetailModal({ venue, onClose, onBook }) {
  const titleId = useId()

  useEffect(() => {
    if (!venue) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [venue])

  if (!venue) return null

  const pax = formatPax(venue)
  const priceLabel = formatVenuePrice(venue)
  const amenities = venueAmenitiesList(venue)
  const locationText = venueLocationText(venue)
  const descriptionText = venueDescriptionText(venue)
  const name = venue.name?.trim() || 'Venue'

  return (
    <ModalFrame
      isOpen
      onClose={onClose}
      panelClassName={`guest-event-venue-modal${onBook ? ' guest-event-venue-modal--bookable' : ''}`}
      ariaLabelledBy={titleId}
    >
      <div className="guest-event-venue-modal__head">
        <h2 id={titleId} className="guest-event-venue-modal__title">
          {name}
        </h2>
        <button type="button" className="guest-event-venue-modal__close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
      </div>

      <div className="guest-event-venue-modal__scroll">
        <div className="guest-event-venue-modal__media">
          {venue.image ? (
            <img src={venue.image} alt="" className="guest-event-venue-modal__img" />
          ) : (
            <div className="guest-event-venue-modal__media-placeholder" aria-hidden />
          )}
        </div>

        <div className="guest-event-venue-modal__meta">
          <div className="guest-event-venue-modal__section guest-event-venue-modal__section--compact">
            <h3 className="guest-event-venue-modal__section-title">Location</h3>
            <p className="guest-event-venue-modal__desc guest-event-venue-modal__desc--plain">{locationText || '—'}</p>
          </div>
          <div className="guest-event-venue-modal__meta-row">
            {pax != null ? (
              <p className="guest-event-venue-modal__stat">
                <IconUsers />
                <span>
                  Up to <strong>{pax}</strong> pax
                </span>
              </p>
            ) : (
              <p className="guest-event-venue-modal__stat guest-event-venue-modal__muted">Pax: —</p>
            )}
            {priceLabel ? (
              <p className="guest-event-venue-modal__price">
                <span className="guest-event-venue-modal__price-value">{priceLabel}</span>
                <span className="guest-event-venue-modal__price-hint"> starting rate</span>
              </p>
            ) : (
              <p className="guest-event-venue-modal__muted">Price: —</p>
            )}
          </div>
        </div>

        <div className="guest-event-venue-modal__section">
          <h3 className="guest-event-venue-modal__section-title">About this venue</h3>
          <p className="guest-event-venue-modal__desc">{descriptionText || '—'}</p>
        </div>

        <div className="guest-event-venue-modal__section">
          <h3 className="guest-event-venue-modal__section-title">Inclusions</h3>
          {amenities.length > 0 ? (
            <ul className="guest-event-venue-modal__features">
              {amenities.map((f) => (
                <li key={f} className="guest-event-venue-modal__feature">
                  <IconCheck />
                  {f}
                </li>
              ))}
            </ul>
          ) : (
            <p className="guest-event-venue-modal__desc guest-event-venue-modal__muted">—</p>
          )}
        </div>
      </div>

      {onBook && (
        <div className="guest-event-venue-modal__footer">
          <button type="button" className="guest-event-venue-modal__book" onClick={() => onBook(venue)}>
            Book this venue
          </button>
        </div>
      )}
    </ModalFrame>
  )
}

function IconClose() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
    </svg>
  )
}

function IconUsers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="guest-event-venue-modal__check" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
