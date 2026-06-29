import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/AuthContext'
import { useToast } from '../../hooks/ToastContext'
import { messageFromError } from '../../hooks/usePageNotify'
import { getRememberPreference, getSavedLoginEmail, setRememberPreference } from '../../services/authSession'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import { AuthScreenHeader } from './AuthScreenHeader'
import './auth-screens.css'

export function LoginPage() {
  const { t } = useTranslation()
  const { signInWithStaffCredentials, signedIn, initializing } = useAuth()
  const { showError } = useToast()
  const navigate = useNavigate()
  const [email, setEmail] = useState(() => getSavedLoginEmail())
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(() => getRememberPreference())
  const [submitting, setSubmitting] = useState(false)

  if (!initializing && signedIn) return <Navigate to="/" replace />

  return (
    <div className="auth-split">
      <AuthMarketingPanel
        heroImage={authImages.loginHero}
        headline={t('auth.marketingHeadline')}
        lead={t('auth.marketingLead')}
      />
      <div className="auth-side">
        <AuthScreenHeader />
        <div className="auth-main">
          <div className="auth-form-wrap auth-form-wrap--login">
            <div className="auth-icon-tile">
              <span className="material-symbols-outlined">shield_person</span>
            </div>
            <h1 className="auth-title">{t('auth.staffSignIn')}</h1>
            <p className="auth-subtitle">{t('auth.staffSignInHint')}</p>

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
                    showError(messageFromError(err, t('auth.signInFailed')))
                  } finally {
                    setSubmitting(false)
                  }
                })()
              }}
            >
              <div className="auth-field">
                <label className="auth-label" htmlFor="identity">
                  {t('auth.email')}
                </label>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">mail</span>
                  <input
                    id="identity"
                    name="identity"
                    className="auth-input"
                    placeholder={t('auth.emailPlaceholder')}
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
                    {t('auth.password')}
                  </label>
                  <Link className="auth-link" to="/forgot-password">
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <div className="auth-input-wrap">
                  <span className="material-symbols-outlined auth-input-icon">lock</span>
                  <input
                    id="password"
                    name="password"
                    className="auth-input auth-input--password"
                    placeholder={t('auth.passwordPlaceholder')}
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
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
                  onChange={() => {
                    setRemember((v) => {
                      const next = !v
                      setRememberPreference(next)
                      return next
                    })
                  }}
                  disabled={submitting}
                />
                <label className="auth-checkbox-label" htmlFor="remember">
                  {t('auth.rememberMe')}
                </label>
              </div>

              <button type="submit" className="auth-primary-btn" disabled={submitting}>
                {submitting ? t('auth.signingIn') : t('auth.signIn')}
              </button>
            </form>
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
