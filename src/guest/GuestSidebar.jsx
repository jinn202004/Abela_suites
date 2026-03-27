import { NavLink } from 'react-router-dom'
import { useGuestLayout } from './GuestLayoutContext'
import './GuestSidebar.css'

const NAV = [
  { to: '/guest', end: true, label: 'Homepage', Icon: IconHome },
  { to: '/guest/rooms', label: 'Rooms', Icon: IconBed },
  { to: '/guest/events', label: 'Event Venues', Icon: IconParty },
  { to: '/guest/settings', label: 'Settings', Icon: IconGear },
]

export default function GuestSidebar() {
  const { sidebarCollapsed } = useGuestLayout()

  return (
    <aside
      id="guest-sidebar"
      className={`guest-sidebar ${sidebarCollapsed ? 'guest-sidebar--collapsed' : ''}`.trim()}
      aria-label="Guest navigation"
    >
      <div className="guest-sidebar__brand">
        <div className="guest-sidebar__logo-circle">
          <svg className="guest-sidebar__palm" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="currentColor"
              d="M24 8c-2 8-8 14-16 18 2-6 6-10 12-12C14 22 8 30 6 40c8-4 14-12 18-22v22h4V18c4 10 10 18 18 22-2-10-8-18-16-22 6 2 10 6 12 12-8-4-14-10-16-18z"
            />
          </svg>
          <span className="guest-sidebar__logo-text">ABELA</span>
          <span className="guest-sidebar__logo-text guest-sidebar__logo-text--sm">SUITES</span>
        </div>
      </div>
      <nav className="guest-sidebar__nav">
        <ul className="guest-sidebar__list">
          {NAV.map(({ to, end, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `guest-sidebar__link ${isActive ? 'guest-sidebar__link--active' : ''}`.trim()
                }
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  )
}

function IconHome() {
  return (
    <svg className="guest-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 10.5 12 4l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5Z" strokeLinejoin="round" />
      <path d="M9 21V12h6v9" strokeLinejoin="round" />
    </svg>
  )
}

function IconBed() {
  return (
    <svg className="guest-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 14V8a2 2 0 012-2h3v12H5a2 2 0 01-2-2Z" />
      <path d="M8 6h11a3 3 0 013 3v7H8V6Z" />
      <path d="M3 18v2M21 18v2" strokeLinecap="round" />
    </svg>
  )
}

function IconParty() {
  return (
    <svg className="guest-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 20l4-14 4 3 3-5 5 12" strokeLinejoin="round" />
      <path d="M9 10l-5 10" strokeLinecap="round" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg className="guest-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  )
}
