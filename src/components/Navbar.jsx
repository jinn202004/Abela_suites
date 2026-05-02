import { Link } from 'react-router-dom'
import AbelaLogo from './AbelaLogo'
import Button from './Button'
import './Navbar.css'

const LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#testimonials', label: 'Testimonials' },
  { to: '/contact', label: 'Contact Us' },
]

export default function Navbar({ onLoginClick = () => {} }) {
  return (
    <header className="navbar">
      <a href="#home" className="navbar__brand">
        <AbelaLogo className="navbar__mark" />
        <span className="navbar__title">Abela Suites</span>
      </a>

      <nav className="navbar__nav" aria-label="Main">
        <ul className="navbar__links">
          {LINKS.map((item) => (
            <li key={item.href ?? item.to}>
              {'href' in item ? (
                <a href={item.href}>{item.label}</a>
              ) : (
                <Link to={item.to}>{item.label}</Link>
              )}
            </li>
          ))}
        </ul>
      </nav>

      <Button
        type="button"
        variant="nav"
        className="navbar__login"
        onClick={onLoginClick}
      >
        Login
      </Button>
    </header>
  )
}
