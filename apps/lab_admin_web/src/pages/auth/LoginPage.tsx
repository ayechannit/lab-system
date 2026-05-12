import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/AuthContext'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import './auth-screens.css'

export function LoginPage() {
  const { signInWithUserCredentials, signedIn, initializing } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const registered = Boolean((location.state as { registered?: boolean } | null)?.registered)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!initializing && signedIn) return <Navigate to="/" replace />

  return (
    <div className="auth-split">
      <AuthMarketingPanel
        heroImage={authImages.loginHero}
        headline="Advancing Science through Precision."
        lead="Join thousands of clinical professionals managing laboratory workflows with state-of-the-art security and compliance."
      />
      <div className="auth-side">
        <header className="auth-mobile-header">
          <div className="auth-mobile-brand">
            <span className="material-symbols-outlined">biotech</span>
            <span>MedLab Smart </span>
          </div>
          <a className="auth-help-link" href="#">
            Help
          </a>
        </header>
        <div className="auth-main">
          <div className="auth-form-wrap auth-form-wrap--login">
            <div className="auth-icon-tile">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <h1 className="auth-title">Welcome Back</h1>
            <p className="auth-subtitle">Sign in with your user account (email and password).</p>

            {registered ? (
              <p style={{ margin: '0.5rem 0 0', color: '#0d8a5b', fontSize: '0.875rem' }}>
                Account created. Sign in here with the same email and password you used at registration.
              </p>
            ) : null}

            <form
              className="auth-stack"
              style={{ marginTop: '2rem' }}
              onSubmit={(e) => {
                e.preventDefault()
                setError(null)
                setSubmitting(true)
                void (async () => {
                  try {
                    await signInWithUserCredentials(email, password, remember)
                    navigate('/')
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Sign-in failed')
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              {error ? (
                <p style={{ margin: 0, color: '#b91c1c', fontSize: '0.875rem' }} role="alert">
                  {error}
                </p>
              ) : null}
              <div className="auth-field">
                <label className="auth-label" htmlFor="identity">
                  Email
                </label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">mail</span>
                  <input
                    id="identity"
                    name="identity"
                    className="auth-input"
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="auth-field">
                <div className="auth-label-row">
                  <label className="auth-label" htmlFor="password">
                    Password
                  </label>
                  <a className="auth-link" href="#">
                    Forgot Password?
                  </a>
                </div>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="password"
                    name="password"
                    className="auth-input auth-input--password"
                    placeholder="••••••••"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={submitting}
                    required
                  />
                  <button
                    type="button"
                    className="auth-toggle-vis"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    <span className="material-symbols-outlined">
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="auth-checkbox-row auth-checkbox-row--center">
                <input
                  id="remember"
                  className="auth-checkbox"
                  type="checkbox"
                  checked={remember}
                  onChange={() => setRemember((v) => !v)}
                  disabled={submitting}
                />
                <label className="auth-checkbox-label" htmlFor="remember">
                  Keep me logged in on this device
                </label>
              </div>

              <button type="submit" className="auth-primary-btn" disabled={submitting}>
                {submitting ? 'Signing in…' : 'Sign In to MedLab Smart '}
              </button>
            </form>

            <div className="auth-bottom-link">
              <span>New patient / clinic / doctor account? </span>
              <Link to="/signup">Create Account</Link>
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
