import { BILLING_CONFIG } from './billingConfig'
import { countStayNights } from './roomStayDates'
import {
  EVENT_BASE_INCLUDED_HOURS,
  EVENT_EXTRA_HOUR_FLAT_RATE,
  durationHoursDecimalFromTimes,
} from './eventVenueTimeShared'
import { parseAdditionalRequestChargeLines } from '../components/reservationDetailsHelpers'

export function roundMoney(n) {
  return Math.round((Number(n) || 0) * 100) / 100
}

export function formatPeso(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—'
  return `₱${Number(n).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Down payment, balance, and minimum due from a computed bill and amount paid so far.
 * @param {{ total?: number, minimumDownPayment?: number }} bill
 * @param {number} [paymentAmountNum]
 */
export function paymentSnapshotFromBill(bill, paymentAmountNum = 0) {
  const total = roundMoney(bill?.total ?? 0)
  const paidRaw = Math.max(0, Number(paymentAmountNum) || 0)
  const amountPaid = roundMoney(Math.min(paidRaw, total))
  return {
    total,
    minimumDownPayment: roundMoney(bill?.minimumDownPayment ?? 0),
    amountPaid,
    balanceDue: roundMoney(Math.max(0, total - amountPaid)),
  }
}

/**
 * @param {import('./bookingBilling').BillLine[]} chargeLines
 * @param {{ stayLabel?: string, nights?: number, durationHours?: number }} [meta]
 */
export function finalizeBill(chargeLines, meta = {}) {
  const charges = (chargeLines || []).filter(
    (l) => l.amount > 0 || l.kind === 'room' || l.kind === 'event_base',
  )
  const subtotal = roundMoney(charges.reduce((s, l) => s + (Number(l.amount) || 0), 0))

  const serviceFee =
    subtotal > 0 && BILLING_CONFIG.SERVICE_FEE_RATE > 0
      ? roundMoney(subtotal * BILLING_CONFIG.SERVICE_FEE_RATE)
      : 0
  const taxable = roundMoney(subtotal + serviceFee)
  const vat =
    taxable > 0 && BILLING_CONFIG.VAT_RATE > 0 ? roundMoney(taxable * BILLING_CONFIG.VAT_RATE) : 0
  const total = roundMoney(taxable + vat)

  const lines = [...charges]

  if (subtotal > 0) {
    lines.push({
      kind: 'subtotal',
      label: 'Subtotal',
      detail: 'Room, event, and add-on charges',
      amount: subtotal,
    })
  }
  if (serviceFee > 0) {
    lines.push({
      kind: 'service_fee',
      label: `Service charge (${Math.round(BILLING_CONFIG.SERVICE_FEE_RATE * 100)}%)`,
      detail: `${formatPeso(subtotal)} × ${Math.round(BILLING_CONFIG.SERVICE_FEE_RATE * 100)}%`,
      amount: serviceFee,
    })
  }
  if (vat > 0) {
    lines.push({
      kind: 'vat',
      label: `VAT (${Math.round(BILLING_CONFIG.VAT_RATE * 100)}%)`,
      detail: `${formatPeso(taxable)} taxable amount`,
      amount: vat,
    })
  }

  lines.push({
    kind: 'total',
    label: 'Total amount',
    detail: 'All charges, fees, and taxes included',
    amount: total,
    emphasis: true,
  })

  const minimumDownPayment =
    total > 0 ? Math.round(total * BILLING_CONFIG.MINIMUM_DOWN_PAYMENT_RATE) : 0

  return {
    ...meta,
    lines,
    chargeLines: charges,
    subtotal,
    serviceFee,
    vat,
    total,
    minimumDownPayment,
    taxable,
  }
}

export function computeRoomBookingBill({
  roomTitle = '',
  nightlyRate = 0,
  checkIn = '',
  checkOut = '',
  includedGuests = 1,
  additionalGuests = 0,
  staffAddonCharges = [],
}) {
  const nights = countStayNights(checkIn, checkOut)
  const rate = roundMoney(nightlyRate)
  const roomCharges = roundMoney(rate * nights)

  const totalGuests = 1 + Math.max(0, parseInt(String(additionalGuests), 10) || 0)
  const capacity = Math.max(1, parseInt(String(includedGuests), 10) || 1)
  const extraGuestCount = Math.max(0, totalGuests - capacity)
  const feePerNight = BILLING_CONFIG.ROOM_EXTRA_GUEST_FEE_PER_NIGHT
  const extraGuestTotal = roundMoney(extraGuestCount * feePerNight * nights)

  const chargeLines = []

  if (nights > 0 && rate > 0) {
    chargeLines.push({
      kind: 'room',
      label: roomTitle ? `Room — ${roomTitle}` : 'Room charges',
      detail: `${formatPeso(rate)}/night × ${nights} night${nights !== 1 ? 's' : ''}`,
      amount: roomCharges,
    })
  }

  if (extraGuestTotal > 0) {
    chargeLines.push({
      kind: 'extra_guest',
      label: 'Additional guests',
      detail: `${extraGuestCount} over capacity (${capacity} included) · ${formatPeso(feePerNight)}/guest/night × ${nights} night${nights !== 1 ? 's' : ''}`,
      amount: extraGuestTotal,
    })
  }

  for (const c of staffAddonCharges) {
    const amt = roundMoney(c.amount)
    if (amt > 0) {
      chargeLines.push({
        kind: 'staff_addon',
        label: String(c.label || 'Add-on').trim() || 'Add-on',
        amount: amt,
      })
    }
  }

  return finalizeBill(chargeLines, {
    stayLabel:
      checkIn && checkOut && nights > 0
        ? `${checkIn} → ${checkOut} (${nights} night${nights !== 1 ? 's' : ''})`
        : '',
    nights,
    nightlyRate: rate,
  })
}

export function computeEventBookingBill({
  venueName = '',
  basePrice = 0,
  startTime = '',
  endTime = '',
  includedPax = 1,
  expectedPax = 1,
  staffAddonCharges = [],
}) {
  const durationHours =
    durationHoursDecimalFromTimes(startTime, endTime) || EVENT_BASE_INCLUDED_HOURS
  const base = roundMoney(basePrice)
  const extraHoursRaw = Math.max(0, durationHours - EVENT_BASE_INCLUDED_HOURS)
  const extraHourCharge = roundMoney(extraHoursRaw * EVENT_EXTRA_HOUR_FLAT_RATE)

  const capacity = Math.max(1, parseInt(String(includedPax), 10) || 1)
  const pax = Math.max(1, parseInt(String(expectedPax), 10) || 1)
  const extraPax = Math.max(0, pax - capacity)
  const extraPaxCharge = roundMoney(extraPax * BILLING_CONFIG.EVENT_EXTRA_PAX_FEE)

  const chargeLines = []

  if (base > 0) {
    chargeLines.push({
      kind: 'event_base',
      label: venueName ? `Venue — ${venueName}` : 'Venue package',
      detail: `Base (${EVENT_BASE_INCLUDED_HOURS} h included) · ${roundMoney(durationHours)} h booked`,
      amount: base,
    })
  }

  if (extraHourCharge > 0) {
    chargeLines.push({
      kind: 'event_extra_hour',
      label: 'Additional event hours',
      detail: `${roundMoney(extraHoursRaw)} h × ${formatPeso(EVENT_EXTRA_HOUR_FLAT_RATE)}/h`,
      amount: extraHourCharge,
    })
  }

  if (extraPaxCharge > 0) {
    chargeLines.push({
      kind: 'event_extra_pax',
      label: 'Guests over venue capacity',
      detail: `${extraPax} × ${formatPeso(BILLING_CONFIG.EVENT_EXTRA_PAX_FEE)}/guest`,
      amount: extraPaxCharge,
    })
  }

  for (const c of staffAddonCharges) {
    const amt = roundMoney(c.amount)
    if (amt > 0) {
      chargeLines.push({
        kind: 'staff_addon',
        label: String(c.label || 'Add-on').trim() || 'Add-on',
        amount: amt,
      })
    }
  }

  return finalizeBill(chargeLines, {
    durationHours: roundMoney(durationHours),
    extraHours: roundMoney(extraHoursRaw),
    hourlyRate: EVENT_EXTRA_HOUR_FLAT_RATE,
  })
}

export function billFromRoomBooking(booking, catalogRoom = null) {
  const checkIn = String(booking?.checkIn ?? '').trim()
  const checkOut = String(booking?.checkOut ?? '').trim()
  const catalogRate = Number(catalogRoom?.price)
  const nightlyRate =
    Number.isFinite(catalogRate) && catalogRate > 0
      ? catalogRate
      : (() => {
          const stored = parseFloat(
            String(booking?.totalAmount ?? booking?.totalStayAmount ?? '0').replace(/,/g, ''),
          )
          const nights = countStayNights(checkIn, checkOut)
          return nights > 0 && Number.isFinite(stored) && stored > 0 ? roundMoney(stored / nights) : 0
        })()

  const { charges } = parseAdditionalRequestChargeLines(booking?.additionalRequests)
  const staffAddonCharges = charges.filter((c) => !String(c.label || '').trim().startsWith('['))

  const bill = computeRoomBookingBill({
    roomTitle: String(booking?.roomTitle ?? '').trim(),
    nightlyRate,
    checkIn,
    checkOut,
    includedGuests: catalogRoom?.guests ?? catalogRoom?.maxGuests ?? 1,
    additionalGuests: booking?.additionalGuests ?? 0,
    staffAddonCharges,
  })

  const storedTotal = parseFloat(String(booking?.totalAmount ?? '0').replace(/,/g, ''))
  if (Number.isFinite(storedTotal) && storedTotal > 0 && Math.abs(storedTotal - bill.total) > 0.02) {
    return { ...bill, total: roundMoney(storedTotal), storedTotalOverride: true }
  }
  return bill
}

export function billFromEventBooking(booking, catalogVenue = null) {
  const basePrice = (() => {
    const vp = parseFloat(String(booking?.venuePrice ?? '').replace(/,/g, ''))
    if (Number.isFinite(vp) && vp > 0) return vp
    const cn = Number(catalogVenue?.price)
    return Number.isFinite(cn) && cn > 0 ? cn : 0
  })()

  const { charges } = parseAdditionalRequestChargeLines(booking?.additionalRequests)
  const staffAddonCharges = charges.filter((c) => !String(c.label || '').trim().startsWith('['))

  const bill = computeEventBookingBill({
    venueName: String(booking?.venueName ?? booking?.eventVenueName ?? '').trim(),
    basePrice,
    startTime: booking?.startTime ?? '',
    endTime: booking?.endTime ?? '',
    includedPax: catalogVenue?.maxGuests ?? catalogVenue?.guests ?? 1,
    expectedPax: booking?.expectedPax ?? 1,
    staffAddonCharges,
  })

  const storedTotal = parseFloat(String(booking?.totalAmount ?? booking?.venuePrice ?? '0').replace(/,/g, ''))
  if (Number.isFinite(storedTotal) && storedTotal > 0 && Math.abs(storedTotal - bill.total) > 0.02) {
    return { ...bill, total: roundMoney(storedTotal), storedTotalOverride: true }
  }
  return bill
}

export function buildRoomBillingFootnote(bill) {
  const parts = (bill.chargeLines || []).map((l) => {
    if (l.detail) return `${l.label}: ${l.detail} = ${formatPeso(l.amount)}`
    return `${l.label}: ${formatPeso(l.amount)}`
  })
  return `[Room billing — ${parts.join('; ')}; subtotal ${formatPeso(bill.subtotal)}; service ${formatPeso(bill.serviceFee)}; VAT ${formatPeso(bill.vat)}; total ${formatPeso(bill.total)}]`
}

export function buildEventBillingFootnote(bill) {
  const parts = (bill.chargeLines || []).map((l) => {
    if (l.detail) return `${l.label}: ${l.detail} = ${formatPeso(l.amount)}`
    return `${l.label}: ${formatPeso(l.amount)}`
  })
  return `[Event billing — ${parts.join('; ')}; subtotal ${formatPeso(bill.subtotal)}; service ${formatPeso(bill.serviceFee)}; VAT ${formatPeso(bill.vat)}; total ${formatPeso(bill.total)}]`
}
