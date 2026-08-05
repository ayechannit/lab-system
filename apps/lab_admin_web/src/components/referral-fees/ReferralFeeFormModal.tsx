import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import type { LabTestCatalogRow } from '../../model/types'
import {
  bulkUpsertReferralFees,
  referralFeeAmountMmk,
  type ReferralFeeUpsertBody,
  type TestReferralFeeListRow,
  upsertReferralFee,
} from '../../services/referralFeeService'
import '../common/ui.css'

const REFERRAL_TEST_PICKER_MAX = 100

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
  const { t } = useTranslation()
  const titleId = useId()
  const activeId = useId()
  const testFilterId = useId()
  const testFilterInputRef = useRef<HTMLInputElement>(null)
  const selectAllVisibleRef = useRef<HTMLInputElement>(null)
  const [testId, setTestId] = useState('')
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>([])
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
      setReferralPercent(initial.referral_percent)
      setIsActive(initial.is_active)
    } else {
      setTestId('')
      setSelectedTestIds([])
      setTestSearch('')
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
      onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, submitting])

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    if (mode === 'create' && selectedTestIds.length === 0) {
      setFormError(t('referralFees.form.errorSelectTest'))
      return
    }
    const pctRaw =
      typeof referralPercent === 'number' ? referralPercent : Number.parseFloat(String(referralPercent))
    if (!Number.isFinite(pctRaw) || pctRaw < 0 || pctRaw > 100) {
      setFormError(t('referralFees.form.errorPercentRange'))
      return
    }
    const pctN = Math.round(pctRaw * 100) / 100

    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        const body: ReferralFeeUpsertBody = {
          test_id: testId,
          referral_percent: pctN,
          is_active: isActive,
        }
        await upsertReferralFee(body)
        onSuccess()
        onClose()
        return
      }

      const referral_fees: ReferralFeeUpsertBody[] = selectedTestIds.map((test_id) => ({
        test_id,
        referral_percent: pctN,
        is_active: isActive,
      }))
      await bulkUpsertReferralFees({ referral_fees })
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('referralFees.form.requestFailed'))
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

  const title = mode === 'create' ? t('referralFees.form.createTitle') : t('referralFees.form.editTitle')
  const testLabel =
    mode === 'edit' && initial
      ? [initial.test_name, initial.test_code].filter(Boolean).join(' · ') || initial.test_id
      : null

  const createSubmitDisabled =
    submitting || (mode === 'create' && (tests.length === 0 || selectedTestIds.length === 0))

  const createRuleCount = mode === 'create' ? selectedTestIds.length : 0

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
              aria-label={t('common.close')}
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
                      {t('referralFees.form.labTest')}
                    </span>
                    <p className="discount-form-modal__readonly-test-name">{testLabel}</p>
                  </div>
                  <div className="field">
                    <label htmlFor="rf-pct">{t('referralFees.form.referralPercent')}</label>
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
                        {t('referralFees.form.previewInline', {
                          base: selectedTest.base_price_mmk.toLocaleString(),
                          fee: previewFee.toLocaleString(),
                        })}
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="discount-form-modal__fieldset">
                    <span className="user-form-modal__section-label" style={{ display: 'block', marginBottom: '0.35rem' }}>
                      {t('referralFees.form.labTests')}
                    </span>
                    <p className="discount-form-modal__hint">{t('referralFees.form.labTestsHint')}</p>
                    {tests.length === 0 ? (
                      <p className="discount-form-modal__panel-note">{t('referralFees.form.noTestsInCatalog')}</p>
                    ) : (
                      <div className="discount-form-modal__test-panel">
                        <div className="discount-form-modal__test-toolbar">
                          <label htmlFor={testFilterId} className="visually-hidden">
                            {t('referralFees.form.searchTests')}
                          </label>
                          <input
                            ref={testFilterInputRef}
                            id={testFilterId}
                            type="search"
                            placeholder={t('referralFees.form.searchPlaceholder')}
                            value={testSearch}
                            onChange={(e) => setTestSearch(e.target.value)}
                            disabled={submitting}
                            autoComplete="off"
                            spellCheck={false}
                          />
                          <span className="discount-form-modal__count-badge">
                            {t('referralFees.form.selectedCount', { count: selectedTestIds.length })}
                          </span>
                        </div>
                        {filteredTestsSorted.length > REFERRAL_TEST_PICKER_MAX ? (
                          <p className="discount-form-modal__panel-note">
                            {t('referralFees.form.showingMatches', {
                              shown: REFERRAL_TEST_PICKER_MAX,
                              total: filteredTestsSorted.length,
                            })}
                          </p>
                        ) : null}
                        <div className="discount-form-modal__test-table-wrap table-wrap">
                          <table className="data-table data-table--align-left discount-form-modal__test-table">
                            <thead>
                              <tr>
                                <th className="discount-form-modal__test-table-check" scope="col">
                                  <span className="visually-hidden">{t('referralFees.form.selectColumn')}</span>
                                  <input
                                    ref={selectAllVisibleRef}
                                    type="checkbox"
                                    checked={allVisibleTestsSelected}
                                    onChange={toggleAllVisibleTests}
                                    disabled={submitting || visibleTestIds.length === 0}
                                    aria-label={
                                      allVisibleTestsSelected
                                        ? t('referralFees.form.clearVisibleSelection')
                                        : t('referralFees.form.selectAllVisible')
                                    }
                                  />
                                </th>
                                <th scope="col">{t('common.test')}</th>
                                <th scope="col">{t('common.code')}</th>
                                <th className="col-num" scope="col">
                                  {t('labTests.table.base')}
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTestsSorted.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="data-table__state">
                                    {t('referralFees.form.noSearchMatch')}
                                  </td>
                                </tr>
                              ) : (
                                testsPickerRows.map((testRow) => {
                                  const checked = selectedSet.has(testRow.id)
                                  return (
                                    <tr
                                      key={testRow.id}
                                      className={checked ? 'discount-form-modal__test-table-row--selected' : undefined}
                                      onClick={() => !submitting && toggleTestId(testRow.id)}
                                    >
                                      <td className="discount-form-modal__test-table-check">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => toggleTestId(testRow.id)}
                                          onClick={(e) => e.stopPropagation()}
                                          disabled={submitting}
                                          aria-label={t('referralFees.form.selectTestAria', { name: testRow.test_name })}
                                        />
                                      </td>
                                      <td>{testRow.test_name}</td>
                                      <td>
                                        <code>{testRow.test_code}</code>
                                      </td>
                                      <td className="col-num">{testRow.base_price_mmk.toLocaleString()}</td>
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
                            {t('referralFees.form.selectAll')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={clearTestSelection}
                            disabled={submitting || selectedTestIds.length === 0}
                          >
                            {t('referralFees.form.clear')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="field">
                    <label htmlFor="rf-pct-create">{t('referralFees.form.referralPercent')}</label>
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
                      <div className="discount-form-modal__preview-head">{t('referralFees.form.previewTitle')}</div>
                      <ul className="discount-form-modal__preview-rows">
                        {selectedTestsCreate.map((testRow) => {
                          const fee = referralFeeAmountMmk(testRow.base_price_mmk, pctForPreview)
                          return (
                            <li key={testRow.id} className="discount-form-modal__preview-row">
                              <span className="discount-form-modal__preview-row__label">{testRow.test_name}</span>
                              <span className="discount-form-modal__preview-row__nums">
                                {t('referralFees.form.previewRow', {
                                  base: testRow.base_price_mmk.toLocaleString(),
                                  fee: fee.toLocaleString(),
                                })}
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
                  <span className="form-switch__title">
                    {isActive ? t('referralFees.form.activeTitle') : t('referralFees.form.inactiveTitle')}
                  </span>
                  <span className="form-switch__desc">{t('referralFees.form.activeDesc')}</span>
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
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={createSubmitDisabled}>
                  {submitting
                    ? mode === 'create'
                      ? t('referralFees.form.creating')
                      : t('referralFees.form.saving')
                    : mode === 'create'
                      ? createRuleCount > 1
                        ? t('referralFees.form.createRules', { count: createRuleCount })
                        : t('referralFees.form.createRule')
                      : t('referralFees.form.saveRule')}
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
