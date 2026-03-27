import { useEffect, useId, useRef, useState } from 'react'
import { createEventBooking, createNotification } from '../api/guestApi'
import { dispatchNotificationsRefresh, formatNotificationDate } from './notificationFeed'
import { buildGuestEventSubmittedMessage, buildStaffNewEventMessage } from './reservationNotificationMessages'
import ModalFrame from '../components/ModalFrame'
import { venuePriceRaw } from './venueFields'
import './RoomReservationModal.css'

const PH_LOCAL_REGEX = /^9\d{9}$/

function digitsOnly(value) {
  return String(value).replace(/\D/g, '').slice(0, 10)
}

function isValidPhMobileLocal(local) {
  return PH_LOCAL_REGEX.test(local)
}

function formatPaxCap(venue) {
  if (venue == null) return null
  const n = Number(venue.capacity)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  return null
}

/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {{ id?: string | number, name?: string } | null} venue
 * @param {string} [initialEventDate]
 * @param {function} [onSuccess]
 */
export default function EventBookingModal({ isOpen, onClose, venue, initialEventDate = '', onSuccess }) {
  const titleId = useId()
  const formRef = useRef(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')

  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    formRef.current?.reset()
    setSubmitError('')
    setPhoneLocal('')
    const idFrame = requestAnimationFrame(() => {
      const form = formRef.current
      if (!form || !initialEventDate) return
      const el = form.elements
      const d = el.namedItem('eventDate')
      if (d) /** @type {HTMLInputElement} */ (d).value = initialEventDate
    })
    return () => cancelAnimationFrame(idFrame)
  }, [isOpen, venue?.id, initialEventDate])

  const localDigits = digitsOnly(phoneLocal)
  const phoneInvalidLive = localDigits.length > 0 && !isValidPhMobileLocal(localDigits)
  const paxCap = formatPaxCap(venue)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    const local = digitsOnly(phoneLocal)
    if (!isValidPhMobileLocal(local)) {
      document.getElementById('event-book-phone-input')?.focus()
      return
    }
    const form = e.currentTarget
    const fd = new FormData(form)
    const eventDate = String(fd.get('eventDate') ?? '')
    const eventEndDate = String(fd.get('eventEndDate') ?? '')
    const expectedPax = Math.max(1, Math.floor(Number(fd.get('expectedPax')) || 1))
    if (paxCap != null && expectedPax > paxCap) {
      setSubmitError(`Expected guests cannot exceed the venue capacity (${paxCap} pax).`)
      return
    }
    const priceSnap = venuePriceRaw(venue)
    const venueName = String(venue?.name ?? '').trim() || null
    const payload = {
      eventVenueId: venue?.id != null ? String(venue.id) : '',
      venueName,
      venuePrice: priceSnap != null && String(priceSnap).trim() !== '' ? String(priceSnap).trim() : null,
      customerName: String(fd.get('customerName') ?? ''),
      email: String(fd.get('email') ?? ''),
      contactNumber: `+63${local}`,
      address: String(fd.get('address') ?? ''),
      eventTitle: String(fd.get('eventTitle') ?? '').trim(),
      eventDate,
      eventEndDate: eventEndDate.trim() !== '' ? eventEndDate : null,
      expectedPax,
      additionalRequests: String(fd.get('additionalRequests') ?? ''),
      status: 'pending',
      createdAt: new Date().toISOString(),
    }
    setSubmitting(true)
    try {
      await createEventBooking(payload)
      const notifPayload = {
        customerName: payload.customerName,
        venueName: venueName ?? undefined,
        eventDate: payload.eventDate,
      }
      try {
        await createNotification({
          message: buildGuestEventSubmittedMessage(notifPayload),
          audience: 'guest',
          date: formatNotificationDate(),
        })
        await createNotification({
          message: buildStaffNewEventMessage(notifPayload),
          audience: 'staff',
          date: formatNotificationDate(),
        })
      } catch {
        /* notification failure should not block booking */
      }
      dispatchNotificationsRefresh()
      onClose()
      onSuccess?.()
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('guest-event-booking-created'))
      }
    } catch {
      setSubmitError('Could not save booking. Start the mock API with npm run api (or npm run dev:full).')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !venue) return null

  const venueLabel = venue.name?.trim() || 'Venue'

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} panelClassName="room-reservation-modal" ariaLabelledBy={titleId}>
      <div className="room-reservation-modal__head">
        <h2 id={titleId} className="room-reservation-modal__title">
          Book event
        </h2>
        <button type="button" className="room-reservation-modal__close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
      </div>

      <p className="room-reservation-modal__room-name">{venueLabel}</p>

      <form ref={formRef} className="room-reservation-modal__form" onSubmit={handleSubmit} noValidate>
        <input type="hidden" name="eventVenueId" value={venue.id ?? ''} />

        <div className="room-reservation-modal__grid">
          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Event title</span>
            <input className="room-reservation-modal__input" type="text" name="eventTitle" placeholder="e.g. Company anniversary" />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Customer name</span>
            <input className="room-reservation-modal__input" type="text" name="customerName" autoComplete="name" required />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Email</span>
            <input className="room-reservation-modal__input" type="email" name="email" autoComplete="email" required />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label" id="event-book-phone-label">
              Contact number
            </span>
            <div className="room-reservation-modal__phone-row">
              <span className="room-reservation-modal__phone-prefix">+63</span>
              <input
                id="event-book-phone-input"
                className="room-reservation-modal__input room-reservation-modal__input--phone"
                type="tel"
                name="phoneLocal"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="9XX XXX XXXX"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(digitsOnly(e.target.value))}
                aria-invalid={phoneInvalidLive}
                aria-describedby={phoneInvalidLive ? 'event-book-phone-status' : undefined}
              />
            </div>
            {phoneInvalidLive && (
              <p
                id="event-book-phone-status"
                className="room-reservation-modal__phone-warning"
                role="status"
                aria-live="polite"
              >
                Invalid number
              </p>
            )}
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Address</span>
            <input className="room-reservation-modal__input" type="text" name="address" autoComplete="street-address" />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Event date</span>
            <span className="room-reservation-modal__input-with-icon">
              <input className="room-reservation-modal__input" type="date" name="eventDate" required />
              <span className="room-reservation-modal__input-icon" aria-hidden>
                <IconCalendar />
              </span>
            </span>
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">End date (optional)</span>
            <span className="room-reservation-modal__input-with-icon">
              <input className="room-reservation-modal__input" type="date" name="eventEndDate" />
              <span className="room-reservation-modal__input-icon" aria-hidden>
                <IconCalendar />
              </span>
            </span>
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Expected guests (pax)</span>
            <input
              className="room-reservation-modal__input"
              type="number"
              name="expectedPax"
              min={1}
              max={paxCap != null ? paxCap : 50000}
              step={1}
              defaultValue={1}
              inputMode="numeric"
              required
            />
            {paxCap != null && (
              <span className="room-reservation-modal__hint">Maximum for this venue: {paxCap} pax</span>
            )}
          </label>

          <label className="room-reservation-modal__field room-reservation-modal__field--full">
            <span className="room-reservation-modal__label">Additional requests</span>
            <textarea className="room-reservation-modal__textarea" name="additionalRequests" rows={4} />
          </label>
        </div>

        {submitError && (
          <p className="room-reservation-modal__error" role="alert">
            {submitError}
          </p>
        )}

        <div className="room-reservation-modal__actions">
          <button type="submit" className="room-reservation-modal__submit" disabled={submitting}>
            {submitting ? 'Saving…' : 'Submit booking'}
          </button>
        </div>
      </form>
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

function IconCalendar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  )
}
