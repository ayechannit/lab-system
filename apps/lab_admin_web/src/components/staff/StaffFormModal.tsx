import { type FormEvent, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import type { StaffListRow, StaffRole } from '../../model/types'
import {
  createStaff as createStaffApi,
  updateStaff as updateStaffApi,
  uploadStaffProfileImage,
  type StaffCreateBody,
  type StaffUpdateBody,
} from '../../services/staffService'
import { roleLabel } from '../../utils/roleLabels'
import { StaffProfileImageField } from './StaffProfileImageField'
import '../common/ui.css'

const MIN_INITIAL_PASSWORD_LENGTH = 8

const STAFF_ROLES: StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager', 'collector']

type StaffFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: StaffListRow | null
  existingRows: StaffListRow[]
  /** The signed-in staff member's id — when editing this row, a current-password check is required to change the password. */
  currentStaffId?: string | null
  onClose: () => void
  onSuccess: () => void
}

export function StaffFormModal({
  open,
  mode,
  initial,
  existingRows,
  currentStaffId,
  onClose,
  onSuccess,
}: StaffFormModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const staffActiveId = useId()
  const isSelf = mode === 'edit' && !!initial && !!currentStaffId && initial.id === currentStaffId
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('admin')
  const [isActive, setIsActive] = useState(true)
  const [currentPassword, setCurrentPassword] = useState('')
  /** Sent as `password_hash` (plain in this admin build — hash in production). */
  const [password, setPassword] = useState('')
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null)
  const [savedProfileImageUrl, setSavedProfileImageUrl] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setCurrentPassword('')
    setPassword('')
    setProfileImageFile(null)
    setProfilePreviewUrl(null)
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setEmail(initial.email)
      setRole(initial.role)
      setIsActive(initial.is_active)
      setSavedProfileImageUrl(initial.profile_image_url)
    } else {
      setName('')
      setEmail('')
      setRole('admin')
      setIsActive(true)
      setSavedProfileImageUrl(null)
    }
  }, [open, mode, initial])

  useEffect(() => {
    return () => {
      if (profilePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(profilePreviewUrl)
      }
    }
  }, [profilePreviewUrl])

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)

    const n = name.trim()
    if (!n) {
      setFormError(t('staff.form.errorName'))
      return
    }
    const em = email.trim().toLowerCase()
    if (!em || !em.includes('@')) {
      setFormError(t('staff.form.errorEmail'))
      return
    }
    const taken = existingRows.some(
      (r) => r.email.toLowerCase() === em && (mode === 'create' || r.id !== initial?.id),
    )
    if (taken) {
      setFormError(t('staff.form.errorEmailTaken'))
      return
    }

    if (mode === 'create') {
      const pw = password.trim()
      if (!pw) {
        setFormError(t('staff.form.errorPasswordRequired'))
        return
      }
      if (pw.length < MIN_INITIAL_PASSWORD_LENGTH) {
        setFormError(t('staff.form.errorPasswordMin', { count: MIN_INITIAL_PASSWORD_LENGTH }))
        return
      }
    }
    if (mode === 'edit') {
      const pw = password.trim()
      if (pw !== '' && pw.length < MIN_INITIAL_PASSWORD_LENGTH) {
        setFormError(t('staff.form.errorNewPasswordMin', { count: MIN_INITIAL_PASSWORD_LENGTH }))
        return
      }
      if (pw !== '' && isSelf && currentPassword.trim() === '') {
        setFormError(t('staff.form.errorCurrentPasswordRequired'))
        return
      }
    }

    setSubmitting(true)
    try {
      let staffId = initial?.id
      if (mode === 'create') {
        const body: StaffCreateBody = {
          name: n,
          email: em,
          role,
          is_active: isActive,
          password_hash: password.trim(),
        }
        const created = await createStaffApi(body)
        staffId = created.id
      } else if (initial) {
        const body: StaffUpdateBody = {
          name: n,
          email: em,
          role,
          is_active: isActive,
        }
        const nextPassword = password.trim()
        if (nextPassword !== '') {
          body.password_hash = nextPassword
          if (isSelf) body.current_password = currentPassword.trim()
        }
        await updateStaffApi(initial.id, body)
        staffId = initial.id
      }

      if (profileImageFile && staffId) {
        const updated = await uploadStaffProfileImage(staffId, profileImageFile)
        setSavedProfileImageUrl(updated.profile_image_url)
        setProfileImageFile(null)
        if (profilePreviewUrl?.startsWith('blob:')) {
          URL.revokeObjectURL(profilePreviewUrl)
        }
        setProfilePreviewUrl(null)
      }

      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('staff.form.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = mode === 'create' ? t('staff.form.createTitle') : t('staff.form.editTitle')

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
      <div
        className="modal-card"
        style={{ maxWidth: 480 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
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
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: 'none' }}>
          <div className="field">
            <label htmlFor="sf-name">{t('staff.form.name')}</label>
            <input
              id="sf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('staff.form.namePlaceholder')}
              autoComplete="name"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="sf-email">{t('staff.form.email')}</label>
            <input
              id="sf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('staff.form.emailPlaceholder')}
              autoComplete="email"
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="sf-role">{t('staff.form.role')}</label>
            <select
              id="sf-role"
              className="select-chevron-left"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              disabled={submitting}
            >
              {STAFF_ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          <StaffProfileImageField
            id="sf-profile-image"
            savedImageUrl={savedProfileImageUrl}
            previewSrc={profilePreviewUrl}
            pickedFileName={profileImageFile?.name ?? null}
            onFileSelected={(file) => {
              if (profilePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(profilePreviewUrl)
              }
              setProfileImageFile(file)
              setProfilePreviewUrl(URL.createObjectURL(file))
            }}
            onClear={() => {
              setProfileImageFile(null)
              if (profilePreviewUrl?.startsWith('blob:')) {
                URL.revokeObjectURL(profilePreviewUrl)
              }
              setProfilePreviewUrl(null)
            }}
            disabled={submitting}
          />
          <label htmlFor={staffActiveId} className="form-switch">
            <span className="form-switch__control">
              <input
                id={staffActiveId}
                type="checkbox"
                className="form-switch__input"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
              />
              <span className="form-switch__track" aria-hidden="true" />
            </span>
            <span className="form-switch__text">
              <span className="form-switch__title">
                {isActive ? t('staff.form.activeTitle') : t('staff.form.inactiveTitle')}
              </span>
              <span className="form-switch__desc">{t('staff.form.activeDesc')}</span>
            </span>
          </label>
          {mode === 'create' ? (
            <div className="field">
              <label htmlFor="sf-pw">
                {t('staff.form.initialPassword', { count: MIN_INITIAL_PASSWORD_LENGTH })}
              </label>
              <input
                id="sf-pw"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_INITIAL_PASSWORD_LENGTH}
                placeholder={t('staff.form.passwordPlaceholder', { count: MIN_INITIAL_PASSWORD_LENGTH })}
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>
          ) : (
            <>
              {isSelf ? (
                <div className="field">
                  <label htmlFor="sf-current-pw">{t('staff.form.currentPassword')}</label>
                  <input
                    id="sf-current-pw"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder={t('staff.form.currentPasswordPlaceholder')}
                    autoComplete="current-password"
                    disabled={submitting}
                  />
                </div>
              ) : null}
              <div className="field">
                <label htmlFor="sf-pw">
                  {t('staff.form.newPassword', { count: MIN_INITIAL_PASSWORD_LENGTH })}
                </label>
                <input
                  id="sf-pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={MIN_INITIAL_PASSWORD_LENGTH}
                  placeholder={t('staff.form.passwordKeepPlaceholder')}
                  autoComplete="new-password"
                  disabled={submitting}
                />
              </div>
            </>
          )}
          {formError ? (
            <div className="form-alert form-alert--error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="row-actions" style={{ marginTop: '0.25rem', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting
                ? t('common.saving')
                : mode === 'create'
                  ? t('staff.form.createSubmit')
                  : t('staff.form.saveChanges')}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
