import { type FormEvent, useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { discountedPriceMmk } from '../../model/labTestCatalogApi'
import type { LabTestCatalogRow } from '../../model/types'
import {
  bulkUpsertTestDiscounts,
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
  const testSearchId = useId()
  const [testId, setTestId] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
  const [testSearch, setTestSearch] = useState('')
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
      setSelectedTestIds([])
      setTestSearch('')
      setRole(initial.role as DiscountUpsertBody['role'])
      setDiscountPercent(initial.discount_percent)
      setIsActive(initial.is_active)
    } else {
      setTestId('')
      setSelectedTestIds(tests[0]?.id ? [tests[0].id] : [])
      setTestSearch('')
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

  const testsSorted = useMemo(
    () => [...tests].sort((a, b) => a.test_name.localeCompare(b.test_name)),
    [tests],
  )

  const filteredTestsSorted = useMemo(() => {
    const q = testSearch.trim().toLowerCase()
    if (!q) return testsSorted
    return testsSorted.filter(
      (t) => t.test_name.toLowerCase().includes(q) || t.test_code.toLowerCase().includes(q),
    )
  }, [testsSorted, testSearch])

  function toggleTestId(id: string) {
    setSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectAllTests() {
    setSelectedTestIds(tests.map((t) => t.id))
  }

  function clearTestSelection() {
    setSelectedTestIds([])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (mode === 'create' && selectedTestIds.length === 0) {
      setFormError('Select at least one lab test.')
      return
    }
    const discRaw =
      typeof discountPercent === 'number' ? discountPercent : Number.parseFloat(String(discountPercent))
    if (!Number.isFinite(discRaw) || discRaw < 0 || discRaw > 100) {
      setFormError('Enter a discount between 0 and 100.')
      return
    }
    const discN = Math.round(discRaw * 100) / 100
    const roleForBody: DiscountUpsertBody['role'] =
      mode === 'edit' && initial ? (initial.role as DiscountUpsertBody['role']) : role

    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        const body: DiscountUpsertBody = {
          test_id: testId,
          role: roleForBody,
          discount_percent: discN,
          is_active: isActive,
        }
        await upsertTestDiscount(body)
        onSuccess()
        onClose()
        return
      }

      const ids = selectedTestIds
      const discounts: DiscountUpsertBody[] = ids.map((test_id) => ({
        test_id,
        role: roleForBody,
        discount_percent: discN,
        is_active: isActive,
      }))
      await bulkUpsertTestDiscounts({ discounts })
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedTest = useMemo(() => tests.find((t) => t.id === testId), [tests, testId])
  const selectedTestsCreate = useMemo(() => {
    const set = new Set(selectedTestIds)
    return testsSorted.filter((t) => set.has(t.id))
  }, [testsSorted, selectedTestIds])

  const pctForPreview =
    discountPercent === ''
      ? null
      : typeof discountPercent === 'number'
        ? discountPercent
        : Number.parseFloat(String(discountPercent))

  const previewAfter = useMemo(() => {
    if (!selectedTest || pctForPreview === null || !Number.isFinite(pctForPreview)) return null
    return discountedPriceMmk(selectedTest.base_price_mmk, pctForPreview)
  }, [selectedTest, pctForPreview])

  if (!open) return null

  const title = mode === 'create' ? 'Add test discount' : 'Edit test discount'
  const testLabel =
    mode === 'edit' && initial
      ? [initial.test_name, initial.test_code].filter(Boolean).join(' · ') || initial.test_id
      : null

  const createSubmitDisabled =
    submitting || (mode === 'create' && (tests.length === 0 || selectedTestIds.length === 0))

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
                <>
                  <div className="field">
                    <span
                      className="user-form-modal__section-label"
                      style={{ display: 'block', marginBottom: '0.35rem' }}
                    >
                      Lab test
                    </span>
                    <p className="discount-form-modal__readonly-test-name">{testLabel}</p>
                  </div>
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
                      <p className="discount-form-modal__preview-inline">
                        Base {selectedTest.base_price_mmk.toLocaleString()} MMK → after discount{' '}
                        <strong>{previewAfter.toLocaleString()}</strong> MMK
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <fieldset className="discount-form-modal__fieldset">
                    <legend className="user-form-modal__section-label">Lab tests</legend>
                    <p className="discount-form-modal__hint">
                      Select one or more tests. The same role, discount %, and active setting apply to each selected
                      test.
                    </p>
                    <div className="discount-form-modal__test-panel">
                      <div className="discount-form-modal__test-toolbar">
                        <input
                          id={testSearchId}
                          type="search"
                          placeholder="Search by name or code…"
                          value={testSearch}
                          onChange={(e) => setTestSearch(e.target.value)}
                          disabled={submitting || tests.length === 0}
                          autoComplete="off"
                          aria-label="Filter lab tests"
                        />
                        <span className="discount-form-modal__count-badge" aria-live="polite">
                          {tests.length === 0
                            ? '0 selected'
                            : selectedTestIds.length === tests.length
                              ? 'All selected'
                              : `${selectedTestIds.length} selected`}
                        </span>
                      </div>
                      <div
                        className="discount-form-modal__test-list"
                        role="group"
                        aria-label="Lab tests to discount"
                      >
                        {tests.length === 0 ? (
                          <p className="discount-form-modal__test-list-empty">No tests in catalog.</p>
                        ) : filteredTestsSorted.length === 0 ? (
                          <p className="discount-form-modal__test-list-empty">No tests match your search.</p>
                        ) : (
                          filteredTestsSorted.map((t) => (
                            <label key={t.id} className="discount-form-modal__test-row">
                              <input
                                type="checkbox"
                                checked={selectedTestIds.includes(t.id)}
                                onChange={() => toggleTestId(t.id)}
                                disabled={submitting}
                              />
                              <span>
                                <span className="discount-form-modal__test-row__name">{t.test_name}</span>{' '}
                                <span className="discount-form-modal__test-row__code">({t.test_code})</span>
                              </span>
                            </label>
                          ))
                        )}
                      </div>
                      <div className="discount-form-modal__test-quick">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={selectAllTests}
                          disabled={submitting || tests.length === 0}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={clearTestSelection}
                          disabled={submitting || selectedTestIds.length === 0}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </fieldset>

                  <div className="discount-form-modal__pair">
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
                    </div>
                  </div>

                  {selectedTestsCreate.length > 0 && pctForPreview !== null && Number.isFinite(pctForPreview) ? (
                    <div className="discount-form-modal__preview-card" aria-live="polite">
                      <div className="discount-form-modal__preview-head">After discount (preview)</div>
                      <ul className="discount-form-modal__preview-rows">
                        {selectedTestsCreate.map((t) => {
                          const after = discountedPriceMmk(t.base_price_mmk, pctForPreview)
                          return (
                            <li key={t.id} className="discount-form-modal__preview-row">
                              <span className="discount-form-modal__preview-row__label">{t.test_name}</span>
                              <span className="discount-form-modal__preview-row__nums">
                                {t.base_price_mmk.toLocaleString()} → <strong>{after.toLocaleString()}</strong> MMK
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}

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
              <div className="form-alert form-alert--error" role="alert" style={{ whiteSpace: 'pre-wrap' }}>
                {formError}
              </div>
            ) : null}
            <div className="discount-form-modal__footer-actions">
              <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => !submitting && onClose()} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createSubmitDisabled}>
                  {submitting
                    ? 'Saving…'
                    : mode === 'create'
                      ? selectedTestIds.length > 1
                        ? `Create (${selectedTestIds.length} tests)`
                        : 'Create'
                      : 'Save'}
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
