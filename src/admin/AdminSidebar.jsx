import { NavLink } from 'react-router-dom'
import { useSidebarLayout } from '../layout/SidebarLayoutContext'
import './AdminSidebar.css'

const NAV = [
  { to: '/admin', end: true, label: 'Dashboard', Icon: IconGrid },
  { to: '/admin/staff', label: 'Staff Management', Icon: IconStaff },
  { to: '/admin/bookings', label: 'Booking Management', Icon: IconClipboard },
  { to: '/admin/rooms', label: 'Room Management', Icon: IconBed },
  { to: '/admin/events', label: 'Event Management', Icon: IconParty },
  { to: '/admin/inventory', label: 'Inventory Management', Icon: IconBox },
  { to: '/admin/restaurant', label: 'Restaurant Menu', Icon: IconRestaurant },
  { to: '/admin/bills', label: 'Bills and Invoices', Icon: IconInvoice },
  { to: '/admin/settings', label: 'Settings', Icon: IconGear },
]

export default function AdminSidebar() {
  const { sidebarCollapsed } = useSidebarLayout()

  return (
    <aside
      id="admin-sidebar"
      className={`admin-sidebar ${sidebarCollapsed ? 'admin-sidebar--collapsed' : ''}`.trim()}
      aria-label="Admin navigation"
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

function IconStaff() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M4 20v-1a3.5 3.5 0 013.5-3.5H9" strokeLinecap="round" />
      <path d="M20 20v-1a3.5 3.5 0 00-3.5-3.5H15" strokeLinecap="round" />
    </svg>
  )
}

function IconClipboard() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M9 4h6l1 2h3a1 1 0 011 1v2H4V7a1 1 0 011-1h3l1-2Z" strokeLinejoin="round" />
      <path d="M8 6h8" strokeLinecap="round" />
      <rect x="5" y="8" width="14" height="14" rx="1.5" />
      <path d="M9 12h6M9 16h4" strokeLinecap="round" />
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

function IconBox() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M21 8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" strokeLinejoin="round" />
      <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconRestaurant() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M4 6h10v14H4V6Z" strokeLinejoin="round" />
      <path d="M6 10h6M6 14h6M6 18h4" strokeLinecap="round" />
      <path d="M17 4v16M19 4v3M21 4v3" strokeLinecap="round" />
      <path d="M19 20v2M21 20v2" strokeLinecap="round" />
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

function IconGear() {
  return (
    <svg className="admin-sidebar__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeLinecap="round" />
    </svg>
  )
}
