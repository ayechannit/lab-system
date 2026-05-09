import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  createPointSetting,
  type PointSettingRow,
  type PointSettingUpsertBody,
  updatePointSetting,
} from '../../services/pointSettingService'
import '../common/ui.css'

function toDatetimeLocalValue(iso: string | undefined | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocalValue(v: string): string | null {
  const t = v.trim()
  if (!t) return null
  const d = new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

type PointSettingFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: PointSettingRow | null
  onClose: () => void
  onSuccess: () => void
}

export function PointSettingFormModal({
  open,
  mode,
  initial,
  onClose,
  onSuccess,
}: PointSettingFormModalProps) {
  const titleId = useId()
  const [name, setName] = useState(() => (initial ? initial.name : 'Default tier'))
  const [spendMmk, setSpendMmk] = useState<number | ''>(() => (initial ? initial.spend_amount_mmk : 100_000))
  const [pointsReward, setPointsReward] = useState<number | ''>(() => (initial ? initial.points_reward : 10))
  const [startLocal, setStartLocal] = useState(() => toDatetimeLocalValue(initial?.start_date ?? null))
  const [endLocal, setEndLocal] = useState(() => toDatetimeLocalValue(initial?.end_date ?? null))
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
    const nameTrim = name.trim()
    if (!nameTrim) {
      setFormError('Enter a name for this rule (e.g. Base tier).')
      return
    }
    const spend =
      typeof spendMmk === 'number' ? spendMmk : Number.parseFloat(String(spendMmk))
    if (!Number.isFinite(spend) || spend < 1) {
      setFormError('MMK spend per batch must be at least 1.')
      return
    }
    const pts =
      typeof pointsReward === 'number' ? pointsReward : Number.parseInt(String(pointsReward), 10)
    if (!Number.isFinite(pts) || pts < 1 || !Number.isInteger(pts)) {
      setFormError('Points per batch must be a whole number of at least 1.')
      return
    }
    const startIso = fromDatetimeLocalValue(startLocal)
    const endIso = fromDatetimeLocalValue(endLocal)
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      setFormError('End date must be on or after the start date.')
      return
    }
    const body: PointSettingUpsertBody = {
      name: nameTrim,
      spend_amount_mmk: Math.round(spend * 100) / 100,
      points_reward: pts,
      start_date: startIso,
      end_date: endIso,
    }
    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        await updatePointSetting(initial.id, body)
      } else {
        await createPointSetting(body)
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

  const title = mode === 'edit' ? 'Edit earn rule' : 'Add earn rule'

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
              <div className="field">
                <label htmlFor="ps-name">Rule name</label>
                <input
                  id="ps-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ps-spend">MMK spend per batch</label>
                <input
                  id="ps-spend"
                  type="number"
                  min={1}
                  step={0.01}
                  value={spendMmk === '' ? '' : spendMmk}
                  onChange={(e) => {
                    const v = e.target.value
                    setSpendMmk(v === '' ? '' : Number.parseFloat(v))
                  }}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ps-points">Points earned per batch</label>
                <input
                  id="ps-points"
                  type="number"
                  min={1}
                  step={1}
                  value={pointsReward === '' ? '' : pointsReward}
                  onChange={(e) => {
                    const v = e.target.value
                    setPointsReward(v === '' ? '' : Number.parseInt(v, 10))
                  }}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ps-start">Start (optional)</label>
                <input
                  id="ps-start"
                  type="datetime-local"
                  value={startLocal}
                  onChange={(e) => setStartLocal(e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ps-end">End (optional)</label>
                <input
                  id="ps-end"
                  type="datetime-local"
                  value={endLocal}
                  onChange={(e) => setEndLocal(e.target.value)}
                  disabled={submitting}
                />
              </div>
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
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create rule'}
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
