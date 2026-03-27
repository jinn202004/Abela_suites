import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createNotification, createReservation } from '../api/guestApi'
import { dispatchNotificationsRefresh, formatNotificationDate } from './notificationFeed'
import {
  buildGuestSubmittedMessage,
  buildStaffNewReservationMessage,
} from './reservationNotificationMessages'
import ModalFrame from '../components/ModalFrame'
import './RoomReservationModal.css'

const PH_LOCAL_REGEX = /^9\d{9}$/

function digitsOnly(value) {
  return String(value).replace(/\D/g, '').slice(0, 10)
}

function isValidPhMobileLocal(local) {
  return PH_LOCAL_REGEX.test(local)
}

/** @param {React.MutableRefObject<string | null>} ref */
function revokeGuestIdObjectUrl(ref) {
  if (ref.current) {
    URL.revokeObjectURL(ref.current)
    ref.current = null
  }
}

/**
 * @param {HTMLFormElement | null} form
 * @param {{ checkIn?: string, checkOut?: string, additionalGuests?: number }} initials
 */
function parseRoomPriceToNumber(price) {
  if (price == null) return null
  const n = parseFloat(String(price).replace(/[^\d.]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function nightsBetweenYMD(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0
  const a = new Date(`${checkIn}T12:00:00`)
  const b = new Date(`${checkOut}T12:00:00`)
  const d = Math.round((b.getTime() - a.getTime()) / 86400000)
  return Number.isFinite(d) ? d : 0
}

function computeStayTotal(room, checkIn, checkOut) {
  const nightly = parseRoomPriceToNumber(room?.price)
  if (nightly == null) return null
  const nights = nightsBetweenYMD(checkIn, checkOut)
  if (nights <= 0) return null
  return Math.round(nightly * nights * 100) / 100
}

function formatPeso(n) {
  if (n == null || !Number.isFinite(n)) return '—'
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function applyReservationInitials(form, initials) {
  if (!form) return
  const el = form.elements
  const { checkIn, checkOut, additionalGuests } = initials
  if (checkIn && el.namedItem('checkIn')) {
    /** @type {HTMLInputElement} */ (el.namedItem('checkIn')).value = checkIn
  }
  if (checkOut && el.namedItem('checkOut')) {
    /** @type {HTMLInputElement} */ (el.namedItem('checkOut')).value = checkOut
  }
  const ag = el.namedItem('additionalGuests')
  if (ag && additionalGuests != null && Number.isFinite(Number(additionalGuests))) {
    const n = Math.min(99, Math.max(0, Math.floor(Number(additionalGuests))))
    /** @type {HTMLInputElement} */ (ag).value = String(n)
  }
}

/**
 * @param {boolean} isOpen
 * @param {function} onClose
 * @param {{ id: string | number, title: string, roomNumber?: string } | null} room
 * @param {string} [initialCheckIn]
 * @param {string} [initialCheckOut]
 * @param {number} [initialAdditionalGuests]
 * @param {function} [onSuccess]
 */
export default function RoomReservationModal({
  isOpen,
  onClose,
  room,
  initialCheckIn = '',
  initialCheckOut = '',
  initialAdditionalGuests = 0,
  onSuccess,
}) {
  const titleId = useId()
  const formRef = useRef(null)
  const fileInputRef = useRef(null)
  const paymentProofInputRef = useRef(null)
  const guestIdPreviewUrlRef = useRef(null)
  const [step, setStep] = useState('agreements')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [agreePrivacy, setAgreePrivacy] = useState(false)
  const [agreeStay, setAgreeStay] = useState(false)
  const [reservationDraft, setReservationDraft] = useState(null)
  const [stayTotal, setStayTotal] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [phoneLocal, setPhoneLocal] = useState('')
  const [guestIdPreviewUrl, setGuestIdPreviewUrl] = useState(null)
  const [paymentType, setPaymentType] = useState('full')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState('')
  const [paymentTxnId, setPaymentTxnId] = useState('')
  const [paymentProofPreviewUrl, setPaymentProofPreviewUrl] = useState(null)
  const [paymentProofKind, setPaymentProofKind] = useState(null)
  const paymentProofPreviewUrlRef = useRef(null)

  const releaseGuestIdPreview = useCallback(() => {
    revokeGuestIdObjectUrl(guestIdPreviewUrlRef)
    setGuestIdPreviewUrl(null)
  }, [])

  const setGuestIdPreviewFromFile = useCallback((file) => {
    revokeGuestIdObjectUrl(guestIdPreviewUrlRef)
    if (!file) {
      setGuestIdPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    guestIdPreviewUrlRef.current = url
    setGuestIdPreviewUrl(url)
  }, [])

  useEffect(() => {
    return () => {
      revokeGuestIdObjectUrl(guestIdPreviewUrlRef)
    }
  }, [])

  const revokePaymentProofPreview = useCallback(() => {
    if (paymentProofPreviewUrlRef.current) {
      URL.revokeObjectURL(paymentProofPreviewUrlRef.current)
      paymentProofPreviewUrlRef.current = null
    }
    setPaymentProofPreviewUrl(null)
    setPaymentProofKind(null)
  }, [])

  useEffect(() => {
    return () => {
      if (paymentProofPreviewUrlRef.current) URL.revokeObjectURL(paymentProofPreviewUrlRef.current)
    }
  }, [])

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
    setStep('agreements')
    setAgreeTerms(false)
    setAgreePrivacy(false)
    setAgreeStay(false)
    setReservationDraft(null)
    setStayTotal(null)
    setPaymentType('full')
    setPaymentAmount('')
    setPaymentTxnId('')
    revokePaymentProofPreview()
    formRef.current?.reset()
    setSubmitError('')
    setPhoneLocal('')
    revokeGuestIdObjectUrl(guestIdPreviewUrlRef)
    setGuestIdPreviewUrl(null)
    const today = new Date()
    setPaymentDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    )
    const idFrame = requestAnimationFrame(() => {
      applyReservationInitials(formRef.current, {
        checkIn: initialCheckIn,
        checkOut: initialCheckOut,
        additionalGuests: initialAdditionalGuests,
      })
    })
    return () => cancelAnimationFrame(idFrame)
  }, [isOpen, room?.id, initialCheckIn, initialCheckOut, initialAdditionalGuests, revokePaymentProofPreview])

  const handleGuestIdPhotoChange = (e) => {
    const file = e.target.files?.[0]
    setGuestIdPreviewFromFile(file ?? null)
  }

  const clearGuestIdPhoto = () => {
    if (fileInputRef.current) fileInputRef.current.value = ''
    releaseGuestIdPreview()
  }

  const localDigits = digitsOnly(phoneLocal)
  const phoneInvalidLive = localDigits.length > 0 && !isValidPhMobileLocal(localDigits)

  const handleContinueToPayment = (e) => {
    e.preventDefault()
    setSubmitError('')
    const local = digitsOnly(phoneLocal)
    if (!isValidPhMobileLocal(local)) {
      document.getElementById('room-res-phone-input')?.focus()
      return
    }
    const form = formRef.current
    if (!form) return
    const fd = new FormData(form)
    const checkIn = String(fd.get('checkIn') ?? '')
    const checkOut = String(fd.get('checkOut') ?? '')
    const total = computeStayTotal(room, checkIn, checkOut)
    if (total == null) {
      setSubmitError(
        'Could not compute your stay total. Ensure the room has a valid price and check-out is after check-in.',
      )
      return
    }
    const file = fileInputRef.current?.files?.[0]
    const draft = {
      roomId: String(fd.get('roomId') ?? room?.id ?? ''),
      customerName: String(fd.get('customerName') ?? ''),
      email: String(fd.get('email') ?? ''),
      contactNumber: `+63${local}`,
      address: String(fd.get('address') ?? ''),
      checkIn,
      checkOut,
      additionalGuests: Number(fd.get('additionalGuests')) || 0,
      guestId: '',
      guestIdPhotoName: file?.name ?? null,
      additionalRequests: String(fd.get('additionalRequests') ?? ''),
      roomTitle: room?.title ?? null,
    }
    setReservationDraft(draft)
    setStayTotal(total)
    setPaymentType('full')
    setPaymentAmount(String(total))
    setSubmitError('')
    setStep('payment')
  }

  const handlePaymentProofChange = (e) => {
    const file = e.target.files?.[0]
    revokePaymentProofPreview()
    if (!file) return
    let kind = 'other'
    if (file.type.startsWith('image/')) kind = 'image'
    else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) kind = 'pdf'
    setPaymentProofKind(kind)
    const url = URL.createObjectURL(file)
    paymentProofPreviewUrlRef.current = url
    setPaymentProofPreviewUrl(url)
  }

  const clearPaymentProofOnly = () => {
    if (paymentProofInputRef.current) paymentProofInputRef.current.value = ''
    revokePaymentProofPreview()
  }

  const clearPaymentForm = () => {
    if (paymentProofInputRef.current) paymentProofInputRef.current.value = ''
    revokePaymentProofPreview()
    setPaymentTxnId('')
    if (stayTotal != null) {
      const min = Math.round(stayTotal * 0.3 * 100) / 100
      setPaymentAmount(paymentType === 'full' ? String(stayTotal) : String(min))
    } else {
      setPaymentAmount('')
    }
    const today = new Date()
    setPaymentDate(
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    )
    setSubmitError('')
  }

  const handlePaymentTypeChange = (next) => {
    setPaymentType(next)
    if (stayTotal == null) return
    const min = Math.round(stayTotal * 0.3 * 100) / 100
    setPaymentAmount(next === 'full' ? String(stayTotal) : String(min))
  }

  const handlePaymentSubmit = async (e) => {
    e.preventDefault()
    if (!reservationDraft || stayTotal == null) return
    setSubmitError('')
    const paid = parseFloat(String(paymentAmount).replace(/,/g, ''))
    if (!Number.isFinite(paid) || paid <= 0) {
      setSubmitError('Enter a valid amount paid.')
      return
    }
    const minDown = Math.round(stayTotal * 0.3 * 100) / 100
    if (paymentType === 'full') {
      if (paid + 0.005 < stayTotal) {
        setSubmitError(`Pay in full requires at least ${formatPeso(stayTotal)}.`)
        return
      }
    } else if (paid + 0.005 < minDown) {
      setSubmitError(`Down payment must be at least 30% of your stay (${formatPeso(minDown)}).`)
      return
    }
    if (!paymentDate.trim()) {
      setSubmitError('Select the payment date.')
      return
    }
    if (!paymentTxnId.trim()) {
      setSubmitError('Enter your transaction ID.')
      return
    }
    const proofFile = paymentProofInputRef.current?.files?.[0]
    if (!proofFile) {
      setSubmitError('Please upload proof of payment.')
      return
    }
    setSubmitting(true)
    let proofOfPaymentDataUrl
    try {
      proofOfPaymentDataUrl = await readFileAsDataUrl(proofFile)
    } catch {
      setSubmitError('Could not read your proof of payment file. Try another image or PDF.')
      setSubmitting(false)
      return
    }
    const payload = {
      ...reservationDraft,
      status: 'pending',
      paymentType,
      totalStayAmount: stayTotal,
      minimumDownPayment: minDown,
      paymentAmount: paid,
      paymentDate: paymentDate.trim(),
      paymentTransactionId: paymentTxnId.trim(),
      proofOfPaymentName: proofFile.name,
      proofOfPaymentDataUrl,
      createdAt: new Date().toISOString(),
    }
    try {
      await createReservation(payload)
      const roomTitle = room?.title ?? reservationDraft.roomTitle ?? ''
      const notifPayload = {
        customerName: reservationDraft.customerName,
        roomTitle,
        checkIn: reservationDraft.checkIn,
        checkOut: reservationDraft.checkOut,
      }
      try {
        await createNotification({
          message: buildGuestSubmittedMessage(notifPayload),
          audience: 'guest',
          date: formatNotificationDate(),
        })
        await createNotification({
          message: buildStaffNewReservationMessage(notifPayload),
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
        window.dispatchEvent(new CustomEvent('guest-reservation-created'))
      }
    } catch {
      setSubmitError('Could not save reservation. Start the mock API with npm run api (or npm run dev:full).')
    } finally {
      setSubmitting(false)
    }
  }


  const minDown = stayTotal != null ? Math.round(stayTotal * 0.3 * 100) / 100 : null

  const agreementsComplete = agreeTerms && agreePrivacy && agreeStay

  const clearAgreementChecks = () => {
    setAgreeTerms(false)
    setAgreePrivacy(false)
    setAgreeStay(false)
  }

  const stopLinkNav = (e) => {
    e.preventDefault()
  }

  return (
    <ModalFrame
      isOpen={isOpen}
      onClose={onClose}
      panelClassName={`room-reservation-modal${step === 'payment' ? ' room-reservation-modal--payment' : ''}${step === 'agreements' ? ' room-reservation-modal--agreements' : ''}`}
      ariaLabelledBy={titleId}
    >
      <div className="room-reservation-modal__head">
        <div className="room-reservation-modal__head-main">
          {step === 'payment' && (
            <button
              type="button"
              className="room-reservation-modal__back"
              onClick={() => {
                setStep('reservation')
                setSubmitError('')
              }}
            >
              ← Back to reservation
            </button>
          )}
          {step === 'reservation' && (
            <button
              type="button"
              className="room-reservation-modal__back"
              onClick={() => {
                setStep('agreements')
                setSubmitError('')
              }}
            >
              ← Back to agreements
            </button>
          )}
          <h2 id={titleId} className="room-reservation-modal__title">
            {step === 'payment' ? 'Payment form' : 'Room Reservation'}
          </h2>
        </div>
        <button type="button" className="room-reservation-modal__close" onClick={onClose} aria-label="Close">
          <IconClose />
        </button>
      </div>

      {(step === 'agreements' || step === 'reservation') && room && (room.title || room.roomNumber) && (
        <p className="room-reservation-modal__room-name">
          {room.roomNumber != null && String(room.roomNumber).trim() !== ''
            ? `Room ${room.roomNumber}${room.title ? ` · ${room.title}` : ''}`
            : room.title}
        </p>
      )}

      {step === 'agreements' && (
        <div className="room-reservation-modal__agreements">
          <div className="room-reservation-modal__terms-scroll" role="region" aria-label="Terms and conditions">
            <div className="room-reservation-modal__terms-body">
              <p className="room-reservation-modal__terms-lead">
                Please read the following before proceeding with your reservation at Abela Suites.
              </p>
              <h3 className="room-reservation-modal__terms-heading">1. Booking &amp; guest details</h3>
              <ul className="room-reservation-modal__terms-list">
                <li>Reservations are requests until confirmed by the property.</li>
                <li>Guest information must be accurate; valid government-issued ID may be required at check-in.</li>
                <li>If booking for another person, authorization and their ID must be provided.</li>
              </ul>
              <h3 className="room-reservation-modal__terms-heading">2. Verification &amp; confirmation</h3>
              <ul className="room-reservation-modal__terms-list">
                <li>All reservation requests are subject to approval after ID verification.</li>
                <li>Payment instructions and confirmation will follow the details you submit.</li>
              </ul>
              <h3 className="room-reservation-modal__terms-heading">3. Cancellations &amp; changes</h3>
              <ul className="room-reservation-modal__terms-list">
                <li>Changes and cancellations are handled according to our published policy and room availability.</li>
                <li>No-show or late cancellation fees may apply as stated in the full Terms and Conditions.</li>
              </ul>
            </div>
          </div>

          <label className="room-reservation-modal__agreement-row">
            <input
              type="checkbox"
              className="room-reservation-modal__agreement-check"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
            />
            <span className="room-reservation-modal__agreement-text">
              I have read and accept the{' '}
              <a href="#" className="room-reservation-modal__agreement-link" onClick={stopLinkNav}>
                Terms and Conditions
              </a>
            </span>
          </label>

          <div className="room-reservation-modal__required-agreements">
            <h3 className="room-reservation-modal__required-agreements-title">Required Agreements</h3>
            <label className="room-reservation-modal__agreement-row">
              <input
                type="checkbox"
                className="room-reservation-modal__agreement-check"
                checked={agreePrivacy}
                onChange={(e) => setAgreePrivacy(e.target.checked)}
              />
              <span className="room-reservation-modal__agreement-text">
                I have read and agree to the{' '}
                <a href="#" className="room-reservation-modal__agreement-link" onClick={stopLinkNav}>
                  Data Privacy &amp; Policy
                </a>
              </span>
            </label>
            <label className="room-reservation-modal__agreement-row">
              <input
                type="checkbox"
                className="room-reservation-modal__agreement-check"
                checked={agreeStay}
                onChange={(e) => setAgreeStay(e.target.checked)}
              />
              <span className="room-reservation-modal__agreement-text">
                I have read and agree to the{' '}
                <a href="#" className="room-reservation-modal__agreement-link" onClick={stopLinkNav}>
                  Terms &amp; Conditions of Stay
                </a>
              </span>
            </label>
          </div>

          <div className="room-reservation-modal__agreements-actions">
            <button type="button" className="room-reservation-modal__btn-secondary" onClick={clearAgreementChecks}>
              Clear
            </button>
            <button
              type="button"
              className="room-reservation-modal__submit"
              disabled={!agreementsComplete}
              onClick={() => setStep('reservation')}
            >
              Continue to reservation
            </button>
          </div>
        </div>
      )}

      {step === 'payment' && stayTotal != null && (
        <p className="room-reservation-modal__payment-summary" role="status">
          Total for your stay: <strong>{formatPeso(stayTotal)}</strong>
          {paymentType === 'downpayment' && minDown != null && (
            <> · Minimum down payment (30%): <strong>{formatPeso(minDown)}</strong></>
          )}
        </p>
      )}

      {step === 'reservation' && (
      <form ref={formRef} className="room-reservation-modal__form" onSubmit={handleContinueToPayment} noValidate>
        <input type="hidden" name="roomId" value={room?.id ?? ''} />

        <div className="room-reservation-modal__grid">
          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Customer Name</span>
            <input className="room-reservation-modal__input" type="text" name="customerName" autoComplete="name" />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Email</span>
            <input className="room-reservation-modal__input" type="email" name="email" autoComplete="email" />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label" id="room-res-phone-label">
              Contact Number
            </span>
            <div className="room-reservation-modal__phone-row">
              <span className="room-reservation-modal__phone-prefix">+63</span>
              <input
                id="room-res-phone-input"
                className="room-reservation-modal__input room-reservation-modal__input--phone"
                type="tel"
                name="phoneLocal"
                autoComplete="tel"
                inputMode="numeric"
                placeholder="9XX XXX XXXX"
                value={phoneLocal}
                onChange={(e) => setPhoneLocal(digitsOnly(e.target.value))}
                aria-invalid={phoneInvalidLive}
                aria-describedby={phoneInvalidLive ? 'room-res-phone-status' : undefined}
              />
            </div>
            {phoneInvalidLive && (
              <p
                id="room-res-phone-status"
                className="room-reservation-modal__phone-warning"
                role="status"
                aria-live="polite"
              >
                Invalid Number
              </p>
            )}
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Address</span>
            <input className="room-reservation-modal__input" type="text" name="address" autoComplete="street-address" />
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Check-In Date</span>
            <span className="room-reservation-modal__input-with-icon">
              <input className="room-reservation-modal__input" type="date" name="checkIn" />
              <span className="room-reservation-modal__input-icon" aria-hidden>
                <IconCalendar />
              </span>
            </span>
          </label>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Check-Out Date</span>
            <span className="room-reservation-modal__input-with-icon">
              <input className="room-reservation-modal__input" type="date" name="checkOut" />
              <span className="room-reservation-modal__input-icon" aria-hidden>
                <IconCalendar />
              </span>
            </span>
          </label>

          <div className="room-reservation-modal__field">
            <span className="room-reservation-modal__label" id="guest-id-label">
              Guest ID photo
            </span>
            <div className="room-reservation-modal__id-row">
              <input
                ref={fileInputRef}
                type="file"
                name="guestIdPhoto"
                accept="image/*"
                className="room-reservation-modal__file"
                tabIndex={-1}
                onChange={handleGuestIdPhotoChange}
              />
              <button
                type="button"
                className="room-reservation-modal__icon-btn"
                aria-label="Upload Guest ID photo"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconCamera />
              </button>
            </div>
            {guestIdPreviewUrl && (
              <div className="room-reservation-modal__id-preview-wrap">
                <img
                  src={guestIdPreviewUrl}
                  alt="Guest ID preview"
                  className="room-reservation-modal__id-preview-img"
                />
                <button
                  type="button"
                  className="room-reservation-modal__id-preview-remove"
                  onClick={clearGuestIdPhoto}
                >
                  Remove photo
                </button>
              </div>
            )}
          </div>

          <label className="room-reservation-modal__field">
            <span className="room-reservation-modal__label">Additional Guest</span>
            <input
              className="room-reservation-modal__input"
              type="number"
              name="additionalGuests"
              min={0}
              max={99}
              step={1}
              defaultValue={0}
              inputMode="numeric"
            />
          </label>

          <label className="room-reservation-modal__field room-reservation-modal__field--full">
            <span className="room-reservation-modal__label">Additional Requests</span>
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
            Continue to payment
          </button>
        </div>
      </form>
      )}

      {step === 'payment' && stayTotal != null && (
        <form className="room-reservation-modal__payment" onSubmit={handlePaymentSubmit} noValidate>
          <div className="room-reservation-modal__payment-grid">
            <div className="room-reservation-modal__payment-qr">
              <p className="room-reservation-modal__payment-qr-label">InstaPay</p>
              <div className="room-reservation-modal__payment-qr-box">
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=InstaPay%20Abela%20Suites"
                  alt="InstaPay QR code"
                  className="room-reservation-modal__payment-qr-img"
                  width={200}
                  height={200}
                />
              </div>
              <p className="room-reservation-modal__payment-fees">Transfer fees may apply.</p>
              <dl className="room-reservation-modal__payment-masked">
                <div>
                  <dt>Name</dt>
                  <dd>L** J** P.</dd>
                </div>
                <div>
                  <dt>Mobile No.</dt>
                  <dd>093• ••••971</dd>
                </div>
                <div>
                  <dt>User ID</dt>
                  <dd>•••••••••••Y1JMWN</dd>
                </div>
              </dl>
            </div>

            <div className="room-reservation-modal__payment-form-wrap">
              <p className="room-reservation-modal__payment-form-title">Fill this form</p>

              <fieldset className="room-reservation-modal__payment-options">
                <legend className="room-reservation-modal__label">Payment option</legend>
                <label className="room-reservation-modal__radio">
                  <input
                    type="radio"
                    name="paymentOption"
                    value="full"
                    checked={paymentType === 'full'}
                    onChange={() => handlePaymentTypeChange('full')}
                  />
                  <span>Pay in full ({formatPeso(stayTotal)})</span>
                </label>
                <label className="room-reservation-modal__radio">
                  <input
                    type="radio"
                    name="paymentOption"
                    value="downpayment"
                    checked={paymentType === 'downpayment'}
                    onChange={() => handlePaymentTypeChange('downpayment')}
                  />
                  <span>
                    Down payment (at least 30% — {minDown != null ? formatPeso(minDown) : '—'})
                  </span>
                </label>
              </fieldset>

              <label className="room-reservation-modal__field">
                <span className="room-reservation-modal__label">Amount paid</span>
                <input
                  className="room-reservation-modal__input"
                  type="number"
                  name="paymentAmount"
                  min={paymentType === 'downpayment' && minDown != null ? minDown : stayTotal}
                  max={stayTotal * 5}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  inputMode="decimal"
                  required
                />
              </label>

              <label className="room-reservation-modal__field">
                <span className="room-reservation-modal__label">Date</span>
                <input
                  className="room-reservation-modal__input"
                  type="date"
                  name="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </label>

              <label className="room-reservation-modal__field">
                <span className="room-reservation-modal__label">Transaction ID</span>
                <input
                  className="room-reservation-modal__input"
                  type="text"
                  name="paymentTransactionId"
                  value={paymentTxnId}
                  onChange={(e) => setPaymentTxnId(e.target.value)}
                  autoComplete="off"
                  required
                />
              </label>

              <div className="room-reservation-modal__field">
                <span className="room-reservation-modal__label" id="payment-proof-label">
                  Proof of payment
                </span>
                <label className="room-reservation-modal__payment-drop">
                  <input
                    ref={paymentProofInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    className="room-reservation-modal__proof-input"
                    onChange={handlePaymentProofChange}
                    aria-labelledby="payment-proof-label"
                  />
                  <span className="room-reservation-modal__payment-drop-inner">
                    <IconCloudUpload />
                    <span className="room-reservation-modal__payment-drop-text">
                      Upload your proof of payment here…
                    </span>
                  </span>
                </label>
                {paymentProofPreviewUrl && paymentProofKind && (
                  <div className="room-reservation-modal__proof-preview">
                    {paymentProofKind === 'image' && (
                      <img
                        src={paymentProofPreviewUrl}
                        alt="Proof of payment preview"
                        className="room-reservation-modal__proof-preview-img"
                      />
                    )}
                    {paymentProofKind === 'pdf' && (
                      <div className="room-reservation-modal__proof-preview-pdf">
                        <iframe
                          title="Proof of payment PDF preview"
                          src={paymentProofPreviewUrl}
                          className="room-reservation-modal__proof-preview-iframe"
                        />
                      </div>
                    )}
                    {paymentProofKind === 'other' && (
                      <p className="room-reservation-modal__proof-preview-fallback">
                        Preview isn&apos;t available for this file type. The file will still be attached when you submit.
                      </p>
                    )}
                    <div className="room-reservation-modal__proof-preview-meta">
                      <span className="room-reservation-modal__payment-proof-name" role="status">
                        {paymentProofInputRef.current?.files?.[0]?.name ?? 'attachment'}
                      </span>
                      <button
                        type="button"
                        className="room-reservation-modal__proof-preview-remove"
                        onClick={clearPaymentProofOnly}
                      >
                        Remove file
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {submitError && (
                <p className="room-reservation-modal__error" role="alert">
                  {submitError}
                </p>
              )}

              <div className="room-reservation-modal__payment-actions">
                <button type="button" className="room-reservation-modal__btn-secondary" onClick={clearPaymentForm}>
                  Clear
                </button>
                <button type="submit" className="room-reservation-modal__submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </ModalFrame>
  )
}

function IconCloudUpload() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 16V4M8 8l4-4 4 4M4 14.5A4.5 4.5 0 004.5 19h15a3.5 3.5 0 00.5-7 1 1 0 00-1-1 5 5 0 00-9.78 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

function IconCamera() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2v11Z" strokeLinejoin="round" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
