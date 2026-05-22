import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/AuthContext'
import { useToast } from '../../hooks/ToastContext'
import { messageFromError } from '../../hooks/usePageNotify'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import './auth-screens.css'

export function LoginPage() {
  const { signInWithStaffCredentials, signedIn, initializing } = useAuth()
  const { showError } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
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
            <h1 className="auth-title">Staff sign in</h1>
            <p className="auth-subtitle">Use your lab staff account (admin, technician, reception, or manager).</p>

            <form
              className="auth-stack"
              style={{ marginTop: '2rem' }}
              onSubmit={(e) => {
                e.preventDefault()
                setSubmitting(true)
                void (async () => {
                  try {
                    await signInWithStaffCredentials(email, password, remember)
                    navigate('/')
                  } catch (err) {
                    showError(messageFromError(err, 'Sign-in failed'))
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
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
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
