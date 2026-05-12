import { type FormEvent, useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { formatCoordPair, LocationMapPicker } from '../../components/users/LocationMapPicker'
import '../../components/common/ui.css'
import { useAuth } from '../../hooks/AuthContext'
import type { EndUserRole } from '../../model/types'
import { isApiMode } from '../../services/apiBase'
import { nominatimSearch } from '../../services/nominatimGeocode'
import { createUser } from '../../services/userService'
import { authImages } from './authAssets'
import { AuthFooter } from './AuthFooter'
import { AuthMarketingPanel } from './AuthMarketingPanel'
import './auth-screens.css'

const MIN_PASSWORD_LENGTH = 8
const ADDRESS_GEOCODE_DEBOUNCE_MS = 900
const ADDRESS_GEOCODE_MIN_LEN = 4

export function SignUpPage() {
  const { signedIn, initializing } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>(0)
  const [longitude, setLongitude] = useState<number | ''>(0)
  const [roleKey, setRoleKey] = useState<'' | EndUserRole>('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const trimmed = address.trim()
    if (trimmed.length < ADDRESS_GEOCODE_MIN_LEN) {
      setGeocodeHint(null)
      return
    }

    let alive = true
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setGeocodeHint('Looking up address…')
      void (async () => {
        try {
          const hit = await nominatimSearch(trimmed, ac.signal)
          if (!alive || ac.signal.aborted) return
          if (hit) {
            setLatitude(hit.lat)
            setLongitude(hit.lng)
            setGeocodeHint(null)
          } else {
            setGeocodeHint('No match for that address. Try a fuller line or set the pin on the map.')
          }
        } catch {
          if (!alive || ac.signal.aborted) return
          setGeocodeHint('Could not look up address. Set the pin on the map or try again.')
        }
      })()
    }, ADDRESS_GEOCODE_DEBOUNCE_MS)

    return () => {
      alive = false
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [address])

  if (!initializing && signedIn) return <Navigate to="/" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    if (!isApiMode()) {
      setFormError(
        'API URL is not configured. Set VITE_API_BASE_URL or run the dev server with the backend on port 3000.',
      )
      return
    }

    const n = fullName.trim()
    if (!n) {
      setFormError('Enter your full name.')
      return
    }
    const em = email.trim().toLowerCase()
    if (!em || !em.includes('@')) {
      setFormError('Enter a valid email.')
      return
    }
    if (!phone.trim()) {
      setFormError('Enter a phone number.')
      return
    }
    if (!roleKey) {
      setFormError('Select account type: clinic, doctor, or patient.')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setFormError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setFormError('Passwords do not match.')
      return
    }

    const lat = typeof latitude === 'number' ? latitude : Number.parseFloat(String(latitude))
    const lng = typeof longitude === 'number' ? longitude : Number.parseFloat(String(longitude))
    const latN = Number.isFinite(lat) ? lat : 0
    const lngN = Number.isFinite(lng) ? lng : 0

    setSubmitting(true)
    try {
      await createUser({
        name: n,
        email: em,
        phone: phone.trim(),
        password_hash: password,
        role: roleKey,
        address: address.trim() || '',
        latitude: latN,
        longitude: lngN,
        total_points: 0,
      })
      navigate('/login', { replace: true, state: { registered: true } })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-split">
      <AuthMarketingPanel
        heroImage={authImages.signUpHero}
        headline="Join the Future of Lab Management"
        lead="Deploy enterprise-grade laboratory information systems designed for precision, security, and global compliance."
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
          <div className="auth-form-wrap auth-form-wrap--signup">
            <div className="auth-icon-tile">
              <span className="material-symbols-outlined">person_add</span>
            </div>
            <h1 className="auth-title">Create Account</h1>
            <p className="auth-subtitle">Same location flow as Users: type an address, pick the map, or use your device.</p>

            <form className="auth-stack" style={{ marginTop: '2rem' }} onSubmit={handleSubmit}>
              <div className="auth-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="full_name">
                    Full name
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">person</span>
                    <input
                      id="full_name"
                      className="auth-input"
                      placeholder="Dr. Jane Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      autoComplete="name"
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="email">
                    Email
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">mail</span>
                    <input
                      id="email"
                      className="auth-input"
                      type="email"
                      placeholder="jane.smith@hospital.org"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="phone">
                    Phone
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">call</span>
                    <input
                      id="phone"
                      className="auth-input"
                      type="tel"
                      placeholder="+95 9 123 456 789"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                    />
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="role">
                    Account type
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">badge</span>
                    <select
                      id="role"
                      className="auth-input auth-select"
                      value={roleKey}
                      onChange={(e) => setRoleKey((e.target.value || '') as '' | EndUserRole)}
                    >
                      <option value="">Select clinic, doctor, or patient</option>
                      <option value="clinic">Clinic</option>
                      <option value="doctor">Doctor</option>
                      <option value="patient">Patient</option>
                    </select>
                    <span className="material-symbols-outlined auth-chevron">expand_more</span>
                  </div>
                </div>
              </div>

              <div className="auth-field">
                <label className="auth-label" htmlFor="address">
                  Address
                </label>
                <div className="auth-input-wrap" style={{ alignItems: 'flex-start', paddingTop: '0.65rem' }}>
                  <span
                    className="material-symbols-outlined auth-input-icon"
                    style={{ alignSelf: 'flex-start', marginTop: '0.15rem' }}
                  >
                    location_on
                  </span>
                  <textarea
                    id="address"
                    className="auth-input"
                    rows={2}
                    placeholder="Street, city, region"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    autoComplete="street-address"
                    style={{ minHeight: '3.25rem', resize: 'vertical' }}
                  />
                </div>
              </div>

              <div className="user-form-modal__stack user-form-modal__stack--map-only" style={{ marginTop: '0.25rem' }}>
                <div className="user-form-modal__location-card">
                  <p className="user-form-modal__section-label">Map</p>
                  <p className="user-form-modal__map-hint">
                    Typing the address moves the pin (debounced). Click the map or use your location — the address field
                    updates from the pin when reverse geocoding succeeds (HTTPS or localhost).
                  </p>
                  <LocationMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    mapHeight={260}
                    onPick={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                    }}
                    onAddressFromMap={(addr) => {
                      setAddress(addr)
                      setGeocodeHint(null)
                    }}
                  />
                  <p className="user-form-modal__coords" aria-live="polite">
                    {formatCoordPair(latitude, longitude)}
                    {latitude === 0 && longitude === 0 ? (
                      <span className="user-form-modal__coords-hint"> — not placed (saved as 0, 0)</span>
                    ) : null}
                  </p>
                  {geocodeHint ? <p className="user-form-modal__geocode-hint">{geocodeHint}</p> : null}
                </div>
              </div>

              <div className="auth-grid-2">
                <div className="auth-field">
                  <label className="auth-label" htmlFor="password">
                    Password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock</span>
                    <input
                      id="password"
                      className="auth-input auth-input--password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="auth-toggle-vis"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((v) => !v)}
                      disabled={submitting}
                    >
                      <span className="material-symbols-outlined">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
                <div className="auth-field">
                  <label className="auth-label" htmlFor="confirm_password">
                    Confirm password
                  </label>
                  <div className="auth-input-wrap">
                    <span className="material-symbols-outlined auth-input-icon">lock_reset</span>
                    <input
                      id="confirm_password"
                      className="auth-input auth-input--password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                    <button
                      type="button"
                      className="auth-toggle-vis"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      disabled={submitting}
                    >
                      <span className="material-symbols-outlined">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {formError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {formError}
                </div>
              ) : null}

              <button type="submit" className="auth-primary-btn" disabled={submitting}>
                <span>{submitting ? 'Creating account…' : 'Sign Up'}</span>
                <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>
                  app_registration
                </span>
              </button>
            </form>

            <div className="auth-bottom-link" style={{ paddingBottom: '2rem' }}>
              <span>Already have an account? </span>
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
        <AuthFooter />
      </div>
    </div>
  )
}
