import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { StaffListRow, StaffRole } from '../../mock-data/types'
import {
  createStaff as createStaffApi,
  updateStaff as updateStaffApi,
  type StaffCreateBody,
  type StaffUpdateBody,
} from '../../services/staffService'
import '../common/ui.css'

const MIN_INITIAL_PASSWORD_LENGTH = 8

const ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'lab_technician', label: 'Lab technician' },
  { value: 'reception', label: 'Reception' },
  { value: 'manager', label: 'Manager' },
]

type StaffFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: StaffListRow | null
  existingRows: StaffListRow[]
  onClose: () => void
  onSuccess: () => void
}

export function StaffFormModal({
  open,
  mode,
  initial,
  existingRows,
  onClose,
  onSuccess,
}: StaffFormModalProps) {
  const titleId = useId()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<StaffRole>('admin')
  /** Sent as `password_hash` (plain in this admin build — hash in production). */
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setPassword('')
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setEmail(initial.email)
      setRole(initial.role)
    } else {
      setName('')
      setEmail('')
      setRole('admin')
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
    const taken = existingRows.some(
      (r) => r.email.toLowerCase() === em && (mode === 'create' || r.id !== initial?.id),
    )
    if (taken) {
      setFormError('That email is already on the list.')
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

    const is_active = mode === 'edit' && initial ? initial.is_active : true

    setSubmitting(true)
    try {
      if (mode === 'create') {
        const body: StaffCreateBody = {
          name: n,
          email: em,
          role,
          is_active,
          password_hash: password.trim(),
        }
        await createStaffApi(body)
      } else if (initial) {
        const body: StaffUpdateBody = {
          name: n,
          email: em,
          role,
          is_active,
        }
        const nextPassword = password.trim()
        if (nextPassword !== '') body.password_hash = nextPassword
        await updateStaffApi(initial.id, body)
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

  const title = mode === 'create' ? 'Add staff' : 'Edit staff'

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
            aria-label="Close"
            disabled={submitting}
          >
            ×
          </button>
        </div>
        <form className="form-grid" onSubmit={(e) => void handleSubmit(e)} style={{ maxWidth: 'none' }}>
          <div className="field">
            <label htmlFor="sf-name">Name</label>
            <input
              id="sf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              autoComplete="name"
              autoFocus
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="sf-email">Email</label>
            <input
              id="sf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@lab.example"
              autoComplete="email"
              disabled={submitting}
            />
          </div>
          <div className="field">
            <label htmlFor="sf-role">Role</label>
            <select
              id="sf-role"
              className="select-chevron-left"
              value={role}
              onChange={(e) => setRole(e.target.value as StaffRole)}
              disabled={submitting}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          {mode === 'create' ? (
            <div className="field">
              <label htmlFor="sf-pw">Initial password (min. {MIN_INITIAL_PASSWORD_LENGTH} characters)</label>
              <input
                id="sf-pw"
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
              <label htmlFor="sf-pw">New password (optional, min. {MIN_INITIAL_PASSWORD_LENGTH} characters)</label>
              <input
                id="sf-pw"
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
          {formError ? (
            <div className="form-alert form-alert--error" role="alert">
              {formError}
            </div>
          ) : null}
          <div className="row-actions" style={{ marginTop: '0.25rem', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : mode === 'create' ? 'Create staff' : 'Save changes'}
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
