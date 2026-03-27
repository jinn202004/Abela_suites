import { useCallback, useState } from 'react'
import GuestBookingsSection from './GuestBookingsSection'
import GuestEventBookingsSection from './GuestEventBookingsSection'
import GuestHeader from './GuestHeader'
import GuestHeroCarousel from './GuestHeroCarousel'
import './GuestHomePage.css'

const TABS = [
  { id: 'rooms', label: 'Room bookings' },
  { id: 'events', label: 'Event bookings' },
]

export default function GuestHomePage() {
  const [bookingTab, setBookingTab] = useState('rooms')

  const onTabKeyDown = useCallback(
    (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      const i = TABS.findIndex((t) => t.id === bookingTab)
      const next =
        e.key === 'ArrowRight' ? Math.min(i + 1, TABS.length - 1) : Math.max(i - 1, 0)
      setBookingTab(TABS[next].id)
      document.getElementById(`guest-home-tab-${TABS[next].id}`)?.focus()
    },
    [bookingTab],
  )

  return (
    <>
      <GuestHeader />
      <GuestHeroCarousel />
      <div className="guest-home-bookings">
        <div
          className="guest-home-bookings__tablist"
          role="tablist"
          aria-label="Booking type"
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              id={`guest-home-tab-${t.id}`}
              role="tab"
              className="guest-home-bookings__tab"
              aria-selected={bookingTab === t.id}
              aria-controls={`guest-home-panel-${t.id}`}
              tabIndex={bookingTab === t.id ? 0 : -1}
              onClick={() => setBookingTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div
          id="guest-home-panel-rooms"
          role="tabpanel"
          aria-labelledby="guest-home-tab-rooms"
          hidden={bookingTab !== 'rooms'}
        >
          <GuestBookingsSection />
        </div>
        <div
          id="guest-home-panel-events"
          role="tabpanel"
          aria-labelledby="guest-home-tab-events"
          hidden={bookingTab !== 'events'}
        >
          <GuestEventBookingsSection />
        </div>
      </div>
    </>
  )
}
