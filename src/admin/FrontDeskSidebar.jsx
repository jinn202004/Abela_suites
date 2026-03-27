import { NavLink } from 'react-router-dom'
import { useSidebarLayout } from '../layout/SidebarLayoutContext'
import './AdminSidebar.css'

const NAV = [
  { to: '/frontdesk', end: true, label: 'Dashboard', Icon: IconGrid },
  { to: '/frontdesk/rooms', label: 'Room', Icon: IconBed },
  { to: '/frontdesk/events', label: 'Event', Icon: IconParty },
  { to: '/frontdesk/housekeeping', label: 'Housekeeping', Icon: IconBucket },
  { to: '/frontdesk/bills', label: 'Bills', Icon: IconInvoice },
  { to: '/frontdesk/reservation-history', label: 'Reservation History', Icon: IconClock },
  { to: '/frontdesk/settings', label: 'Settings', Icon: IconGear },
]

export default function FrontDeskSidebar() {
  const { sidebarCollapsed } = useSidebarLayout()

  return (
    <aside
      id="admin-sidebar"
      className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`.trim()}
      aria-label="Front desk navigation"
    >
      <div className="admin-sidebar__brand">
        <div className="admin-sidebar__logo-circle">
          <svg className="admin-sidebar__palm" viewBox="0 0 48 48" aria-hidden>
            <path
              fill="currentColor"
              d="M24 8c-2 8-8 14-16 18 2-6 6-10 12-12C14 22 8 30 6 40c8-4 14-12 18-22v22h4V18c4 10 10 18 18 22-2-10-8-18-16-22 6 2 10 6 12 12-8-4-14-10-16-18z"
            />
          </svg>
          <span className="admin-sidebar__logo-text">ABELA</span>
          <span className="admin-sidebar__logo-text admin-sidebar__logo-text--sm">SUITES</span>
        </div>
      </div>
      <nav className="admin-sidebar__nav">
        <ul className="admin-sidebar__list">
          {NAV.map(({ to, end, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `admin-sidebar__link ${isActive ? 'admin-sidebar__link--active' : ''}`.trim()
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

function IconGrid() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z" strokeLinejoin="round" />
    </svg>
  )
}

function IconBed() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M3 14V8a2 2 0 012-2h3v12H5a2 2 0 01-2-2Z" />
      <path d="M8 6h11a3 3 0 013 3v7H8V6Z" />
      <path d="M3 18v2M21 18v2" strokeLinecap="round" />
    </svg>
  )
}

function IconParty() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 20l4-14 4 3 3-5 5 12" strokeLinejoin="round" />
      <path d="M9 10l-5 10" strokeLinecap="round" />
    </svg>
  )
}

function IconBucket() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 10h16l-1 10a2 2 0 01-2 2H7a2 2 0 01-2-2L4 10Z" strokeLinejoin="round" />
      <path d="M8 10V6a2 2 0 012-2h4a2 2 0 012 2v4" strokeLinecap="round" />
      <path d="M9 14h6" strokeLinecap="round" />
    </svg>
  )
}

function IconInvoice() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6Z" strokeLinejoin="round" />
      <path d="M14 2v6h6" strokeLinejoin="round" />
      <path d="M16 13H8M16 17H8M10 9H8" strokeLinecap="round" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6l4 2" strokeLinecap="round" />
    </svg>
  )
}

function IconGear() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  )
}
