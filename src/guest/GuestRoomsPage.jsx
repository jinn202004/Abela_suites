import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { fetchRooms } from '../api/guestApi'
import GuestHeader from './GuestHeader'
import { GUEST_ROOMS } from './guestRoomsData'
import RoomReservationModal from './RoomReservationModal'
import './GuestRoomsPage.css'

const AVAILABILITY_HASH = 'guest-room-availability'

export default function GuestRoomsPage() {
  const location = useLocation()
  const [reservationOpen, setReservationOpen] = useState(false)
  const [reservationRoom, setReservationRoom] = useState(null)
  const [browseCheckIn, setBrowseCheckIn] = useState('')
  const [browseCheckOut, setBrowseCheckOut] = useState('')
  const [browseGuests, setBrowseGuests] = useState(1)
  const [availabilityError, setAvailabilityError] = useState('')
  const [bookingNotice, setBookingNotice] = useState(null)
  const [rooms, setRooms] = useState([])
  const [roomsLoading, setRoomsLoading] = useState(true)
  const [roomsFromApi, setRoomsFromApi] = useState(false)

  useEffect(() => {
    let cancelled = false
    setRoomsLoading(true)
    fetchRooms()
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setRooms(data)
          setRoomsFromApi(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRooms(GUEST_ROOMS)
          setRoomsFromApi(false)
        }
      })
      .finally(() => {
        if (!cancelled) setRoomsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (location.hash === `#${AVAILABILITY_HASH}`) {
      requestAnimationFrame(() => {
        document.getElementById(AVAILABILITY_HASH)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [location.hash, location.pathname])

  useEffect(() => {
    if (!bookingNotice) return
    const id = window.setTimeout(() => setBookingNotice(null), 6500)
    return () => window.clearTimeout(id)
  }, [bookingNotice])

  const handleAvailabilityClick = () => {
    setAvailabilityError('')
    if (browseCheckIn && browseCheckOut) {
      const a = new Date(`${browseCheckIn}T12:00:00`)
      const b = new Date(`${browseCheckOut}T12:00:00`)
      if (Number.isFinite(a.getTime()) && Number.isFinite(b.getTime()) && b < a) {
        setAvailabilityError('Check-out must be on or after check-in.')
        return
      }
    }
    document.getElementById('guest-rooms-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const openReservation = (room) => {
    setReservationRoom(room)
    setReservationOpen(true)
  }

  const closeReservation = () => {
    setReservationOpen(false)
    setReservationRoom(null)
  }

  const sortedRooms = useMemo(
    () =>
      [...rooms].sort((a, b) =>
        String(a.roomNumber ?? '').localeCompare(String(b.roomNumber ?? ''), undefined, { numeric: true }),
      ),
    [rooms],
  )

  const additionalGuestsForModal = Math.max(0, browseGuests - 1)

  return (
    <>
      <RoomReservationModal
        isOpen={reservationOpen}
        onClose={closeReservation}
        room={reservationRoom}
        initialCheckIn={browseCheckIn}
        initialCheckOut={browseCheckOut}
        initialAdditionalGuests={additionalGuestsForModal}
        onSuccess={() =>
          setBookingNotice('Reservation saved. View it under Your Bookings on the home page.')
        }
      />
      <GuestHeader />
      <div className="guest-rooms-page">
        <section
          className="guest-rooms__availability"
          id={AVAILABILITY_HASH}
          aria-label="Check availability"
        >
          <div className="guest-rooms__availability-inner">
            <label className="guest-rooms__field">
              <span className="guest-rooms__field-label">Check In Date</span>
              <span className="guest-rooms__input-wrap">
                <IconCalendar />
                <input
                  className="guest-rooms__input"
                  type="date"
                  name="browseCheckIn"
                  value={browseCheckIn}
                  onChange={(e) => {
                    setBrowseCheckIn(e.target.value)
                    setAvailabilityError('')
                  }}
                />
              </span>
            </label>
            <label className="guest-rooms__field">
              <span className="guest-rooms__field-label">Check Out Date</span>
              <span className="guest-rooms__input-wrap">
                <IconCalendar />
                <input
                  className="guest-rooms__input"
                  type="date"
                  name="browseCheckOut"
                  value={browseCheckOut}
                  onChange={(e) => {
                    setBrowseCheckOut(e.target.value)
                    setAvailabilityError('')
                  }}
                />
              </span>
            </label>
            <label className="guest-rooms__field">
              <span className="guest-rooms__field-label">Guests</span>
              <span className="guest-rooms__input-wrap guest-rooms__input-wrap--guests">
                <input
                  className="guest-rooms__input guest-rooms__input--guests"
                  type="number"
                  name="browseGuests"
                  min={1}
                  max={99}
                  step={1}
                  value={browseGuests}
                  onChange={(e) => {
                    const v = e.target.value
                    if (v === '') {
                      setBrowseGuests(1)
                      setAvailabilityError('')
                      return
                    }
                    const n = Number(v)
                    setBrowseGuests(Number.isFinite(n) ? Math.min(99, Math.max(1, Math.floor(n))) : 1)
                    setAvailabilityError('')
                  }}
                  inputMode="numeric"
                />
              </span>
            </label>
            <div className="guest-rooms__availability-action">
              <button type="button" className="guest-rooms__availability-btn" onClick={handleAvailabilityClick}>
                Availability
              </button>
            </div>
          </div>
          {availabilityError && (
            <p className="guest-rooms__availability-error" role="status">
              {availabilityError}
            </p>
          )}
        </section>

        <main className="guest-rooms__main">
          {roomsLoading && (
            <p className="guest-rooms__api-hint" role="status">
              Loading rooms…
            </p>
          )}
          {!roomsLoading && !roomsFromApi && (
            <p className="guest-rooms__api-hint guest-rooms__api-hint--warn" role="status">
              API unavailable — showing cached room list. Start the mock server with{' '}
              <code className="guest-rooms__code">npm run api</code> or use{' '}
              <code className="guest-rooms__code">npm run dev:full</code>.
            </p>
          )}
          {bookingNotice && (
            <p className="guest-rooms__booking-notice" role="status">
              {bookingNotice}
            </p>
          )}
          {!roomsLoading && (
            <ul className="guest-rooms__list" id="guest-rooms-list">
              {sortedRooms.map((room) => {
                const hasNum = room.roomNumber != null && String(room.roomNumber).trim() !== ''
                const hasPkg = room.package != null && String(room.package).trim() !== ''
                return (
                  <li key={room.id}>
                    <article className="guest-rooms__card">
                      <div className="guest-rooms__card-media">
                        <img src={room.image} alt="" loading="lazy" />
                      </div>
                      <div className="guest-rooms__card-body">
                        <h2 className="guest-rooms__card-title">
                          {hasNum ? `Room ${room.roomNumber}` : room.title}
                        </h2>
                        {hasNum && <p className="guest-rooms__card-subtitle">{room.title}</p>}
                        {hasPkg && (
                          <p className="guest-rooms__card-meta">
                            <span>
                              <span className="guest-rooms__card-meta-label">Bed: </span>
                              {room.package}
                            </span>
                          </p>
                        )}
                        <p className="guest-rooms__card-pricing">
                          <span className="guest-rooms__price">{room.price}</span>
                        </p>
                        <p className="guest-rooms__card-capacity">
                          <IconPerson />
                          <span>{room.guests} Guest{room.guests !== 1 ? 's' : ''}</span>
                        </p>
                        <p className="guest-rooms__card-desc">{room.description}</p>
                        <ul className="guest-rooms__features">
                          {(room.features ?? []).map((f) => (
                            <li key={f} className="guest-rooms__feature">
                              <IconCheck />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <div className="guest-rooms__card-footer">
                          <button
                            type="button"
                            className="guest-rooms__book-btn"
                            onClick={() => openReservation(room)}
                          >
                            Book Now
                          </button>
                        </div>
                      </div>
                    </article>
                  </li>
                )
              })}
            </ul>
          )}
        </main>
      </div>
    </>
  )
}

function IconCalendar() {
  return (
    <svg className="guest-rooms__field-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 11h18" strokeLinecap="round" />
    </svg>
  )
}

function IconPerson() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg className="guest-rooms__check" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
