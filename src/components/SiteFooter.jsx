import './SiteFooter.css'

export default function SiteFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <p className="site-footer__line">
        © {year} Abela Suites. All rights reserved.
      </p>
      <p className="site-footer__tagline">
        Experience comfort and hospitality at its finest.
      </p>
    </footer>
  )
}
