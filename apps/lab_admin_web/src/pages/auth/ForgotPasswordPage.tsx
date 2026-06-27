import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
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
      showSuccess(result.message || 'Verification code sent.')
      setStep('reset')
    } catch (err) {
      showError(messageFromError(err, 'Could not send verification code'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      showError('Password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.')
      return
    }
    if (code.trim().length !== 6) {
      showError('Enter the 6-digit code from your email.')
      return
    }

    setSubmitting(true)
    try {
      const result = await resetPasswordWithCode(email, code, newPassword)
      showSuccess(result.message || 'Password reset successfully.')
      navigate('/login', { replace: true })
    } catch (err) {
      showError(messageFromError(err, 'Could not reset password'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-split">
      <AuthMarketingPanel
        heroImage={authImages.loginHero}
        headline="Advancing Science through Precision."
        lead="Join thousands of clinical professionals managing laboratory workflows with state-of-the-art security and compliance."
      />
      <div className="auth-side">
        <AuthScreenHeader
          trailing={
            <Link className="auth-help-link" to="/login">
              Sign in
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
            <h1 className="auth-title">
              {step === 'request' ? 'Forgot password' : 'Reset password'}
            </h1>
            <p className="auth-subtitle">
              {step === 'request'
                ? 'Enter your staff email and we will send a 6-digit verification code (valid for 15 minutes).'
                : `Enter the code sent to ${email.trim() || 'your email'} and choose a new password.`}
            </p>

            {step === 'request' ? (
              <form className="auth-stack" style={{ marginTop: '2rem' }} onSubmit={handleRequestCode}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="forgot-email">
                    Email
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">mail</span>
                    <input
                      id="forgot-email"
                      name="email"
                      className="auth-input"
                      placeholder="you@example.com"
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
                  {submitting ? 'Sending code…' : 'Send verification code'}
                </button>

                <Link className="auth-back-link" to="/login">
                  <span className="material-symbols-outlined" aria-hidden>
                    arrow_back
                  </span>
                  Back to sign in
                </Link>
              </form>
            ) : (
              <form className="auth-stack" style={{ marginTop: '2rem' }} onSubmit={handleResetPassword}>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="reset-code">
                    Verification code
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">pin</span>
                    <input
                      id="reset-code"
                      name="code"
                      className="auth-input auth-input--code"
                      placeholder="000000"
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
                    New password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock</span>
                    <input
                      id="new-password"
                      name="new_password"
                      className="auth-input auth-input--password"
                      placeholder="At least 8 characters"
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
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                    Confirm password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock_reset</span>
                    <input
                      id="confirm-password"
                      name="confirm_password"
                      className="auth-input"
                      placeholder="Re-enter new password"
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
                  {submitting ? 'Updating password…' : 'Reset password'}
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
                    Use a different email
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
                          showSuccess(result.message || 'A new code has been sent.')
                          setCode('')
                        } catch (err) {
                          showError(messageFromError(err, 'Could not resend code'))
                        } finally {
                          setSubmitting(false)
                        }
                      })()
                    }}
                  >
                    Resend code
                  </button>
                </div>

                <Link className="auth-back-link" to="/login">
                  <span className="material-symbols-outlined" aria-hidden>
                    arrow_back
                  </span>
                  Back to sign in
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
