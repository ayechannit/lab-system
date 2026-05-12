import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { EndUserRole, UserListRow } from '../../model/types'
import { nominatimSearch } from '../../services/nominatimGeocode'
import { createUser, updateUser, type UserCreateBody, type UserUpdateBody } from '../../services/userService'
import { formatCoordPair, LocationMapPicker } from './LocationMapPicker'
import '../common/ui.css'

const ADDRESS_GEOCODE_DEBOUNCE_MS = 900
const ADDRESS_GEOCODE_MIN_LEN = 4
/** Minimum length for initial password on create (plain value sent as `password_hash` in this admin build). */
const MIN_INITIAL_PASSWORD_LENGTH = 8

const ROLE_OPTIONS: { value: EndUserRole; label: string }[] = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
]

type UserFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: UserListRow | null
  existingRows: UserListRow[]
  onClose: () => void
  onSuccess: () => void
}

export function UserFormModal({
  open,
  mode,
  initial,
  existingRows,
  onClose,
  onSuccess,
}: UserFormModalProps) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<EndUserRole>('patient')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>(0)
  const [longitude, setLongitude] = useState<number | ''>(0)
  const [totalPoints, setTotalPoints] = useState<number | ''>(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [geocodeHint, setGeocodeHint] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setGeocodeHint(null)
    setPassword('')
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setEmail(initial.email)
      setPhone(initial.phone)
      setRole(initial.role)
      setAddress(initial.address)
      setLatitude(initial.latitude)
      setLongitude(initial.longitude)
      setTotalPoints(initial.total_points)
    } else {
      setName('')
      setEmail('')
      setPhone('')
      setRole('patient')
      setAddress('')
      setLatitude(0)
      setLongitude(0)
      setTotalPoints(0)
    }
  }, [open, mode, initial])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting])

  useEffect(() => {
    if (!open) return

    const trimmed = address.trim()
    if (trimmed.length < ADDRESS_GEOCODE_MIN_LEN) {
      setGeocodeHint(null)
      return
    }

    if (mode === 'edit' && initial && trimmed === initial.address.trim()) {
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
  }, [open, address, mode, initial])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const n = name.trim()
    if (!n) {
      setFormError('Enter a name.')
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
    if (mode === 'create') {
      const pw = password.trim()
      if (!pw) {
        setFormError('Enter an initial password.')
        return
      }
      if (pw.length < MIN_INITIAL_PASSWORD_LENGTH) {
        setFormError(`Password must be at least ${MIN_INITIAL_PASSWORD_LENGTH} characters.`)
        return
      }
    }
    if (mode === 'edit') {
      const pw = password.trim()
      if (pw !== '' && pw.length < MIN_INITIAL_PASSWORD_LENGTH) {
        setFormError(`New password must be at least ${MIN_INITIAL_PASSWORD_LENGTH} characters.`)
        return
      }
    }
    const taken = existingRows.some(
      (r) => r.email.toLowerCase() === em && (mode === 'create' || r.id !== initial?.id),
    )
    if (taken) {
      setFormError('That email is already registered.')
      return
    }

    const lat = typeof latitude === 'number' ? latitude : Number.parseFloat(String(latitude))
    const lng = typeof longitude === 'number' ? longitude : Number.parseFloat(String(longitude))
    const pts = typeof totalPoints === 'number' ? totalPoints : Number.parseInt(String(totalPoints), 10)
    const latN = Number.isFinite(lat) ? lat : 0
    const lngN = Number.isFinite(lng) ? lng : 0
    const ptsN = Number.isFinite(pts) ? Math.max(0, Math.trunc(pts)) : 0

    setSubmitting(true)
    try {
      if (mode === 'create') {
        const body: UserCreateBody = {
          name: n,
          email: em,
          phone: phone.trim(),
          password_hash: password.trim(),
          role,
          address: address.trim() || '',
          latitude: latN,
          longitude: lngN,
          total_points: ptsN,
        }
        await createUser(body)
      } else if (initial) {
        const body: UserUpdateBody = {
          name: n,
          email: em,
          phone: phone.trim(),
          role,
          address: address.trim() || '',
          latitude: latN,
          longitude: lngN,
          total_points: ptsN,
        }
        const nextPassword = password.trim()
        if (nextPassword !== '') body.password_hash = nextPassword
        await updateUser(initial.id, body)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = mode === 'create' ? 'Add user' : 'Edit user'

  const modal = (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="modal-card modal-card--user-form" onMouseDown={(e) => e.stopPropagation()}>
        <div className="user-form-modal__head">
          <div className="modal-head">
            <h2 id={titleId} className="modal-title">
              {title}
            </h2>
            <button
              type="button"
              className="btn btn-ghost modal-close"
              onClick={() => !submitting && onClose()}
              aria-label="Close"
              disabled={submitting}
            >
              ×
            </button>
          </div>
        </div>

        <form className="user-form-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="user-form-modal__body">
            <div className="user-form-modal__grid">
              <div className="user-form-modal__stack">
                <p className="user-form-modal__section-label">Profile</p>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="uf-name">Name</label>
                    <input
                      id="uf-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Clinic, doctor, or patient name"
                      autoComplete="name"
                      autoFocus
                      disabled={submitting}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="uf-email">Email</label>
                    <input
                      id="uf-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      autoComplete="email"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="uf-phone">Phone</label>
                    <input
                      id="uf-phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+95 …"
                      autoComplete="tel"
                      disabled={submitting}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="uf-role">Role</label>
                    <select
                      id="uf-role"
                      className="select-chevron-left"
                      value={role}
                      onChange={(e) => setRole(e.target.value as EndUserRole)}
                      disabled={submitting}
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {mode === 'create' ? (
                  <div className="field">
                    <label htmlFor="uf-password">Initial password (min. {MIN_INITIAL_PASSWORD_LENGTH} characters)</label>
                    <input
                      id="uf-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={MIN_INITIAL_PASSWORD_LENGTH}
                      placeholder={`At least ${MIN_INITIAL_PASSWORD_LENGTH} characters`}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="uf-password">New password (optional, min. {MIN_INITIAL_PASSWORD_LENGTH} characters)</label>
                    <input
                      id="uf-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={MIN_INITIAL_PASSWORD_LENGTH}
                      placeholder="Leave empty to keep current password"
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="uf-points">Total points</label>
                  <input
                    id="uf-points"
                    type="number"
                    min={0}
                    step={1}
                    value={totalPoints === '' ? '' : totalPoints}
                    onChange={(e) => {
                      const v = e.target.value
                      setTotalPoints(v === '' ? '' : Number(v))
                    }}
                    disabled={submitting}
                  />
                </div>

                <div className="field user-form-modal__address">
                  <label htmlFor="uf-address">Address</label>
                  <textarea
                    id="uf-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Street, city, etc."
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="user-form-modal__stack user-form-modal__stack--map-only">
                <div className="user-form-modal__location-card">
                  <p className="user-form-modal__section-label">Map</p>
                  <p className="user-form-modal__map-hint">
                    Typing the address moves the pin (debounced). Clicking the map or using your location fills the
                    address from the pin.
                  </p>
                  <LocationMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    mapHeight={280}
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
            </div>
          </div>

          <div className="user-form-modal__footer">
            {formError ? (
              <div className="form-alert form-alert--error" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="user-form-modal__footer-actions">
              <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => !submitting && onClose()} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : mode === 'create' ? 'Create user' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
