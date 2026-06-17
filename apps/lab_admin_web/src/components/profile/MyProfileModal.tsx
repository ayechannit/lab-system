import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { SessionRole, StaffListRow, StaffRole } from '../../model/types'
import {
  fetchStaffById,
  updateStaff as updateStaffApi,
  uploadStaffProfileImage,
  type StaffUpdateBody,
} from '../../services/staffService'
import type { StoredAccount } from '../../services/authSession'
import { StaffProfileImageField } from '../staff/StaffProfileImageField'
import '../common/ui.css'

const MIN_PASSWORD_LENGTH = 8

const STAFF_ROLES: readonly StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager', 'collector']

function isStaffRole(r: string): r is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(r)
}

function roleDisplay(role: SessionRole | null): string {
  if (!role) return 'Signed in'
  const map: Record<SessionRole, string> = {
    admin: 'Admin',
    lab_technician: 'Lab technician',
    reception: 'Reception',
    manager: 'Manager',
    collector: 'Collector',
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
  }
  return map[role] ?? role
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
          setLoadError(err instanceof Error ? err.message : 'Could not load profile')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, account.id, account.name, account.email])

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
      setFormError(loadError ?? 'Still loading profile — try again in a moment.')
      return
    }
    if (!isStaffRole(account.role)) {
      setFormError('This account cannot be edited here.')
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
        setFormError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
        return
      }
      if (pw !== cpw) {
        setFormError('Password and confirmation do not match.')
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
      if (account.role === 'collector' && profileImageFile) {
        updated = await uploadStaffProfileImage(account.id, profileImageFile)
      }
      setStaffRow(updated)
      await onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Request failed')
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
            My profile
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
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: 'none' }}>
          {loadError && !staffRow ? (
            <div className="form-alert form-alert--error" role="alert">
              {loadError}
            </div>
          ) : null}
          <div className="field">
            <label htmlFor="mp-name">Name</label>
            <input
              id="mp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              autoFocus
              disabled={submitting || !staffRow}
            />
          </div>
          <div className="field">
            <label htmlFor="mp-email">Email</label>
            <input
              id="mp-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@lab.example"
              autoComplete="email"
              disabled={submitting || !staffRow}
            />
          </div>
          <div className="field">
            <label htmlFor="mp-role">Role</label>
            <input
              id="mp-role"
              readOnly
              value={roleDisplay(sessionRole)}
              tabIndex={-1}
              aria-readonly="true"
            />
          </div>
          {account.role === 'collector' ? (
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
          ) : null}
          <div className="field">
            <label htmlFor="mp-pw">New password (optional, min. {MIN_PASSWORD_LENGTH} characters)</label>
            <input
              id="mp-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              placeholder="Leave empty to keep current password"
              autoComplete="new-password"
              disabled={submitting || !staffRow}
            />
          </div>
          <div className="field">
            <label htmlFor="mp-pw2">Confirm new password</label>
            <input
              id="mp-pw2"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={MIN_PASSWORD_LENGTH}
              placeholder="Repeat new password"
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
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
