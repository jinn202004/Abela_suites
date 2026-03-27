import AdminHeader from './AdminHeader'
import './AdminPlaceholderPage.css'

export default function AdminPlaceholderPage({ title }) {
  return (
    <>
      <AdminHeader />
      <main className="admin-placeholder-page">
        {title && <h1 className="admin-placeholder-page__title">{title}</h1>}
        <p className="admin-placeholder-page__text">This admin section is coming soon.</p>
      </main>
    </>
  )
}
