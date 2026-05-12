import { type FormEvent, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { discountedPriceMmk } from '../../model/labTestCatalogApi'
import type { LabTestCatalogRow } from '../../model/types'
import {
  type DiscountUpsertBody,
  type TestDiscountListRow,
  upsertTestDiscount,
} from '../../services/discountService'
import '../common/ui.css'

function roleLabelReadonly(role: string | undefined): string {
  if (!role) return ''
  const map: Record<string, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
    all: 'All roles',
  }
  return map[role] ?? role
}

const ROLE_OPTIONS: { value: DiscountUpsertBody['role']; label: string }[] = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
  { value: 'all', label: 'All roles (same %)' },
]

type DiscountFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: TestDiscountListRow | null
  tests: LabTestCatalogRow[]
  onClose: () => void
  onSuccess: () => void
}

export function DiscountFormModal({
  open,
  mode,
  initial,
  tests,
  onClose,
  onSuccess,
}: DiscountFormModalProps) {
  const titleId = useId()
  const discountActiveId = useId()
  const [testId, setTestId] = useState('')
  const [role, setRole] = useState<DiscountUpsertBody['role']>('clinic')
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0)
  const [isActive, setIsActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setTestId(initial.test_id)
      setRole(initial.role as DiscountUpsertBody['role'])
      setDiscountPercent(initial.discount_percent)
      setIsActive(initial.is_active)
    } else {
      setTestId(tests[0]?.id ?? '')
      setRole('clinic')
      setDiscountPercent(0)
      setIsActive(true)
    }
  }, [open, mode, initial, tests])

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
    if (!testId) {
      setFormError('Select a lab test.')
      return
    }
    const discRaw =
      typeof discountPercent === 'number' ? discountPercent : Number.parseFloat(String(discountPercent))
    if (!Number.isFinite(discRaw) || discRaw < 0 || discRaw > 100) {
      setFormError('Enter a discount between 0 and 100.')
      return
    }
    const discN = Math.round(discRaw * 100) / 100
    const body: DiscountUpsertBody = {
      test_id: testId,
      role: mode === 'edit' && initial ? (initial.role as DiscountUpsertBody['role']) : role,
      discount_percent: discN,
      is_active: isActive,
    }
    setSubmitting(true)
    try {
      await upsertTestDiscount(body)
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTest = useMemo(() => tests.find((t) => t.id === testId), [tests, testId])
  const previewAfter = useMemo(() => {
    if (!selectedTest || discountPercent === '') return null
    const pct =
      typeof discountPercent === 'number' ? discountPercent : Number.parseFloat(String(discountPercent))
    if (!Number.isFinite(pct)) return null
    return discountedPriceMmk(selectedTest.base_price_mmk, pct)
  }, [selectedTest, discountPercent])

  if (!open) return null

  const title = mode === 'create' ? 'Add test discount' : 'Edit test discount'
  const testLabel =
    mode === 'edit' && initial
      ? [initial.test_name, initial.test_code].filter(Boolean).join(' · ') || initial.test_id
      : null

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
      <div className="modal-card modal-card--discount-form" onMouseDown={(e) => e.stopPropagation()}>
        <div className="discount-form-modal__head">
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

        <form className="discount-form-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="discount-form-modal__body">
            <div className="discount-form-modal__stack">
              {mode === 'edit' && initial ? (
                <div className="field">
                  <span className="user-form-modal__section-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                    Lab test
                  </span>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>{testLabel}</p>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="df-test">Lab test</label>
                  <select
                    id="df-test"
                    className="select-chevron-left"
                    value={testId}
                    onChange={(e) => setTestId(e.target.value)}
                    disabled={submitting || tests.length === 0}
                  >
                    {tests.length === 0 ? (
                      <option value="">No tests in catalog</option>
                    ) : (
                      tests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.test_name} ({t.test_code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {mode === 'create' ? (
                <div className="field">
                  <label htmlFor="df-role">Role</label>
                  <select
                    id="df-role"
                    className="select-chevron-left"
                    value={role}
                    onChange={(e) => setRole(e.target.value as DiscountUpsertBody['role'])}
                    disabled={submitting}
                  >
                    {ROLE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="field">
                  <label htmlFor="df-role-ro">Role</label>
                  <input
                    id="df-role-ro"
                    readOnly
                    disabled
                    value={roleLabelReadonly(initial?.role)}
                    className="lab-test-modal__input-computed"
                  />
                </div>
              )}

              <div className="field">
                <label htmlFor="df-pct">Discount %</label>
                <input
                  id="df-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={discountPercent === '' ? '' : discountPercent}
                  onChange={(e) => {
                    const v = e.target.value
                    setDiscountPercent(v === '' ? '' : Number(v))
                  }}
                  disabled={submitting}
                />
                {selectedTest && previewAfter !== null ? (
                  <p
                    style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--muted)' }}
                  >
                    Base {selectedTest.base_price_mmk.toLocaleString()} MMK → after discount{' '}
                    <strong>{previewAfter.toLocaleString()}</strong> MMK
                  </p>
                ) : null}
              </div>

              <label htmlFor={discountActiveId} className="form-switch">
                <span className="form-switch__control">
                  <input
                    id={discountActiveId}
                    type="checkbox"
                    className="form-switch__input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={submitting}
                  />
                  <span className="form-switch__track" aria-hidden="true" />
                </span>
                <span className="form-switch__text">
                  <span className="form-switch__title">{isActive ? 'Discount is active' : 'Discount is inactive'}</span>
                  <span className="form-switch__desc">
                    Inactive rows are kept but do not apply to role-based pricing until turned on again.
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="discount-form-modal__footer">
            {formError ? (
              <div className="form-alert form-alert--error" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="discount-form-modal__footer-actions">
              <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => !submitting && onClose()} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting || (mode === 'create' && tests.length === 0)}>
                  {submitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save'}
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
