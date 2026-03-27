import { useEffect, useMemo, useState } from 'react'
import { fetchEventVenues } from '../api/guestApi'
import EventBookingModal from './EventBookingModal'
import GuestHeader from './GuestHeader'
import GuestEventVenueDetailModal from './GuestEventVenueDetailModal'
import { GUEST_EVENT_VENUES } from './guestEventVenuesData'
import { venueAmenitiesList, venueDescriptionText, venueLocationText, venuePriceRaw } from './venueFields'
import './GuestEventVenuesPage.css'

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

export default function GuestEventVenuesPage() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [fromApi, setFromApi] = useState(false)
  const [detailVenue, setDetailVenue] = useState(null)
  const [bookingVenue, setBookingVenue] = useState(null)
  const [bookingNotice, setBookingNotice] = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchEventVenues()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setVenues(data)
          setFromApi(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setVenues(GUEST_EVENT_VENUES)
          setFromApi(false)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const sortedVenues = useMemo(
    () =>
      [...venues].sort((a, b) =>
        String(a.name ?? '').localeCompare(String(b.name ?? ''), undefined, { sensitivity: 'base' }),
      ),
    [venues],
  )

  const openDetail = (venue) => setDetailVenue(venue)
  const closeDetail = () => setDetailVenue(null)

  const openBook = (venue) => {
    setDetailVenue(null)
    setBookingVenue(venue)
  }

  const closeBook = () => setBookingVenue(null)

  const handleBookingSuccess = () => {
    setBookingNotice('Your event booking request was submitted.')
  }

  useEffect(() => {
    if (!bookingNotice) return
    const t = window.setTimeout(() => setBookingNotice(null), 8000)
    return () => window.clearTimeout(t)
  }, [bookingNotice])

  const handleCardKeyDown = (e, venue) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      openDetail(venue)
    }
  }

  return (
    <>
      <GuestEventVenueDetailModal venue={detailVenue} onClose={closeDetail} onBook={openBook} />
      <EventBookingModal
        isOpen={Boolean(bookingVenue)}
        onClose={closeBook}
        venue={bookingVenue}
        onSuccess={handleBookingSuccess}
      />
      <GuestHeader />
      <div className="guest-events-page">
        <section className="guest-events__intro" aria-labelledby="guest-events-heading">
          <h1 id="guest-events-heading" className="guest-events__title">
            Event venues
          </h1>
          <p className="guest-events__lead">
            Explore our function spaces for celebrations, meetings, and special occasions. Capacity and rates are shown
            for each venue.
          </p>
        </section>

        <main className="guest-events__main">
          {loading && (
            <p className="guest-events__status" role="status">
              Loading venues…
            </p>
          )}

          {bookingNotice && (
            <p className="guest-events__booking-notice" role="status">
              {bookingNotice}
            </p>
          )}

          {!loading && !fromApi && (
            <p className="guest-events__status guest-events__status--warn" role="status">
              <strong>API offline.</strong> You&apos;re seeing sample venues — not venues or fields saved in admin.
              Run <code className="guest-events__code">npm run api</code> or{' '}
              <code className="guest-events__code">npm run dev:full</code> so this page loads your real event venues
              (including location, price, and inclusions).
            </p>
          )}

          {!loading && sortedVenues.length > 0 && (
            <ul className="guest-events__list" id="guest-events-list">
              {sortedVenues.map((venue) => {
                const pax = formatPax(venue)
                const priceLabel = formatVenuePrice(venue)
                const locationText = venueLocationText(venue)
                const descText = venueDescriptionText(venue)
                const amenities = venueAmenitiesList(venue)
                return (
                  <li key={venue.id}>
                    <article
                      className="guest-events__card guest-events__card--clickable"
                      role="button"
                      tabIndex={0}
                      onClick={() => openDetail(venue)}
                      onKeyDown={(e) => handleCardKeyDown(e, venue)}
                      aria-label={`View details for ${venue.name || 'venue'}`}
                    >
                      <div className="guest-events__card-media">
                        {venue.image ? (
                          <img src={venue.image} alt="" loading="lazy" />
                        ) : (
                          <div className="guest-events__card-media-placeholder" aria-hidden />
                        )}
                      </div>
                      <div className="guest-events__card-body">
                        <h2 className="guest-events__card-title">{venue.name || 'Venue'}</h2>
                        <p className="guest-events__card-location">
                          <span className="guest-events__field-label">Location</span>
                          <span className="guest-events__field-value">{locationText || '—'}</span>
                        </p>
                        <div className="guest-events__card-meta-row">
                          {pax != null && (
                            <p className="guest-events__card-meta">
                              <IconUsers />
                              <span>
                                Up to <strong>{pax}</strong> pax
                              </span>
                            </p>
                          )}
                          {priceLabel && (
                            <p className="guest-events__card-price">
                              <span className="guest-events__price-value">{priceLabel}</span>
                              <span className="guest-events__price-hint"> starting rate</span>
                            </p>
                          )}
                        </div>
                        {descText !== '' && <p className="guest-events__card-desc">{descText}</p>}
                        {amenities.length > 0 && (
                          <div className="guest-events__inclusions">
                            <h3 className="guest-events__inclusions-label">Inclusions</h3>
                            <ul className="guest-events__features">
                              {amenities.map((f) => (
                                <li key={f} className="guest-events__feature">
                                  <IconCheck />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && sortedVenues.length === 0 && (
            <p className="guest-events__empty">No event venues are listed yet. Please check back soon.</p>
          )}
        </main>
      </div>
    </>
  )
}

function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="guest-events__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
