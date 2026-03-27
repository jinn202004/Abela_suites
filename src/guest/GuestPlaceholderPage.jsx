import GuestHeader from './GuestHeader'
import './GuestPlaceholderPage.css'

export default function GuestPlaceholderPage({ title }) {
  return (
    <>
      <GuestHeader />
      <main className="guest-placeholder-page">
        <h1 className="guest-placeholder-page__title">{title}</h1>
        <p className="guest-placeholder-page__text">This section is coming soon.</p>
      </main>
    </>
  )
}
