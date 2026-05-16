import { useId, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AbelaLogo from '../components/AbelaLogo'
import Button from '../components/Button'
import ModalFrame from '../components/ModalFrame'
import PasswordField from '../components/PasswordField'
import { tryCredentials } from './tryCredentials'
import './LoginModal.css'

export default function LoginModal({ isOpen, onClose, onForgotPassword, onLoginSuccess, notice = '' }) {
  const navigate = useNavigate()
  const titleId = useId()
  const [remember, setRemember] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await tryCredentials(username, password)
    if (result.ok) {
      setError('')
      onLoginSuccess?.(result.role)
      return
    }
    if (result.reason === 'network') {
      setError('Cannot reach the login server. Wait a few seconds and try again, or check the backend (port 5000).')
    } else if (result.reason === 'server') {
      setError(
        result.message ||
          'The login server returned an error. Check the backend terminal and JWT_SECRET / MongoDB.',
      )
    } else {
      setError(
        result.message ||
          'Invalid username or password. For an email address, register first or remove extra spaces in your password.',
      )
    }
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
        {notice ? (
          <p className="login-modal__notice" role="status">
            {notice}
          </p>
        ) : null}

        <div className="login-modal__field">
          <label className="login-modal__label" htmlFor="login-username">
            Email or username
          </label>
          <input
            id="login-username"
            className="login-modal__input"
            type="text"
            name="username"
            autoComplete="username"
            placeholder="e.g. you@email.com or admin"
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
        <a
          href="/signup"
          className="login-modal__signup"
          onClick={(e) => {
            e.preventDefault()
            onClose?.()
            navigate('/signup')
          }}
        >
          Sign Up
        </a>
      </p>
    </ModalFrame>
  )
}
