import { useEffect, useId, useState } from 'react'
import ModalFrame from '../components/ModalFrame'
import { createNotification, updateEventBooking } from '../api/guestApi'
import { dispatchNotificationsRefresh, formatNotificationDate } from '../guest/notificationFeed'
import {
  buildGuestEventApprovedMessage,
  buildGuestEventDeclinedMessage,
  buildStaffEventOutcomeMessage,
} from '../guest/reservationNotificationMessages'
import { formatRoomReservationStatusLabel, normalizeRoomReservationStatus } from '../guest/roomReservationStatus'
import '../components/LoginModal.css'
import './FrontDeskReservationModal.css'

function formatPeso(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function proofDataUrlKind(url) {
  if (typeof url !== 'string') return null
  const s = url.trim()
  if (s.length < 12) return null
  if (/^data:image\//i.test(s)) return 'image'
  if (/^data:application\/pdf/i.test(s)) return 'pdf'
  return 'other'
}

function getEventTotalRaw(b) {
  const raw = b.totalAmount ?? b.totalEventAmount ?? b.venuePrice
  if (raw == null || String(raw).trim() === '') return null
  const n = parseFloat(String(raw).replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function formatEventDates(start, end) {
  if (!start && !end) return '—'
  const s = start != null ? String(start).slice(0, 10) : ''
  const e = end != null ? String(end).slice(0, 10) : ''
  if (s && e && s !== e) return `${s} → ${e}`
  return s || e || '—'
}

/**
 * @param {'view' | 'review'} mode
 * @param {object | null} booking
 * @param {object[]} venues
 */
export default function FrontDeskEventReservationModal({ mode, booking, venues, isOpen, onClose, onUpdated }) {
  const titleId = useId()
  const errId = useId()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const [form, setForm] = useState({
    eventVenueId: '',
    venueName: '',
    customerName: '',
    email: '',
    contactNumber: '',
    address: '',
    eventTitle: '',
    eventDate: '',
    eventEndDate: '',
    expectedPax: 1,
    additionalRequests: '',
    totalAmount: '',
    paymentAmount: '',
    paymentDate: '',
    paymentTransactionId: '',
    paymentType: '',
  })

  useEffect(() => {
    if (!isOpen || !booking) return
    setError('')
    const total = getEventTotalRaw(booking)
    setForm({
      eventVenueId: booking.eventVenueId != null ? String(booking.eventVenueId) : '',
      venueName: typeof booking.venueName === 'string' ? booking.venueName : '',
      customerName: typeof booking.customerName === 'string' ? booking.customerName : '',
      email: typeof booking.email === 'string' ? booking.email : '',
      contactNumber: typeof booking.contactNumber === 'string' ? booking.contactNumber : '',
      address: typeof booking.address === 'string' ? booking.address : '',
      eventTitle: typeof booking.eventTitle === 'string' ? booking.eventTitle : '',
      eventDate: booking.eventDate != null ? String(booking.eventDate).slice(0, 10) : '',
      eventEndDate: booking.eventEndDate != null ? String(booking.eventEndDate).slice(0, 10) : '',
      expectedPax: Number(booking.expectedPax) > 0 ? Math.floor(Number(booking.expectedPax)) : 1,
      additionalRequests: typeof booking.additionalRequests === 'string' ? booking.additionalRequests : '',
      totalAmount: total != null ? String(total) : '',
      paymentAmount:
        booking.paymentAmount != null && Number.isFinite(Number(booking.paymentAmount))
          ? String(booking.paymentAmount)
          : '',
      paymentDate: booking.paymentDate != null ? String(booking.paymentDate).slice(0, 10) : '',
      paymentTransactionId:
        typeof booking.paymentTransactionId === 'string' ? booking.paymentTransactionId : '',
      paymentType: typeof booking.paymentType === 'string' ? booking.paymentType : '',
    })
  }, [isOpen, booking])

  useEffect(() => {
    if (!isOpen || !booking) return
    setDeclineOpen(false)
    setDeclineReason('')
  }, [isOpen, booking?.id])

  if (!booking) return null

  const statusKey = normalizeRoomReservationStatus(booking.status)
  const venue = venues.find((x) => String(x.id) === String(booking.eventVenueId))
  const venueTitle = venue?.name ?? booking.venueName ?? '—'

  const handleApprove = async () => {
    setSubmitting(true)
    setError('')
    try {
      await updateEventBooking(booking.id, { ...booking, status: 'approved' })
      const guestMsg = buildGuestEventApprovedMessage(booking.customerName)
      const staffMsg = buildStaffEventOutcomeMessage(
        { customerName: booking.customerName, venueName: venue?.name ?? booking.venueName },
        'approved',
      )
      try {
        await createNotification({ message: guestMsg, audience: 'guest', date: formatNotificationDate() })
        await createNotification({ message: staffMsg, audience: 'staff', date: formatNotificationDate() })
      } catch {
        /* non-fatal */
      }
      dispatchNotificationsRefresh()
      onUpdated?.()
      onClose()
    } catch {
      setError('Could not update booking. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDecline = async () => {
    const trimmed = declineReason.trim()
    if (!trimmed) {
      setError('Enter a reason for rejection. It will be sent to the guest.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await updateEventBooking(booking.id, { ...booking, status: 'declined', declineReason: trimmed })
      const guestMsg = buildGuestEventDeclinedMessage(booking.customerName, trimmed)
      const staffMsg = buildStaffEventOutcomeMessage(
        { customerName: booking.customerName, venueName: venue?.name ?? booking.venueName },
        'declined',
        trimmed,
      )
      try {
        await createNotification({ message: guestMsg, audience: 'guest', date: formatNotificationDate() })
        await createNotification({ message: staffMsg, audience: 'staff', date: formatNotificationDate() })
      } catch {
        /* non-fatal */
      }
      dispatchNotificationsRefresh()
      onUpdated?.()
      onClose()
    } catch {
      setError('Could not update booking. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveView = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    if (!String(form.eventVenueId).trim()) {
      setError('Select a venue.')
      setSubmitting(false)
      return
    }
    const total = parseFloat(String(form.totalAmount).replace(/,/g, ''))
    const paid = parseFloat(String(form.paymentAmount).replace(/,/g, ''))
    const selectedVenue = venues.find((v) => String(v.id) === String(form.eventVenueId))
    const payload = {
      ...booking,
      eventVenueId: form.eventVenueId,
      venueName: selectedVenue?.name?.trim() || form.venueName.trim() || booking.venueName,
      customerName: form.customerName.trim(),
      email: form.email.trim(),
      contactNumber: form.contactNumber.trim(),
      address: form.address.trim(),
      eventTitle: form.eventTitle.trim(),
      eventDate: form.eventDate,
      eventEndDate: form.eventEndDate.trim() || null,
      expectedPax: Math.max(1, Math.floor(Number(form.expectedPax)) || 1),
      additionalRequests: form.additionalRequests.trim(),
      totalAmount: Number.isFinite(total) ? total : getEventTotalRaw(booking),
      totalEventAmount: Number.isFinite(total) ? total : booking.totalEventAmount,
      venuePrice: Number.isFinite(total) ? String(total) : booking.venuePrice,
      paymentAmount: Number.isFinite(paid) ? paid : booking.paymentAmount,
      paymentDate: form.paymentDate.trim() || booking.paymentDate,
      paymentTransactionId: form.paymentTransactionId.trim() || booking.paymentTransactionId,
      paymentType: form.paymentType || booking.paymentType,
    }
    try {
      await updateEventBooking(booking.id, payload)
      onUpdated?.()
      onClose()
    } catch {
      setError('Could not save changes. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const proofKind = booking.proofOfPaymentDataUrl ? proofDataUrlKind(booking.proofOfPaymentDataUrl) : null
  const isReview = mode === 'review'
  const title = isReview ? 'Review event booking' : 'Event booking details'

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId} panelClassName="fd-res-modal">
      <div className="fd-res-modal__head">
        <h2 id={titleId} className="fd-res-modal__title">
          {title}
        </h2>
        <button type="button" className="fd-res-modal__close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="fd-res-modal__body">
        <p className="fd-res-modal__status-line">
          Status: <strong>{formatRoomReservationStatusLabel(booking.status)}</strong>
          {venueTitle && venueTitle !== '—' && <> · {venueTitle}</>}
        </p>

        {error && (
          <p id={errId} className="fd-res-modal__error" role="alert">
            {error}
          </p>
        )}

        {!isReview && statusKey === 'declined' && typeof booking.declineReason === 'string' && booking.declineReason.trim() !== '' && (
          <div className="fd-res-modal__decline-readonly">
            <span className="fd-res-modal__label">Rejection reason (guest was notified)</span>
            <p className="fd-res-modal__value">{booking.declineReason.trim()}</p>
          </div>
        )}

        {isReview ? (
          <>
            <div className="fd-res-modal__review-grid">
              <div>
                <span className="fd-res-modal__label">Guest</span>
                <p className="fd-res-modal__value">{booking.customerName || '—'}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Event</span>
                <p className="fd-res-modal__value">{booking.eventTitle?.trim() || '—'}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Venue</span>
                <p className="fd-res-modal__value">{venueTitle}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Dates</span>
                <p className="fd-res-modal__value">{formatEventDates(booking.eventDate, booking.eventEndDate)}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Guests (pax)</span>
                <p className="fd-res-modal__value">{booking.expectedPax != null ? String(booking.expectedPax) : '—'}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Total</span>
                <p className="fd-res-modal__value">{formatPeso(getEventTotalRaw(booking))}</p>
              </div>
            </div>

            {booking.proofOfPaymentDataUrl && (
              <div className="fd-res-modal__proof-block">
                <span className="fd-res-modal__label">Payment proof</span>
                {proofKind === 'image' && (
                  <img src={booking.proofOfPaymentDataUrl} alt="Payment proof" className="fd-res-modal__proof-img" />
                )}
                {proofKind === 'pdf' && (
                  <iframe title="Payment proof" src={booking.proofOfPaymentDataUrl} className="fd-res-modal__proof-iframe" />
                )}
                {proofKind === 'other' && <p className="fd-res-modal__muted">Proof attached (preview not available).</p>}
              </div>
            )}

            {statusKey === 'pending' ? (
              declineOpen ? (
                <div className="fd-res-modal__decline-panel">
                  <label className="fd-res-modal__field">
                    <span className="fd-res-modal__label">Reason for rejection</span>
                    <textarea
                      className="fd-res-modal__textarea"
                      rows={4}
                      maxLength={2000}
                      value={declineReason}
                      onChange={(e) => setDeclineReason(e.target.value)}
                      placeholder="Explain why this request was declined. This message is sent to the guest."
                      aria-required
                    />
                  </label>
                  <div className="fd-res-modal__decline-panel-actions">
                    <button
                      type="button"
                      className="fd-res-modal__btn fd-res-modal__btn--ghost"
                      onClick={() => {
                        setDeclineOpen(false)
                        setDeclineReason('')
                        setError('')
                      }}
                      disabled={submitting}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="fd-res-modal__btn fd-res-modal__btn--decline"
                      onClick={handleConfirmDecline}
                      disabled={submitting}
                    >
                      {submitting ? 'Declining…' : 'Confirm decline'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="fd-res-modal__review-actions">
                  <button
                    type="button"
                    className="fd-res-modal__btn fd-res-modal__btn--decline"
                    onClick={() => {
                      setDeclineOpen(true)
                      setError('')
                    }}
                    disabled={submitting}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="fd-res-modal__btn fd-res-modal__btn--approve"
                    onClick={handleApprove}
                    disabled={submitting}
                  >
                    {submitting ? 'Saving…' : 'Approve'}
                  </button>
                </div>
              )
            ) : (
              <p className="fd-res-modal__hint">
                Review is only for pending requests. This booking is already {statusKey}.
              </p>
            )}
          </>
        ) : (
          <form className="fd-res-modal__form" onSubmit={handleSaveView} noValidate>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Venue</span>
              <select
                className="fd-res-modal__input"
                value={form.eventVenueId}
                onChange={(e) => {
                  const id = e.target.value
                  const v = venues.find((x) => String(x.id) === String(id))
                  setForm((f) => ({
                    ...f,
                    eventVenueId: id,
                    venueName: v?.name ?? f.venueName,
                  }))
                }}
                required
              >
                <option value="">Select venue</option>
                {venues.map((v) => (
                  <option key={String(v.id)} value={String(v.id)}>
                    {v.name ?? `Venue ${v.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Event title</span>
              <input
                className="fd-res-modal__input"
                value={form.eventTitle}
                onChange={(e) => setForm((f) => ({ ...f, eventTitle: e.target.value }))}
              />
            </label>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Guest name</span>
              <input
                className="fd-res-modal__input"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
              />
            </label>
            <div className="fd-res-modal__row">
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Email</span>
                <input
                  className="fd-res-modal__input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Contact</span>
                <input
                  className="fd-res-modal__input"
                  value={form.contactNumber}
                  onChange={(e) => setForm((f) => ({ ...f, contactNumber: e.target.value }))}
                />
              </label>
            </div>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Address</span>
              <input
                className="fd-res-modal__input"
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </label>
            <div className="fd-res-modal__row">
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Event start</span>
                <input
                  className="fd-res-modal__input"
                  type="date"
                  value={form.eventDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
                />
              </label>
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Event end</span>
                <input
                  className="fd-res-modal__input"
                  type="date"
                  value={form.eventEndDate}
                  onChange={(e) => setForm((f) => ({ ...f, eventEndDate: e.target.value }))}
                />
              </label>
            </div>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Expected guests (pax)</span>
              <input
                className="fd-res-modal__input fd-res-modal__input--narrow"
                type="number"
                min={1}
                value={form.expectedPax}
                onChange={(e) => setForm((f) => ({ ...f, expectedPax: Number(e.target.value) || 1 }))}
              />
            </label>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Additional requests</span>
              <textarea
                className="fd-res-modal__textarea"
                rows={3}
                value={form.additionalRequests}
                onChange={(e) => setForm((f) => ({ ...f, additionalRequests: e.target.value }))}
              />
            </label>

            <h3 className="fd-res-modal__section-title">Billing</h3>
            <div className="fd-res-modal__row">
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Total amount</span>
                <input
                  className="fd-res-modal__input"
                  inputMode="decimal"
                  value={form.totalAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
                />
              </label>
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Amount paid</span>
                <input
                  className="fd-res-modal__input"
                  inputMode="decimal"
                  value={form.paymentAmount}
                  onChange={(e) => setForm((f) => ({ ...f, paymentAmount: e.target.value }))}
                />
              </label>
            </div>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Payment type</span>
              <select
                className="fd-res-modal__input"
                value={form.paymentType || ''}
                onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))}
              >
                <option value="">—</option>
                <option value="full">Full</option>
                <option value="downpayment">Down payment</option>
              </select>
            </label>
            <div className="fd-res-modal__row">
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Payment date</span>
                <input
                  className="fd-res-modal__input"
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
                />
              </label>
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Transaction ID</span>
                <input
                  className="fd-res-modal__input"
                  value={form.paymentTransactionId}
                  onChange={(e) => setForm((f) => ({ ...f, paymentTransactionId: e.target.value }))}
                />
              </label>
            </div>

            {booking.proofOfPaymentDataUrl && (
              <div className="fd-res-modal__proof-block">
                <span className="fd-res-modal__label">Payment proof (read-only)</span>
                {proofKind === 'image' && (
                  <img src={booking.proofOfPaymentDataUrl} alt="Payment proof" className="fd-res-modal__proof-img" />
                )}
                {proofKind === 'pdf' && (
                  <iframe title="Payment proof" src={booking.proofOfPaymentDataUrl} className="fd-res-modal__proof-iframe" />
                )}
              </div>
            )}

            <div className="fd-res-modal__form-actions">
              <button type="button" className="fd-res-modal__btn fd-res-modal__btn--ghost" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="fd-res-modal__btn fd-res-modal__btn--primary" disabled={submitting}>
                {submitting ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </ModalFrame>
  )
}
