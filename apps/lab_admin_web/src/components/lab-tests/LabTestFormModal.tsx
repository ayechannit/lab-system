import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import type { LabTestCatalogRow } from '../../model/types'
import { createLabTest, updateLabTest, type LabTestWriteBody } from '../../services/labTestCatalogService'
import '../common/ui.css'

function suggestCodeFromName(name: string): string {
  const base = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32)
  return base || 'TEST'
}

function uniqueCode(base: string, existing: LabTestCatalogRow[]): string {
  const upper = base.trim().toUpperCase().slice(0, 100)
  if (!upper) return 'TEST'
  const codes = new Set(existing.map((r) => r.test_code.toUpperCase()))
  if (!codes.has(upper)) return upper
  let n = 2
  while (codes.has(`${upper}_${n}`)) n += 1
  return `${upper}_${n}`
}

type LabTestFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: LabTestCatalogRow | null
  existingRows: LabTestCatalogRow[]
  onClose: () => void
  onSuccess: () => void
}

export function LabTestFormModal({
  open,
  mode,
  initial,
  existingRows,
  onClose,
  onSuccess,
}: LabTestFormModalProps) {
  const titleId = useId()
  const catalogActiveId = useId()
  const [testName, setTestName] = useState('')
  const [description, setDescription] = useState('')
  const [basePriceMmk, setBasePriceMmk] = useState<number | ''>('')
  const [testCode, setTestCode] = useState('')
  const [category, setCategory] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setTestName(initial.test_name)
      setDescription(initial.description ?? '')
      setBasePriceMmk(initial.base_price_mmk)
      setTestCode(initial.test_code)
      setCategory(initial.category ?? '')
      setIsActive(initial.is_active)
    } else {
      setTestName('')
      setDescription('')
      setBasePriceMmk(0)
      setTestCode('')
      setCategory('')
      setIsActive(true)
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

    const name = testName.trim()
    if (!name) {
      setFormError('Enter a test name.')
      return
    }
    const price =
      typeof basePriceMmk === 'number' ? basePriceMmk : Number.parseFloat(String(basePriceMmk))
    if (!Number.isFinite(price) || price < 0) {
      setFormError('Enter a valid amount (MMK).')
      return
    }

    const codeInput = testCode.trim()
    const pool =
      mode === 'edit' && initial ? existingRows.filter((r) => r.id !== initial.id) : existingRows
    const code = uniqueCode(codeInput || suggestCodeFromName(name), pool)

    const base = Math.round(price * 100) / 100

    const body: LabTestWriteBody = {
      test_name: name,
      test_code: code,
      description: description.trim() || null,
      base_price_mmk: base,
      category: category.trim() || null,
      is_active: isActive,
    }
    setSubmitting(true)
    try {
      if (mode === 'create') {
        await createLabTest(body)
      } else if (initial) {
        await updateLabTest(initial.id, body)
      } else {
        return
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

  const title = mode === 'create' ? 'Create lab test' : 'Edit lab test'

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
      <div className="modal-card modal-card--lab-test-form" onMouseDown={(e) => e.stopPropagation()}>
        <div className="lab-test-modal__head">
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

        <form className="lab-test-modal__form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="lab-test-modal__body">
            <div className="lab-test-modal__grid">
              <p className="user-form-modal__section-label lab-test-modal__area-tl">Test details</p>
              <p className="user-form-modal__section-label lab-test-modal__area-tr">Pricing (MMK)</p>

              <div className="lab-test-modal__col-left">
                <div className="field">
                  <label htmlFor="ltf-name">Test name</label>
                  <input
                    id="ltf-name"
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    placeholder="e.g. Liver function panel"
                    autoComplete="off"
                    autoFocus
                    disabled={submitting}
                  />
                </div>

                <div className="field lab-test-modal__desc">
                  <label htmlFor="ltf-desc">Description</label>
                  <textarea
                    id="ltf-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What the panel includes, fasting notes, etc."
                    disabled={submitting}
                  />
                </div>

                <label htmlFor={catalogActiveId} className="form-switch">
                  <span className="form-switch__control">
                    <input
                      id={catalogActiveId}
                      type="checkbox"
                      className="form-switch__input"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      disabled={submitting}
                    />
                    <span className="form-switch__track" aria-hidden="true" />
                  </span>
                  <span className="form-switch__text">
                    <span className="form-switch__title">{isActive ? 'Test is active' : 'Test is inactive'}</span>
                    <span className="form-switch__desc">
                      Inactive tests stay in the catalog for admin but are hidden from published role pricing.
                    </span>
                  </span>
                </label>

                <div className="lab-test-modal__codes-stack">
                  <div className="field">
                    <label htmlFor="ltf-code">Test code (optional)</label>
                    <input
                      id="ltf-code"
                      value={testCode}
                      onChange={(e) => setTestCode(e.target.value.toUpperCase())}
                      placeholder="Auto from name if empty"
                      autoComplete="off"
                      disabled={submitting}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="ltf-cat">Category (optional)</label>
                    <input
                      id="ltf-cat"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. Chemistry"
                      autoComplete="off"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>

              <div className="lab-test-modal__col-right">
                <div className="lab-test-modal__prices-stack">
                  <div className="field">
                    <label htmlFor="ltf-price">Base price</label>
                    <input
                      id="ltf-price"
                      type="number"
                      min={0}
                      step={100}
                      value={basePriceMmk === '' ? '' : basePriceMmk}
                      onChange={(e) => {
                        const v = e.target.value
                        setBasePriceMmk(v === '' ? '' : Number(v))
                      }}
                      placeholder="0"
                      disabled={submitting}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lab-test-modal__footer">
            {formError ? (
              <div className="form-alert form-alert--error" role="alert">
                {formError}
              </div>
            ) : null}
            <div className="lab-test-modal__footer-actions">
              <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => !submitting && onClose()} disabled={submitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : mode === 'create' ? 'Create test' : 'Save changes'}
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
