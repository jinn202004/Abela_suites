import { useEffect, useId, useState } from 'react'
import ModalFrame from '../components/ModalFrame'
import { createNotification, updateReservation } from '../api/guestApi'
import { dispatchNotificationsRefresh, formatNotificationDate } from '../guest/notificationFeed'
import {
  buildGuestApprovedMessage,
  buildGuestDeclinedMessage,
  buildStaffReservationOutcomeMessage,
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

/**
 * @param {'view' | 'review'} mode
 * @param {object | null} reservation
 * @param {object[]} rooms
 * @param {function} onClose
 * @param {function} onUpdated — after save or status change
 */
export default function FrontDeskReservationModal({ mode, reservation, rooms, isOpen, onClose, onUpdated }) {
  const titleId = useId()
  const errId = useId()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [declineOpen, setDeclineOpen] = useState(false)
  const [declineReason, setDeclineReason] = useState('')

  const [form, setForm] = useState({
    roomId: '',
    customerName: '',
    email: '',
    contactNumber: '',
    address: '',
    checkIn: '',
    checkOut: '',
    additionalGuests: 0,
    additionalRequests: '',
    totalStayAmount: '',
    paymentAmount: '',
    paymentDate: '',
    paymentTransactionId: '',
    paymentType: '',
  })

  useEffect(() => {
    if (!isOpen || !reservation) return
    setError('')
    setForm({
      roomId: reservation.roomId != null ? String(reservation.roomId) : '',
      customerName: typeof reservation.customerName === 'string' ? reservation.customerName : '',
      email: typeof reservation.email === 'string' ? reservation.email : '',
      contactNumber: typeof reservation.contactNumber === 'string' ? reservation.contactNumber : '',
      address: typeof reservation.address === 'string' ? reservation.address : '',
      checkIn: reservation.checkIn != null ? String(reservation.checkIn).slice(0, 10) : '',
      checkOut: reservation.checkOut != null ? String(reservation.checkOut).slice(0, 10) : '',
      additionalGuests: Number(reservation.additionalGuests) || 0,
      additionalRequests: typeof reservation.additionalRequests === 'string' ? reservation.additionalRequests : '',
      totalStayAmount:
        reservation.totalStayAmount != null && Number.isFinite(Number(reservation.totalStayAmount))
          ? String(reservation.totalStayAmount)
          : '',
      paymentAmount:
        reservation.paymentAmount != null && Number.isFinite(Number(reservation.paymentAmount))
          ? String(reservation.paymentAmount)
          : '',
      paymentDate: reservation.paymentDate != null ? String(reservation.paymentDate).slice(0, 10) : '',
      paymentTransactionId:
        typeof reservation.paymentTransactionId === 'string' ? reservation.paymentTransactionId : '',
      paymentType: typeof reservation.paymentType === 'string' ? reservation.paymentType : '',
    })
  }, [isOpen, reservation])

  useEffect(() => {
    if (!isOpen || !reservation) return
    setDeclineOpen(false)
    setDeclineReason('')
  }, [isOpen, reservation?.id])

  if (!reservation) return null

  const statusKey = normalizeRoomReservationStatus(reservation.status)
  const room = rooms.find((x) => String(x.id) === String(reservation.roomId))
  const roomTitle = room?.title ?? reservation.roomTitle ?? '—'

  const handleApprove = async () => {
    setSubmitting(true)
    setError('')
    try {
      await updateReservation(reservation.id, { ...reservation, status: 'approved' })
      const guestMsg = buildGuestApprovedMessage(reservation.customerName)
      const staffMsg = buildStaffReservationOutcomeMessage(
        { customerName: reservation.customerName, roomTitle: room?.title ?? reservation.roomTitle },
        'approved',
      )
      try {
        await createNotification({
          message: guestMsg,
          audience: 'guest',
          date: formatNotificationDate(),
        })
        await createNotification({
          message: staffMsg,
          audience: 'staff',
          date: formatNotificationDate(),
        })
      } catch {
        /* non-fatal */
      }
      dispatchNotificationsRefresh()
      onUpdated?.()
      onClose()
    } catch {
      setError('Could not update reservation. Is the API running?')
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
      await updateReservation(reservation.id, { ...reservation, status: 'declined', declineReason: trimmed })
      const guestMsg = buildGuestDeclinedMessage(reservation.customerName, trimmed)
      const staffMsg = buildStaffReservationOutcomeMessage(
        { customerName: reservation.customerName, roomTitle: room?.title ?? reservation.roomTitle },
        'declined',
        trimmed,
      )
      try {
        await createNotification({
          message: guestMsg,
          audience: 'guest',
          date: formatNotificationDate(),
        })
        await createNotification({
          message: staffMsg,
          audience: 'staff',
          date: formatNotificationDate(),
        })
      } catch {
        /* non-fatal */
      }
      dispatchNotificationsRefresh()
      onUpdated?.()
      onClose()
    } catch {
      setError('Could not update reservation. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveView = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    if (!String(form.roomId).trim()) {
      setError('Select a room.')
      setSubmitting(false)
      return
    }
    const total = parseFloat(String(form.totalStayAmount).replace(/,/g, ''))
    const paid = parseFloat(String(form.paymentAmount).replace(/,/g, ''))
    const payload = {
      ...reservation,
      roomId: form.roomId,
      roomTitle: rooms.find((x) => String(x.id) === String(form.roomId))?.title ?? reservation.roomTitle,
      customerName: form.customerName.trim(),
      email: form.email.trim(),
      contactNumber: form.contactNumber.trim(),
      address: form.address.trim(),
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      additionalGuests: Number(form.additionalGuests) || 0,
      additionalRequests: form.additionalRequests.trim(),
      totalStayAmount: Number.isFinite(total) ? total : reservation.totalStayAmount,
      paymentAmount: Number.isFinite(paid) ? paid : reservation.paymentAmount,
      paymentDate: form.paymentDate.trim() || reservation.paymentDate,
      paymentTransactionId: form.paymentTransactionId.trim() || reservation.paymentTransactionId,
      paymentType: form.paymentType || reservation.paymentType,
    }
    try {
      await updateReservation(reservation.id, payload)
      onUpdated?.()
      onClose()
    } catch {
      setError('Could not save changes. Is the API running?')
    } finally {
      setSubmitting(false)
    }
  }

  const proofKind = reservation.proofOfPaymentDataUrl ? proofDataUrlKind(reservation.proofOfPaymentDataUrl) : null

  const isReview = mode === 'review'
  const title = isReview ? 'Review reservation' : 'Reservation details'

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
          Status:{' '}
          <strong>{formatRoomReservationStatusLabel(reservation.status)}</strong>
          {roomTitle && (
            <>
              {' '}
              · {roomTitle}
            </>
          )}
        </p>

        {error && (
          <p id={errId} className="fd-res-modal__error" role="alert">
            {error}
          </p>
        )}

        {!isReview && statusKey === 'declined' && typeof reservation.declineReason === 'string' && reservation.declineReason.trim() !== '' && (
          <div className="fd-res-modal__decline-readonly">
            <span className="fd-res-modal__label">Rejection reason (guest was notified)</span>
            <p className="fd-res-modal__value">{reservation.declineReason.trim()}</p>
          </div>
        )}

        {isReview ? (
          <>
            <div className="fd-res-modal__review-grid">
              <div>
                <span className="fd-res-modal__label">Guest</span>
                <p className="fd-res-modal__value">{reservation.customerName || '—'}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Email</span>
                <p className="fd-res-modal__value">{reservation.email || '—'}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Contact</span>
                <p className="fd-res-modal__value">{reservation.contactNumber || '—'}</p>
              </div>
              <div>
                <span className="fd-res-modal__label">Stay</span>
                <p className="fd-res-modal__value">
                  {reservation.checkIn ? String(reservation.checkIn).slice(0, 10) : '—'} →{' '}
                  {reservation.checkOut ? String(reservation.checkOut).slice(0, 10) : '—'}
                </p>
              </div>
              <div>
                <span className="fd-res-modal__label">Total</span>
                <p className="fd-res-modal__value">{formatPeso(reservation.totalStayAmount)}</p>
              </div>
            </div>

            {reservation.proofOfPaymentDataUrl && (
              <div className="fd-res-modal__proof-block">
                <span className="fd-res-modal__label">Payment proof</span>
                {proofKind === 'image' && (
                  <img
                    src={reservation.proofOfPaymentDataUrl}
                    alt="Payment proof"
                    className="fd-res-modal__proof-img"
                  />
                )}
                {proofKind === 'pdf' && (
                  <iframe title="Payment proof" src={reservation.proofOfPaymentDataUrl} className="fd-res-modal__proof-iframe" />
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
                Review is only for pending requests. This reservation is already {statusKey}.
              </p>
            )}
          </>
        ) : (
          <form className="fd-res-modal__form" onSubmit={handleSaveView} noValidate>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Room</span>
              <select
                className="fd-res-modal__input"
                value={form.roomId}
                onChange={(e) => setForm((f) => ({ ...f, roomId: e.target.value }))}
                required
              >
                <option value="">Select room</option>
                {rooms.map((rm) => (
                  <option key={String(rm.id)} value={String(rm.id)}>
                    {rm.roomNumber != null && String(rm.roomNumber).trim() !== ''
                      ? `Room ${rm.roomNumber} — ${rm.title ?? 'Room'}`
                      : rm.title ?? `Room ${rm.id}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Guest name</span>
              <input
                className="fd-res-modal__input"
                value={form.customerName}
                onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))}
                autoComplete="name"
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
                <span className="fd-res-modal__label">Check-in</span>
                <input
                  className="fd-res-modal__input"
                  type="date"
                  value={form.checkIn}
                  onChange={(e) => setForm((f) => ({ ...f, checkIn: e.target.value }))}
                />
              </label>
              <label className="fd-res-modal__field">
                <span className="fd-res-modal__label">Check-out</span>
                <input
                  className="fd-res-modal__input"
                  type="date"
                  value={form.checkOut}
                  onChange={(e) => setForm((f) => ({ ...f, checkOut: e.target.value }))}
                />
              </label>
            </div>
            <label className="fd-res-modal__field">
              <span className="fd-res-modal__label">Additional guests</span>
              <input
                className="fd-res-modal__input fd-res-modal__input--narrow"
                type="number"
                min={0}
                value={form.additionalGuests}
                onChange={(e) => setForm((f) => ({ ...f, additionalGuests: Number(e.target.value) || 0 }))}
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
                <span className="fd-res-modal__label">Total stay amount</span>
                <input
                  className="fd-res-modal__input"
                  inputMode="decimal"
                  value={form.totalStayAmount}
                  onChange={(e) => setForm((f) => ({ ...f, totalStayAmount: e.target.value }))}
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

            {reservation.proofOfPaymentDataUrl && (
              <div className="fd-res-modal__proof-block">
                <span className="fd-res-modal__label">Payment proof (read-only)</span>
                {proofKind === 'image' && (
                  <img
                    src={reservation.proofOfPaymentDataUrl}
                    alt="Payment proof"
                    className="fd-res-modal__proof-img"
                  />
                )}
                {proofKind === 'pdf' && (
                  <iframe title="Payment proof" src={reservation.proofOfPaymentDataUrl} className="fd-res-modal__proof-iframe" />
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
