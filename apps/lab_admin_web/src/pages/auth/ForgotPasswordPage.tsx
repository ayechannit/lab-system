import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../hooks/AuthContext'
import { useToast } from '../../hooks/ToastContext'
import { messageFromError } from '../../hooks/usePageNotify'
import { requestPasswordReset, resetPasswordWithCode } from '../../services/authService'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import { AuthScreenHeader } from './AuthScreenHeader'
import './auth-screens.css'

type Step = 'request' | 'reset'

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { signedIn, initializing } = useAuth()
  const { showError, showSuccess } = useToast()
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!initializing && signedIn) return <Navigate to="/" replace />

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await requestPasswordReset(email)
      showSuccess(result.message || t('auth.codeSent'))
      setStep('reset')
    } catch (err) {
      showError(messageFromError(err, t('auth.sendCodeFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      showError(t('auth.passwordMinLength'))
      return
    }
    if (newPassword !== confirmPassword) {
      showError(t('auth.passwordMismatch'))
      return
    }
    if (code.trim().length !== 6) {
      showError(t('auth.codeRequired'))
      return
    }

    setSubmitting(true)
    try {
      const result = await resetPasswordWithCode(email, code, newPassword)
      showSuccess(result.message || t('auth.resetSuccess'))
      navigate('/login', { replace: true })
    } catch (err) {
      showError(messageFromError(err, t('auth.resetFailed')))
    } finally {
      setSubmitting(false)
    }
  }

  const resetEmailLabel = email.trim() || t('auth.resetSubtitleFallbackEmail')

  return (
    <div className="auth-split">
      <AuthMarketingPanel
        heroImage={authImages.loginHero}
        headline={t('auth.marketingHeadline')}
        lead={t('auth.marketingLead')}
      />
      <div className="auth-side">
        <AuthScreenHeader
          trailing={
            <Link className="auth-help-link" to="/login">
              {t('auth.signIn')}
            </Link>
          }
        />
        <div className="auth-main">
          <div className="auth-form-wrap auth-form-wrap--login">
            <div className="auth-icon-tile">
              <span className="material-symbols-outlined">
                {step === 'request' ? 'mark_email_unread' : 'pin'}
              </span>
            </div>
            <h1 className="auth-title">{step === 'request' ? t('auth.forgotTitle') : t('auth.resetTitle')}</h1>
            <p className="auth-subtitle">
              {step === 'request'
                ? t('auth.forgotSubtitle')
                : t('auth.resetSubtitle', { email: resetEmailLabel })}
            </p>

            {step === 'request' ? (
              <form className="auth-stack" style={{ marginTop: '2rem' }} onSubmit={handleRequestCode}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="forgot-email">
                    {t('auth.email')}
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">mail</span>
                    <input
                      id="forgot-email"
                      name="email"
                      className="auth-input"
                      placeholder={t('auth.emailPlaceholder')}
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-primary-btn" disabled={submitting}>
                  {submitting ? t('auth.sendingCode') : t('auth.sendCode')}
                </button>

                <Link className="auth-back-link" to="/login">
                  <span className="material-symbols-outlined" aria-hidden>
                    arrow_back
                  </span>
                  {t('auth.backToSignIn')}
                </Link>
              </form>
            ) : (
              <form className="auth-stack" style={{ marginTop: '2rem' }} onSubmit={handleResetPassword}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reset-code">
                    {t('auth.verificationCode')}
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">pin</span>
                    <input
                      id="reset-code"
                      name="code"
                      className="auth-input auth-input--code"
                      placeholder={t('auth.codePlaceholder')}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      pattern="[0-9]{6}"
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      disabled={submitting}
                      required
                    />
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label" htmlFor="new-password">
                    {t('auth.newPassword')}
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock</span>
                    <input
                      id="new-password"
                      name="new_password"
                      className="auth-input auth-input--password"
                      placeholder={t('auth.newPasswordPlaceholder')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={submitting}
                      minLength={8}
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

                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirm-password">
                    {t('auth.confirmPassword')}
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock_reset</span>
                    <input
                      id="confirm-password"
                      name="confirm_password"
                      className="auth-input"
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={submitting}
                      minLength={8}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-primary-btn" disabled={submitting}>
                  {submitting ? t('auth.updatingPassword') : t('auth.resetPassword')}
                </button>

                <div className="auth-reset-actions">
                  <button
                    type="button"
                    className="auth-text-btn"
                    disabled={submitting}
                    onClick={() => {
                      setStep('request')
                      setCode('')
                      setNewPassword('')
                      setConfirmPassword('')
                    }}
                  >
                    {t('auth.useDifferentEmail')}
                  </button>
                  <button
                    type="button"
                    className="auth-text-btn"
                    disabled={submitting}
                    onClick={() => {
                      void (async () => {
                        setSubmitting(true)
                        try {
                          const result = await requestPasswordReset(email)
                          showSuccess(result.message || t('auth.codeResent'))
                          setCode('')
                        } catch (err) {
                          showError(messageFromError(err, t('auth.resendCodeFailed')))
                        } finally {
                          setSubmitting(false)
                        }
                      })()
                    }}
                  >
                    {t('auth.resendCode')}
                  </button>
                </div>

                <Link className="auth-back-link" to="/login">
                  <span className="material-symbols-outlined" aria-hidden>
                    arrow_back
                  </span>
                  {t('auth.backToSignIn')}
                </Link>
              </form>
            )}
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
