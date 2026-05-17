import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
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

const DISCOUNT_TEST_PICKER_MAX = 100

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
  const discountTestTriggerId = useId()
  const discountTestFilterId = useId()
  const discountTestPanelId = useId()
  const testPickerWrapRef = useRef<HTMLDivElement>(null)
  const testFilterInputRef = useRef<HTMLInputElement>(null)
  const [testPickerOpen, setTestPickerOpen] = useState(false)
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
      setTestPickerOpen(false)
      setRole(initial.role as DiscountUpsertBody['role'])
      setDiscountPercent(initial.discount_percent)
      setIsActive(initial.is_active)
    } else {
      setTestId('')
      setSelectedTestIds([])
      setTestSearch('')
      setTestPickerOpen(false)
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
      if (e.key !== 'Escape' || submitting) return
      if (testPickerOpen) {
        setTestPickerOpen(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting, testPickerOpen])

  useEffect(() => {
    if (!testPickerOpen || submitting) return
    const id = requestAnimationFrame(() => {
      testFilterInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [testPickerOpen, submitting])

  useEffect(() => {
    if (!testPickerOpen) return
    function onDocMouseDown(e: MouseEvent) {
      if (!testPickerWrapRef.current?.contains(e.target as Node)) setTestPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [testPickerOpen])

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

  const testsPickerRows = useMemo(
    () => filteredTestsSorted.slice(0, DISCOUNT_TEST_PICKER_MAX),
    [filteredTestsSorted],
  )

  const selectedSet = useMemo(() => new Set(selectedTestIds), [selectedTestIds])
  const testPickerSummary =
    tests.length === 0
      ? 'No tests in catalog'
      : selectedTestIds.length === 0
        ? 'Choose tests…'
        : selectedTestIds.length === tests.length
          ? `All ${tests.length} tests selected`
          : `${selectedTestIds.length} test${selectedTestIds.length === 1 ? '' : 's'} selected`

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
                  <div className="discount-form-modal__fieldset">
                    <span className="user-form-modal__section-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                      Lab tests
                    </span>
                    <p className="discount-form-modal__hint">
                      Select one or more tests. The same role, discount %, and active setting apply to each selected
                      test.
                    </p>
                    <div
                      ref={testPickerWrapRef}
                      className={`field order-test-multiselect${testPickerOpen && !submitting ? ' order-test-multiselect--open' : ''}`}
                      style={{ marginBottom: 0 }}
                    >
                      <div className="order-test-multiselect__anchor">
                        <button
                          type="button"
                          id={discountTestTriggerId}
                          className={`order-test-multiselect-trigger${selectedTestIds.length === 0 ? ' order-test-multiselect-trigger--placeholder' : ''}`}
                          disabled={submitting || tests.length === 0}
                          aria-expanded={testPickerOpen}
                          aria-controls={discountTestPanelId}
                          aria-haspopup="listbox"
                          aria-label="Search and select lab tests for this discount"
                          onClick={() => {
                            if (!submitting && tests.length > 0) setTestPickerOpen((o) => !o)
                          }}
                        >
                          {testPickerSummary}
                        </button>
                        {testPickerOpen && !submitting && tests.length > 0 ? (
                          <div
                            id={discountTestPanelId}
                            className="order-test-multiselect-panel"
                            role="listbox"
                            aria-multiselectable="true"
                          >
                            <div className="order-test-multiselect-panel__search">
                              <label htmlFor={discountTestFilterId} className="order-test-multiselect-panel__search-label">
                                Search tests
                              </label>
                              <input
                                ref={testFilterInputRef}
                                id={discountTestFilterId}
                                type="text"
                                className="order-test-multiselect-panel__search-input"
                                placeholder="Name or code…"
                                value={testSearch}
                                onChange={(e) => setTestSearch(e.target.value)}
                                autoComplete="off"
                                spellCheck={false}
                                onMouseDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            {filteredTestsSorted.length > DISCOUNT_TEST_PICKER_MAX ? (
                              <p className="order-test-multiselect-panel__hint">
                                Showing {DISCOUNT_TEST_PICKER_MAX} of {filteredTestsSorted.length} matches — narrow your
                                search.
                              </p>
                            ) : null}
                            {filteredTestsSorted.length === 0 ? (
                              <p className="discount-form-modal__test-list-empty" style={{ margin: '0.65rem 0.85rem' }}>
                                No tests match your search.
                              </p>
                            ) : (
                              testsPickerRows.map((t) => {
                                const checked = selectedSet.has(t.id)
                                return (
                                  <label key={t.id} className="order-test-multiselect-row">
                                    <input
                                      type="checkbox"
                                      className="order-test-multiselect-row__check"
                                      checked={checked}
                                      onChange={() => toggleTestId(t.id)}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="order-test-multiselect-row__body">
                                      <span className="order-test-multiselect-row__title">
                                        <span className="order-test-multiselect-row__name">{t.test_name}</span>
                                        <span className="order-test-multiselect-row__code">{t.test_code}</span>
                                      </span>
                                      <span className="order-test-multiselect-row__foot">
                                        <span className="order-test-multiselect-row__discount">Base price</span>
                                        <span className="order-test-multiselect-row__price">
                                          {t.base_price_mmk.toLocaleString()} MMK
                                        </span>
                                      </span>
                                    </span>
                                  </label>
                                )
                              })
                            )}
                            <div
                              className="discount-form-modal__test-quick"
                              style={{
                                padding: '0.55rem 0.75rem',
                                borderTop: '1px solid var(--border)',
                                background: '#fafbfd',
                              }}
                            >
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={selectAllTests}
                                disabled={submitting || tests.length === 0}
                              >
                                Select all
                              </button>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={clearTestSelection}
                                disabled={submitting || selectedTestIds.length === 0}
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

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
                    ? mode === 'create'
                      ? 'Creating discount…'
                      : 'Saving discount…'
                    : mode === 'create'
                      ? selectedTestIds.length > 1
                        ? `Create discount (${selectedTestIds.length} tests)`
                        : 'Create discount'
                      : 'Save discount'}
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
