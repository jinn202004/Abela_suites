import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { fetchNotifications } from '../api/guestApi'
import SidebarCollapseToggle from '../components/SidebarCollapseToggle'
import { useAuthRole } from '../context/AuthRoleContext'
import { useSidebarLayout } from '../layout/SidebarLayoutContext'
import {
  filterNotificationsForAudience,
  NOTIFICATIONS_REFRESH_EVENT,
  sortNotificationsNewestFirst,
} from '../guest/notificationFeed'
import { countUnreadNotifications, markNotificationIdsAsRead } from '../guest/notificationReadState'
import '../guest/GuestHeader.css'
import './AdminHeader.css'

const TITLE_BY_PATH = {
  '/admin': 'Dashboard',
  '/admin/staff': 'Staff Management',
  '/admin/bookings': 'Booking Management',
  '/admin/rooms': 'Room Management',
  '/admin/events': 'Event Management',
  '/admin/inventory': 'Inventory Management',
  '/admin/restaurant': 'Restaurant Menu',
  '/admin/bills': 'Bills and Invoices',
  '/admin/settings': 'Settings',
  '/admin/housekeeping': 'Housekeeping',
  '/admin/reservation-history': 'Reservation History',
  '/frontdesk': 'Dashboard',
  '/frontdesk/rooms': 'Room reservations',
  '/frontdesk/events': 'Event reservations',
  '/frontdesk/bills': 'Bills and Invoices',
  '/frontdesk/settings': 'Settings',
  '/frontdesk/housekeeping': 'Housekeeping',
  '/frontdesk/reservation-history': 'Reservation History',
}

export default function AdminHeader() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { setRole } = useAuthRole()
  const { sidebarCollapsed, toggleSidebar } = useSidebarLayout()
  const title = TITLE_BY_PATH[pathname] ?? 'Admin'
  const settingsPath = pathname.startsWith('/frontdesk') ? '/frontdesk/settings' : '/admin/settings'
  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const notifRef = useRef(null)
  const userRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetchNotifications()
        .then((data) => {
          if (!cancelled && Array.isArray(data)) {
            setNotifications(sortNotificationsNewestFirst(filterNotificationsForAudience(data, 'staff')))
          }
        })
        .catch(() => {
          if (!cancelled) setNotifications([])
        })
    }
    load()
    const onRefresh = () => load()
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
    return () => {
      cancelled = true
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, onRefresh)
    }
  }, [])

  const [readTick, setReadTick] = useState(0)

  const unreadCount = useMemo(
    () => countUnreadNotifications('staff', notifications),
    [notifications, readTick],
  )

  useEffect(() => {
    if (!notifOpen) return
    markNotificationIdsAsRead(
      'staff',
      notifications.map((n) => n.id),
    )
    setReadTick((t) => t + 1)
  }, [notifOpen, notifications])

  const showNotifBadge = unreadCount > 0
  const notifBadgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)

  useEffect(() => {
    const onDoc = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false)
      if (userRef.current && !userRef.current.contains(e.target)) setUserOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <header className="guest-header admin-header">
      <nav className="guest-header__crumb" aria-label="Breadcrumb">
        <SidebarCollapseToggle
          sidebarCollapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          sidebarId="admin-sidebar"
        />
        <span className="guest-header__crumb-current">{title}</span>
      </nav>

      <div className="guest-header__actions">
        <div className="guest-header__dropdown-wrap" ref={notifRef}>
          <button
            type="button"
            className="guest-header__icon-btn"
            aria-expanded={notifOpen}
            aria-haspopup="true"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((v) => !v)
              setUserOpen(false)
            }}
          >
            <IconBell />
            {showNotifBadge && <span className="guest-header__badge">{notifBadgeLabel}</span>}
          </button>
          {notifOpen && (
            <div className="guest-header__popover guest-header__popover--notif" role="menu">
              {notifications.length === 0 ? (
                <p className="guest-header__notif-empty">No notifications yet.</p>
              ) : (
                <ul className="guest-header__notif-list">
                  {notifications.map(({ id, message, date }) => (
                    <li key={id} className="guest-header__notif-item" role="presentation">
                      <p className="guest-header__notif-msg">{message}</p>
                      <time className="guest-header__notif-time" dateTime={date}>
                        {date}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="guest-header__dropdown-wrap" ref={userRef}>
          <button
            type="button"
            className="guest-header__user-btn"
            aria-expanded={userOpen}
            aria-haspopup="true"
            aria-label="Account menu"
            onClick={() => {
              setUserOpen((v) => !v)
              setNotifOpen(false)
            }}
          >
            <span className="guest-header__avatar" aria-hidden>
              <IconUser />
            </span>
            <IconChevronDown />
          </button>
          {userOpen && (
            <div className="guest-header__popover guest-header__popover--user" role="menu">
              <Link to={settingsPath} className="guest-header__menu-link" role="menuitem" onClick={() => setUserOpen(false)}>
                Settings
              </Link>
              <Link
                to="/"
                className="guest-header__menu-link"
                role="menuitem"
                onClick={() => {
                  setUserOpen(false)
                  setRole(null)
                  navigate('/', { replace: true })
                }}
              >
                Sign out
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

function IconBell() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M18 8a6 6 0 10-12 0c0 7-3 7-3 7h18s-3 0-3-7" strokeLinejoin="round" />
      <path d="M13.73 21a2 2 0 01-3.46 0" strokeLinecap="round" />
    </svg>
  )
}

function IconUser() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinejoin="round" />
    </svg>
  )
}

function IconChevronDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
