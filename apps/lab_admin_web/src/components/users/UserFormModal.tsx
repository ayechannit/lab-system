import { type FormEvent, useCallback, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { endUserRoleRequiresLicenseNumber, type EndUserRole, type UserListRow } from '../../model/types'
import { useAddressGeocode } from '../../hooks/useAddressGeocode'
import { createUser, updateUser, type UserCreateBody, type UserUpdateBody } from '../../services/userService'
import { roleLabel } from '../../utils/roleLabels'
import { isValidPhoneInput, sanitizePhoneInput } from '../../utils/phoneInput'
import { formatCoordPair, hasUsableCoords, LocationMapPicker } from './LocationMapPicker'
import '../common/ui.css'
/** Minimum length for initial password on create (plain value sent as `password_hash` in this admin build). */
const MIN_INITIAL_PASSWORD_LENGTH = 8

const USER_ROLES: EndUserRole[] = ['clinic', 'doctor', 'patient', 'phlebotomist']

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
  const { t } = useTranslation()
  const titleId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<EndUserRole>('patient')
  const [licenseNumber, setLicenseNumber] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>('')
  const [longitude, setLongitude] = useState<number | ''>('')
  const [totalPoints, setTotalPoints] = useState<number | ''>(0)
  const [formError, setFormError] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [addressBaseline, setAddressBaseline] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setPassword('')
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setEmail(initial.email)
      setPhone(initial.phone)
      setRole(initial.role)
      setLicenseNumber(initial.license_number ?? '')
      setAddress(initial.address)
      const hasCoords = hasUsableCoords(initial.latitude, initial.longitude)
      setLatitude(hasCoords ? initial.latitude : '')
      setLongitude(hasCoords ? initial.longitude : '')
      setTotalPoints(initial.total_points)
      const addr = initial.address.trim()
      setAddressBaseline(addr && hasCoords ? addr : null)
    } else {
      setAddressBaseline(null)
      setName('')
      setEmail('')
      setPhone('')
      setRole('patient')
      setLicenseNumber('')
      setAddress('')
      setLatitude('')
      setLongitude('')
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

  const onGeocodeCoords = useCallback((lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  const geocodeHint = useAddressGeocode({
    enabled: open,
    address,
    onCoords: onGeocodeCoords,
    baselineAddress: addressBaseline ?? undefined,
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const n = name.trim()
    if (!n) {
      setFormError(t('users.form.errorName'))
      return
    }
    const em = email.trim().toLowerCase()
    if (!em || !em.includes('@')) {
      setFormError(t('users.form.errorEmail'))
      return
    }
    if (!phone.trim()) {
      setFormError(t('users.form.errorPhone'))
      return
    }
    if (!isValidPhoneInput(phone)) {
      setFormError(t('users.form.errorPhoneInvalid'))
      return
    }
    if (endUserRoleRequiresLicenseNumber(role) && !licenseNumber.trim()) {
      setFormError(t('users.form.errorLicenseRequired'))
      return
    }
    if (mode === 'create') {
      const pw = password.trim()
      if (!pw) {
        setFormError(t('users.form.errorPasswordRequired'))
        return
      }
      if (pw.length < MIN_INITIAL_PASSWORD_LENGTH) {
        setFormError(t('users.form.errorPasswordMin', { count: MIN_INITIAL_PASSWORD_LENGTH }))
        return
      }
    }
    if (mode === 'edit') {
      const pw = password.trim()
      if (pw !== '' && pw.length < MIN_INITIAL_PASSWORD_LENGTH) {
        setFormError(t('users.form.errorNewPasswordMin', { count: MIN_INITIAL_PASSWORD_LENGTH }))
        return
      }
    }
    const taken = existingRows.some(
      (r) => r.email.toLowerCase() === em && (mode === 'create' || r.id !== initial?.id),
    )
    if (taken) {
      setFormError(t('users.form.errorEmailTaken'))
      return
    }

    const lat = typeof latitude === 'number' ? latitude : Number.parseFloat(String(latitude))
    const lng = typeof longitude === 'number' ? longitude : Number.parseFloat(String(longitude))
    const pts = typeof totalPoints === 'number' ? totalPoints : Number.parseInt(String(totalPoints), 10)
    const hasCoords = hasUsableCoords(latitude, longitude)
    const latN = hasCoords && Number.isFinite(lat) ? lat : 0
    const lngN = hasCoords && Number.isFinite(lng) ? lng : 0
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
          license_number: endUserRoleRequiresLicenseNumber(role) ? licenseNumber.trim() : null,
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
          license_number: endUserRoleRequiresLicenseNumber(role) ? licenseNumber.trim() : null,
        }
        const nextPassword = password.trim()
        if (nextPassword !== '') body.password_hash = nextPassword
        await updateUser(initial.id, body)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('users.form.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = mode === 'create' ? t('users.form.createTitle') : t('users.form.editTitle')

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
              aria-label={t('common.close')}
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
                <p className="user-form-modal__section-label">{t('users.form.profile')}</p>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="uf-name">{t('users.form.name')}</label>
                    <input
                      id="uf-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={t('users.form.namePlaceholder')}
                      autoComplete="name"
                      autoFocus
                      disabled={submitting}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="uf-email">{t('users.form.email')}</label>
                    <input
                      id="uf-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t('users.form.emailPlaceholder')}
                      autoComplete="email"
                      disabled={submitting}
                    />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label htmlFor="uf-phone">{t('users.form.phone')}</label>
                    <input
                      id="uf-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
                      placeholder={t('users.form.phonePlaceholder')}
                      autoComplete="tel"
                      inputMode="tel"
                      disabled={submitting}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="uf-role">{t('users.form.role')}</label>
                    <select
                      id="uf-role"
                      className="select-chevron-left"
                      value={role}
                      onChange={(e) => setRole(e.target.value as EndUserRole)}
                      disabled={submitting}
                    >
                      {USER_ROLES.map((r) => (
                        <option key={r} value={r}>
                          {roleLabel(r)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {endUserRoleRequiresLicenseNumber(role) ? (
                  <div className="field">
                    <label htmlFor="uf-license">{t('users.form.licenseNumber')}</label>
                    <input
                      id="uf-license"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder={t('users.form.licenseNumberPlaceholder')}
                      autoComplete="off"
                      disabled={submitting}
                    />
                  </div>
                ) : null}
                {mode === 'create' ? (
                  <div className="field">
                    <label htmlFor="uf-password">
                      {t('users.form.initialPassword', { count: MIN_INITIAL_PASSWORD_LENGTH })}
                    </label>
                    <input
                      id="uf-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={MIN_INITIAL_PASSWORD_LENGTH}
                      placeholder={t('users.form.passwordPlaceholder', {
                        count: MIN_INITIAL_PASSWORD_LENGTH,
                      })}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>
                ) : (
                  <div className="field">
                    <label htmlFor="uf-password">
                      {t('users.form.newPassword', { count: MIN_INITIAL_PASSWORD_LENGTH })}
                    </label>
                    <input
                      id="uf-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={MIN_INITIAL_PASSWORD_LENGTH}
                      placeholder={t('users.form.passwordKeepPlaceholder')}
                      autoComplete="new-password"
                      disabled={submitting}
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="uf-points">{t('users.form.totalPoints')}</label>
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
                  <label htmlFor="uf-address">{t('users.form.address')}</label>
                  <textarea
                    id="uf-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('users.form.addressPlaceholder')}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="user-form-modal__stack user-form-modal__stack--map-only">
                <div className="user-form-modal__location-card">
                  <LocationMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    mapHeight={280}
                    onPick={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                      setAddressBaseline(null)
                    }}
                    onAddressFromMap={(addr) => {
                      setAddress(addr)
                      setAddressBaseline(null)
                    }}
                  />
                  <p className="user-form-modal__coords" aria-live="polite">
                    {formatCoordPair(latitude, longitude)}
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => !submitting && onClose()}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? t('common.saving')
                    : mode === 'create'
                      ? t('users.form.createSubmit')
                      : t('users.form.saveChanges')}
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
