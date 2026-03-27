import AdminHeader from './AdminHeader'
import { BookingOverviewChart, SalesReportChart } from './AdminDashboardCharts'
import { DASHBOARD_STATS, PAYMENT_METHODS, RECENT_BOOKINGS } from './adminDashboardData'
import './AdminHomePage.css'

export default function AdminHomePage() {
  return (
    <>
      <AdminHeader />
      <main className="admin-home">
        <header className="admin-home__intro-block">
          <h1 className="admin-home__heading">Abela&apos;s Dashboard</h1>
          <p className="admin-home__sub">Overview of key metrics and performance indicators.</p>
        </header>

        <section className="admin-home__stats" aria-label="Summary metrics">
          <article className="admin-home__stat-card">
            <h2 className="admin-home__stat-label">Today&apos;s Booking</h2>
            <p className="admin-home__stat-value">{DASHBOARD_STATS.todayBookings}</p>
          </article>
          <article className="admin-home__stat-card">
            <h2 className="admin-home__stat-label">Upcoming Bookings</h2>
            <p className="admin-home__stat-value">{DASHBOARD_STATS.upcomingBookings}</p>
          </article>
          <article className="admin-home__stat-card">
            <h2 className="admin-home__stat-label">Available Rooms</h2>
            <p className="admin-home__stat-value">{DASHBOARD_STATS.availableRooms}</p>
          </article>
          <article className="admin-home__stat-card">
            <h2 className="admin-home__stat-label">Today&apos;s Revenue</h2>
            <p className="admin-home__stat-value admin-home__stat-value--money">{DASHBOARD_STATS.todayRevenue}</p>
          </article>
        </section>

        <section className="admin-home__row admin-home__row--split" aria-label="Bookings">
          <div className="admin-home__panel">
            <div className="admin-home__panel-head">
              <h2 className="admin-home__panel-title">Booking Overview</h2>
              <span className="admin-home__panel-tag">Last 7 days</span>
            </div>
            <BookingOverviewChart />
          </div>
          <div className="admin-home__panel admin-home__panel--recent">
            <h2 className="admin-home__panel-title">Recent Booking</h2>
            <ul className="admin-home__recent-list">
              {RECENT_BOOKINGS.map(({ id, name, status }) => (
                <li key={id} className="admin-home__recent-item">
                  <span className="admin-home__recent-name">{name}</span>
                  <span className={`admin-home__badge admin-home__badge--${status}`}>{statusLabel(status)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="admin-home__row admin-home__row--sales" aria-label="Sales report">
          <div className="admin-home__panel admin-home__panel--wide">
            <h2 className="admin-home__panel-title">Sales Report</h2>
            <SalesReportChart />
          </div>
          <div className="admin-home__panel admin-home__panel--pay">
            <h2 className="admin-home__panel-title">Payment Methods</h2>
            <ul className="admin-home__pay-list">
              {PAYMENT_METHODS.map(({ id, label, amount }) => (
                <li key={id} className="admin-home__pay-item">
                  <span className="admin-home__pay-label">{label}</span>
                  <span className="admin-home__pay-amount">{amount}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
    </>
  )
}

function statusLabel(status) {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  if (status === 'pending') return 'Pending'
  return status
}
