import { type FormEvent, useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import type { SessionRole, StaffListRow, StaffRole } from '../../model/types'
import {
  fetchStaffById,
  updateStaff as updateStaffApi,
  uploadStaffProfileImage,
  type StaffUpdateBody,
} from '../../services/staffService'
import type { StoredAccount } from '../../services/authSession'
import { roleLabel } from '../../utils/roleLabels'
import { StaffProfileImageField } from '../staff/StaffProfileImageField'
import '../common/ui.css'

const MIN_PASSWORD_LENGTH = 8

const STAFF_ROLES: readonly StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager', 'collector']

function isStaffRole(r: string): r is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(r)
}

type MyProfileModalProps = {
  open: boolean
  account: StoredAccount
  sessionRole: SessionRole | null
  onClose: () => void
  onSuccess: () => void | Promise<void>
}

export function MyProfileModal({
  open,
  account,
  sessionRole,
  onClose,
  onSuccess,
}: MyProfileModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [staffRow, setStaffRow] = useState<StaffListRow | null>(null)
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null)
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setLoadError(null)
    setPassword('')
    setConfirmPassword('')
    setProfileImageFile(null)
    setProfilePreviewUrl(null)
    setSubmitting(false)
    setName(account.name)
    setEmail(account.email)
    setStaffRow(null)
    let cancelled = false
    void (async () => {
      try {
        const row = await fetchStaffById(account.id)
        if (!cancelled) setStaffRow(row)
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : t('profile.loadFailed'))
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, account.id, account.name, account.email, t])

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

    if (!staffRow) {
      setFormError(loadError ?? t('profile.stillLoading'))
      return
    }
    if (!isStaffRole(account.role)) {
      setFormError(t('profile.cannotEdit'))
      return
    }

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

    const pw = password.trim()
    const cpw = confirmPassword.trim()
    if (pw !== '' || cpw !== '') {
      if (pw.length < MIN_PASSWORD_LENGTH) {
        setFormError(t('profile.passwordMinLength', { count: MIN_PASSWORD_LENGTH }))
        return
      }
      if (pw !== cpw) {
        setFormError(t('profile.passwordMismatch'))
        return
      }
    }

    setSubmitting(true)
    try {
      const body: StaffUpdateBody = {
        name: n,
        email: em,
        role: account.role,
        is_active: staffRow.is_active,
      }
      if (pw !== '') body.password_hash = pw
      let updated = await updateStaffApi(account.id, body)
      if (profileImageFile) {
        updated = await uploadStaffProfileImage(account.id, profileImageFile)
      }
      setStaffRow(updated)
      await onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('profile.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

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
            {t('profile.title')}
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
          {loadError && !staffRow ? (
            <div className="form-alert form-alert--error" role="alert">
              {loadError}
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="mp-name">{t('profile.name')}</label>
            <input
              id="mp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profile.namePlaceholder')}
              autoComplete="name"
              autoFocus
              disabled={submitting || !staffRow}
            />
          </div>
          <div className="field">
            <label htmlFor="mp-email">{t('profile.email')}</label>
            <input
              id="mp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('profile.emailPlaceholder')}
              autoComplete="email"
              disabled={submitting || !staffRow}
            />
          </div>
          <div className="field">
            <label htmlFor="mp-role">{t('profile.role')}</label>
            <input
              id="mp-role"
              readOnly
              value={roleLabel(sessionRole)}
              tabIndex={-1}
              aria-readonly="true"
            />
          </div>
          <StaffProfileImageField
            id="mp-profile-image"
            savedImageUrl={staffRow?.profile_image_url ?? null}
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
            disabled={submitting || !staffRow}
          />
          <div className="field">
            <label htmlFor="mp-pw">
              {t('profile.newPassword')} (optional, min. {MIN_PASSWORD_LENGTH} characters)
            </label>
            <input
              id="mp-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={t('profile.passwordKeepHint')}
              autoComplete="new-password"
              disabled={submitting || !staffRow}
            />
          </div>
          <div className="field">
            <label htmlFor="mp-pw2">{t('profile.confirmPassword')}</label>
            <input
              id="mp-pw2"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              placeholder={t('profile.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={submitting || !staffRow}
            />
          </div>
          {formError ? (
            <div className="form-alert form-alert--error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="row-actions" style={{ marginTop: '0.25rem', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting || !staffRow}>
              {submitting ? t('common.saving') : t('profile.saveChanges')}
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
