import { useId, useState } from 'react'
import { fetchStaff } from '../api/guestApi'
import AbelaLogo from './AbelaLogo'
import Button from './Button'
import ModalFrame from './ModalFrame'
import PasswordField from './PasswordField'
import './LoginModal.css'

const ACCOUNTS = {
  guest: { username: 'guest', password: '123' },
  admin: { username: 'admin', password: '123' },
  frontdesk: { username: 'frontdesk', password: '123' },
}

export default function LoginModal({ isOpen, onClose, onForgotPassword, onLoginSuccess }) {
  const titleId = useId()
  const [remember, setRemember] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const u = username.trim().toLowerCase()
    const p = password
    if (u === ACCOUNTS.guest.username && p === ACCOUNTS.guest.password) {
      setError('')
      onLoginSuccess?.('guest')
      return
    }
    if (u === ACCOUNTS.admin.username && p === ACCOUNTS.admin.password) {
      setError('')
      onLoginSuccess?.('admin')
      return
    }
    if (u === ACCOUNTS.frontdesk.username && p === ACCOUNTS.frontdesk.password) {
      setError('')
      onLoginSuccess?.('frontdesk')
      return
    }

    try {
      const list = await fetchStaff()
      if (Array.isArray(list)) {
        const row = list.find(
          (s) =>
            String(s.email ?? '')
              .trim()
              .toLowerCase() === u &&
            String(s.password ?? '') === p &&
            String(s.status ?? '').toLowerCase() !== 'inactive',
        )
        if (row) {
          const roleLabel = String(row.role ?? '').trim()
          setError('')
          if (roleLabel === 'Admin') {
            onLoginSuccess?.('admin')
          } else {
            onLoginSuccess?.('frontdesk')
          }
          return
        }
      }
    } catch {
      /* API offline — fall through */
    }

    setError('Invalid username or password.')
  }

  return (
    <ModalFrame isOpen={isOpen} onClose={onClose} ariaLabelledBy={titleId}>
      <div className="login-modal__brand">
        <AbelaLogo size={36} className="login-modal__logo-icon" />
        <p id={titleId} className="login-modal__brand-name">
          Abela Suites
        </p>
      </div>

      <form className="login-modal__form" onSubmit={handleSubmit} noValidate>
        <div className="login-modal__field">
          <label className="login-modal__label" htmlFor="login-username">
            Email
          </label>
          <input
            id="login-username"
            className="login-modal__input"
            type="text"
            name="username"
            autoComplete="username"
            placeholder="Email"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              setError('')
            }}
          />
        </div>

        <PasswordField
          id="login-password"
          label="Password"
          name="password"
          autoComplete="current-password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setError('')
          }}
        />

        <div className="login-modal__row">
          <label className="login-modal__remember">
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Remember me</span>
          </label>
          <button
            type="button"
            className="login-modal__link login-modal__link--btn"
            onClick={() => onForgotPassword?.()}
          >
            Forgot Password?
          </button>
        </div>

        {error && (
          <p className="login-modal__error" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="cta" className="login-modal__btn-primary">
          Log In
        </Button>
      </form>

      <p className="login-modal__footer">
        Don&apos;t have an account?{' '}
        <a href="#signup" className="login-modal__signup" onClick={(e) => e.preventDefault()}>
          Sign Up
        </a>
      </p>
    </ModalFrame>
  )
}
