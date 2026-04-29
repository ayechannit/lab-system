import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useMockAuth } from '../../hooks/MockAuthContext'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import './auth-screens.css'

export function LoginPage() {
  const { signIn, signedIn } = useMockAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)

  if (signedIn) return <Navigate to="/" replace />

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
            <p className="auth-subtitle">Please sign in to access your laboratory workspace.</p>

            <form
              className="auth-stack"
              style={{ marginTop: '2rem' }}
              onSubmit={(e) => {
                e.preventDefault()
                signIn()
                navigate('/')
              }}
            >
              <div className="auth-field">
                <label className="auth-label" htmlFor="identity">
                  Email or Username
                </label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">mail</span>
                  <input
                    id="identity"
                    name="identity"
                    className="auth-input"
                    placeholder="Enter your clinical ID"
                    type="text"
                    autoComplete="username"
                    defaultValue="staff@MedLab Smart .demo"
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
                    defaultValue="demo"
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
                />
                <label className="auth-checkbox-label" htmlFor="remember">
                  Keep me logged in for 30 days
                </label>
              </div>

              <button type="submit" className="auth-primary-btn">
                Sign In to MedLab Smart 
              </button>
            </form>

            <div className="auth-bottom-link">
              <span>New to MedLab Smart ? </span>
              <Link to="/signup">Create Account</Link>
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
