import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LabTestCatalogRow } from '../../model/types'
import {
  bulkUpsertReferralFees,
  referralFeeAmountMmk,
  type ReferralFeeUpsertBody,
  type TestReferralFeeListRow,
  upsertReferralFee,
} from '../../services/referralFeeService'
import '../common/ui.css'

function roleLabelReadonly(role: string | undefined): string {
  if (!role) return ''
  const map: Record<string, string> = {
    clinic: 'Clinic',
    doctor: 'Doctor',
    patient: 'Patient',
    phlebotomist: 'Phlebotomist',
    all: 'All roles',
  }
  return map[role] ?? role
}

const REFERRAL_TEST_PICKER_MAX = 100

const ROLE_OPTIONS: { value: ReferralFeeUpsertBody['role']; label: string }[] = [
  { value: 'clinic', label: 'Clinic' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'patient', label: 'Patient' },
  { value: 'phlebotomist', label: 'Phlebotomist' },
  { value: 'all', label: 'All roles (same %)' },
]

type ReferralFeeFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: TestReferralFeeListRow | null
  tests: LabTestCatalogRow[]
  onClose: () => void
  onSuccess: () => void
}

export function ReferralFeeFormModal({
  open,
  mode,
  initial,
  tests,
  onClose,
  onSuccess,
}: ReferralFeeFormModalProps) {
  const titleId = useId()
  const activeId = useId()
  const testFilterId = useId()
  const roleTriggerId = useId()
  const rolePanelId = useId()
  const testFilterInputRef = useRef<HTMLInputElement>(null)
  const selectAllVisibleRef = useRef<HTMLInputElement>(null)
  const rolePickerWrapRef = useRef<HTMLDivElement>(null)
  const [rolesPickerOpen, setRolesPickerOpen] = useState(false)
  const [testId, setTestId] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<ReferralFeeUpsertBody['role'][]>([])
  const [testSearch, setTestSearch] = useState('')
  const [referralPercent, setReferralPercent] = useState<number | ''>(0)
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
      setRolesPickerOpen(false)
      setSelectedRoles([initial.role as ReferralFeeUpsertBody['role']])
      setReferralPercent(initial.referral_percent)
      setIsActive(initial.is_active)
    } else {
      setTestId('')
      setSelectedTestIds([])
      setTestSearch('')
      setRolesPickerOpen(false)
      setSelectedRoles([])
      setReferralPercent(0)
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
      if (mode === 'create' && rolesPickerOpen) {
        setRolesPickerOpen(false)
        return
      }
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting, mode, rolesPickerOpen])

  useEffect(() => {
    if (!rolesPickerOpen) return
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      if (!rolePickerWrapRef.current?.contains(target)) setRolesPickerOpen(false)
    }
    // Capture phase — modal card stops bubble, so bubble-phase listeners never run.
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [rolesPickerOpen])

  useEffect(() => {
    if (!open || submitting || mode !== 'create') return
    const id = requestAnimationFrame(() => {
      testFilterInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, submitting, mode])

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
    () => filteredTestsSorted.slice(0, REFERRAL_TEST_PICKER_MAX),
    [filteredTestsSorted],
  )

  const selectedSet = useMemo(() => new Set(selectedTestIds), [selectedTestIds])

  const visibleTestIds = useMemo(() => testsPickerRows.map((t) => t.id), [testsPickerRows])
  const allVisibleTestsSelected =
    visibleTestIds.length > 0 && visibleTestIds.every((id) => selectedSet.has(id))
  const someVisibleTestsSelected = visibleTestIds.some((id) => selectedSet.has(id))

  useEffect(() => {
    const el = selectAllVisibleRef.current
    if (el) el.indeterminate = someVisibleTestsSelected && !allVisibleTestsSelected
  }, [someVisibleTestsSelected, allVisibleTestsSelected])

  function toggleTestId(id: string) {
    setSelectedTestIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function selectAllTests() {
    setSelectedTestIds(tests.map((t) => t.id))
  }

  function clearTestSelection() {
    setSelectedTestIds([])
  }

  function toggleAllVisibleTests() {
    if (allVisibleTestsSelected) {
      const visible = new Set(visibleTestIds)
      setSelectedTestIds((prev) => prev.filter((id) => !visible.has(id)))
      return
    }
    setSelectedTestIds((prev) => [...new Set([...prev, ...visibleTestIds])])
  }

  const selectedRoleSet = useMemo(() => new Set(selectedRoles), [selectedRoles])

  const rolePickerSummary = useMemo(() => {
    if (selectedRoles.length === 0) return 'Choose roles…'
    if (selectedRoles.includes('all')) return 'All roles (same %)'
    if (selectedRoles.length === 1) {
      return ROLE_OPTIONS.find((o) => o.value === selectedRoles[0])?.label ?? '1 role selected'
    }
    return `${selectedRoles.length} roles selected`
  }, [selectedRoles])

  function toggleRole(value: ReferralFeeUpsertBody['role']) {
    if (value === 'all') {
      setSelectedRoles((prev) => (prev.includes('all') ? [] : ['all']))
      return
    }
    setSelectedRoles((prev) => {
      const next = prev.filter((r) => r !== 'all')
      if (next.includes(value)) return next.filter((r) => r !== value)
      return [...next, value]
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (mode === 'create' && selectedTestIds.length === 0) {
      setFormError('Select at least one lab test.')
      return
    }
    if (mode === 'create' && selectedRoles.length === 0) {
      setFormError('Select at least one role.')
      return
    }
    const pctRaw =
      typeof referralPercent === 'number' ? referralPercent : Number.parseFloat(String(referralPercent))
    if (!Number.isFinite(pctRaw) || pctRaw < 0 || pctRaw > 100) {
      setFormError('Enter a referral fee between 0 and 100%.')
      return
    }
    const pctN = Math.round(pctRaw * 100) / 100

    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        const body: ReferralFeeUpsertBody = {
          test_id: testId,
          role: initial.role as ReferralFeeUpsertBody['role'],
          referral_percent: pctN,
          is_active: isActive,
        }
        await upsertReferralFee(body)
        onSuccess()
        onClose()
        return
      }

      const ids = selectedTestIds
      const rolesForBulk: ReferralFeeUpsertBody['role'][] = selectedRoles.includes('all')
        ? ['all']
        : selectedRoles
      const referral_fees: ReferralFeeUpsertBody[] = []
      for (const test_id of ids) {
        for (const role of rolesForBulk) {
          referral_fees.push({
            test_id,
            role,
            referral_percent: pctN,
            is_active: isActive,
          })
        }
      }
      await bulkUpsertReferralFees({ referral_fees })
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
    referralPercent === ''
      ? null
      : typeof referralPercent === 'number'
        ? referralPercent
        : Number.parseFloat(String(referralPercent))

  const previewFee = useMemo(() => {
    if (!selectedTest || pctForPreview === null || !Number.isFinite(pctForPreview)) return null
    return referralFeeAmountMmk(selectedTest.base_price_mmk, pctForPreview)
  }, [selectedTest, pctForPreview])

  if (!open) return null

  const title = mode === 'create' ? 'Add referral fee' : 'Edit referral fee'
  const testLabel =
    mode === 'edit' && initial
      ? [initial.test_name, initial.test_code].filter(Boolean).join(' · ') || initial.test_id
      : null

  const createSubmitDisabled =
    submitting ||
    (mode === 'create' &&
      (tests.length === 0 || selectedTestIds.length === 0 || selectedRoles.length === 0))

  const createRuleCount =
    mode === 'create' ? selectedTestIds.length * (selectedRoles.includes('all') ? 1 : selectedRoles.length) : 0

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
                    <label htmlFor="rf-role-ro">Role</label>
                    <input
                      id="rf-role-ro"
                      readOnly
                      disabled
                      value={roleLabelReadonly(initial?.role)}
                      className="lab-test-modal__input-computed"
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="rf-pct">Referral fee %</label>
                    <input
                      id="rf-pct"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={referralPercent === '' ? '' : referralPercent}
                      onChange={(e) => {
                        const v = e.target.value
                        setReferralPercent(v === '' ? '' : Number(v))
                      }}
                      disabled={submitting}
                    />
                    {selectedTest && previewFee !== null ? (
                      <p className="discount-form-modal__preview-inline">
                        Base {selectedTest.base_price_mmk.toLocaleString()} MMK → referral fee{' '}
                        <strong>{previewFee.toLocaleString()}</strong> MMK
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
                      Select one or more tests. The same roles, referral %, and active setting apply to each
                      combination.
                    </p>
                    {tests.length === 0 ? (
                      <p className="discount-form-modal__panel-note">No tests in catalog.</p>
                    ) : (
                      <div className="discount-form-modal__test-panel">
                        <div className="discount-form-modal__test-toolbar">
                          <label htmlFor={testFilterId} className="visually-hidden">
                            Search tests
                          </label>
                          <input
                            ref={testFilterInputRef}
                            id={testFilterId}
                            type="search"
                            placeholder="Search by name or code…"
                            value={testSearch}
                            onChange={(e) => setTestSearch(e.target.value)}
                            disabled={submitting}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <span className="discount-form-modal__count-badge">
                            {selectedTestIds.length} selected
                          </span>
                        </div>
                        {filteredTestsSorted.length > REFERRAL_TEST_PICKER_MAX ? (
                          <p className="discount-form-modal__panel-note">
                            Showing {REFERRAL_TEST_PICKER_MAX} of {filteredTestsSorted.length} matches — narrow your
                            search.
                          </p>
                        ) : null}
                        <div className="discount-form-modal__test-table-wrap table-wrap">
                          <table className="data-table data-table--align-left discount-form-modal__test-table">
                            <thead>
                              <tr>
                                <th className="discount-form-modal__test-table-check" scope="col">
                                  <span className="visually-hidden">Select</span>
                                  <input
                                    ref={selectAllVisibleRef}
                                    type="checkbox"
                                    checked={allVisibleTestsSelected}
                                    onChange={toggleAllVisibleTests}
                                    disabled={submitting || visibleTestIds.length === 0}
                                    aria-label={
                                      allVisibleTestsSelected
                                        ? 'Clear selection for visible tests'
                                        : 'Select all visible tests'
                                    }
                                  />
                                </th>
                                <th scope="col">Test</th>
                                <th scope="col">Code</th>
                                <th className="col-num" scope="col">
                                  Base (MMK)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTestsSorted.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="data-table__state">
                                    No tests match your search.
                                  </td>
                                </tr>
                              ) : (
                                testsPickerRows.map((t) => {
                                  const checked = selectedSet.has(t.id)
                                  return (
                                    <tr
                                      key={t.id}
                                      className={checked ? 'discount-form-modal__test-table-row--selected' : undefined}
                                      onClick={() => !submitting && toggleTestId(t.id)}
                                    >
                                      <td className="discount-form-modal__test-table-check">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleTestId(t.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          disabled={submitting}
                                          aria-label={`Select ${t.test_name}`}
                                        />
                                      </td>
                                      <td>{t.test_name}</td>
                                      <td>
                                        <code>{t.test_code}</code>
                                      </td>
                                      <td className="col-num">{t.base_price_mmk.toLocaleString()}</td>
                                    </tr>
                                  )
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                        <div className="discount-form-modal__test-quick">
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
                    )}
                  </div>

                  <div className="discount-form-modal__fieldset">
                    <p className="discount-form-modal__hint" style={{ marginTop: 0 }}>
                      Select one or more roles. &quot;All roles&quot; applies the same % to clinic, doctor, patient, and
                      phlebotomist.
                    </p>
                    <div
                      ref={rolePickerWrapRef}
                      className={`field order-test-multiselect discount-form-modal__roles-picker order-test-multiselect--drop-up${rolesPickerOpen && !submitting ? ' order-test-multiselect--open' : ''}`}
                      style={{ marginBottom: 0 }}
                    >
                      <label htmlFor={roleTriggerId}>Roles</label>
                      <div className="order-test-multiselect__anchor">
                        <button
                          type="button"
                          id={roleTriggerId}
                          className={`order-test-multiselect-trigger${selectedRoles.length === 0 ? ' order-test-multiselect-trigger--placeholder' : ''}`}
                          disabled={submitting}
                          aria-expanded={rolesPickerOpen}
                          aria-controls={rolePanelId}
                          aria-haspopup="listbox"
                          onClick={() => !submitting && setRolesPickerOpen((o) => !o)}
                        >
                          {rolePickerSummary}
                        </button>
                        {rolesPickerOpen && !submitting ? (
                          <div
                            id={rolePanelId}
                            className="order-test-multiselect-panel order-test-multiselect-panel--compact order-test-multiselect-panel--drop-up"
                            role="listbox"
                            aria-multiselectable="true"
                          >
                            {ROLE_OPTIONS.map((o) => {
                              const checked = selectedRoleSet.has(o.value)
                              return (
                                <label key={o.value} className="order-test-multiselect-row">
                                  <input
                                    type="checkbox"
                                    className="order-test-multiselect-row__check"
                                    checked={checked}
                                    onChange={() => toggleRole(o.value)}
                                    onClick={(e) => e.stopPropagation()}
                                    disabled={submitting}
                                  />
                                  <span className="order-test-multiselect-row__body">
                                    <span className="order-test-multiselect-row__title">
                                      <span className="order-test-multiselect-row__name">{o.label}</span>
                                    </span>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="rf-pct-create">Referral fee %</label>
                    <input
                      id="rf-pct-create"
                      type="number"
                      min={0}
                      max={100}
                      step={0.5}
                      value={referralPercent === '' ? '' : referralPercent}
                      onChange={(e) => {
                        const v = e.target.value
                        setReferralPercent(v === '' ? '' : Number(v))
                      }}
                      disabled={submitting}
                    />
                  </div>

                  {selectedTestsCreate.length > 0 && pctForPreview !== null && Number.isFinite(pctForPreview) ? (
                    <div className="discount-form-modal__preview-card" aria-live="polite">
                      <div className="discount-form-modal__preview-head">Referral fee (preview)</div>
                      <ul className="discount-form-modal__preview-rows">
                        {selectedTestsCreate.map((t) => {
                          const fee = referralFeeAmountMmk(t.base_price_mmk, pctForPreview)
                          return (
                            <li key={t.id} className="discount-form-modal__preview-row">
                              <span className="discount-form-modal__preview-row__label">{t.test_name}</span>
                              <span className="discount-form-modal__preview-row__nums">
                                {t.base_price_mmk.toLocaleString()} base → <strong>{fee.toLocaleString()}</strong> MMK
                              </span>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}

              <label htmlFor={activeId} className="form-switch">
                <span className="form-switch__control">
                  <input
                    id={activeId}
                    type="checkbox"
                    className="form-switch__input"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    disabled={submitting}
                  />
                  <span className="form-switch__track" aria-hidden="true" />
                </span>
                <span className="form-switch__text">
                  <span className="form-switch__title">{isActive ? 'Rule is active' : 'Rule is inactive'}</span>
                  <span className="form-switch__desc">
                    Inactive rows are kept but do not apply until turned on again.
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
                      ? 'Creating…'
                      : 'Saving…'
                    : mode === 'create'
                      ? createRuleCount > 1
                        ? `Create ${createRuleCount} rules`
                        : 'Create rule'
                      : 'Save rule'}
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
