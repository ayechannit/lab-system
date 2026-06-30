import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { DatetimeLocalField } from '../common/DatetimeLocalField'
import {
  createPointSetting,
  type PointSettingRow,
  type PointSettingUpsertBody,
  updatePointSetting,
} from '../../services/pointSettingService'
import { datetimeLocalToIso, toDatetimeLocalValue } from '../../utils/datetimeLocal'
import '../common/ui.css'

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
  const { t } = useTranslation()
  const titleId = useId()
  const activeFieldId = useId()
  const [name, setName] = useState('')
  const [spendMmk, setSpendMmk] = useState<number | ''>(100_000)
  const [pointsReward, setPointsReward] = useState<number | ''>(10)
  const [startLocal, setStartLocal] = useState('')
  const [endLocal, setEndLocal] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setSpendMmk(initial.spend_amount_mmk)
      setPointsReward(initial.points_reward)
      setStartLocal(toDatetimeLocalValue(initial.start_date))
      setEndLocal(toDatetimeLocalValue(initial.end_date))
      setIsActive(initial.is_active)
    } else {
      setName(t('loyalty.form.defaultTierName'))
      setSpendMmk(100_000)
      setPointsReward(10)
      setStartLocal('')
      setEndLocal('')
      setIsActive(true)
    }
  }, [open, mode, initial, t])

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
      setFormError(t('loyalty.form.errorName'))
      return
    }
    const spend =
      typeof spendMmk === 'number' ? spendMmk : Number.parseFloat(String(spendMmk))
    if (!Number.isFinite(spend) || spend < 1) {
      setFormError(t('loyalty.form.errorSpendMin'))
      return
    }
    const pts =
      typeof pointsReward === 'number' ? pointsReward : Number.parseInt(String(pointsReward), 10)
    if (!Number.isFinite(pts) || pts < 1 || !Number.isInteger(pts)) {
      setFormError(t('loyalty.form.errorPointsMin'))
      return
    }
    const startIso = datetimeLocalToIso(startLocal)
    const endIso = datetimeLocalToIso(endLocal)
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      setFormError(t('loyalty.form.errorEndBeforeStart'))
      return
    }
    const body: PointSettingUpsertBody = {
      name: nameTrim,
      spend_amount_mmk: Math.round(spend * 100) / 100,
      points_reward: pts,
      start_date: startIso,
      end_date: endIso,
      is_active: isActive,
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
      setFormError(err instanceof Error ? err.message : t('loyalty.form.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = mode === 'edit' ? t('loyalty.form.editTitle') : t('loyalty.form.createTitle')

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
              <div className="field">
                <label htmlFor="ps-name">{t('loyalty.form.ruleName')}</label>
                <input
                  id="ps-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="ps-spend">{t('loyalty.form.spendMmk')}</label>
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
                <label htmlFor="ps-points">{t('loyalty.form.pointsPerBatch')}</label>
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
              <div className="discount-form-modal__pair">
                <div className="field">
                  <label htmlFor="ps-start">{t('loyalty.form.startOptional')}</label>
                  <DatetimeLocalField
                    id="ps-start"
                    value={startLocal}
                    onChange={setStartLocal}
                    disabled={submitting}
                    placeholder={t('loyalty.form.startPlaceholder')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ps-end">{t('loyalty.form.endOptional')}</label>
                  <DatetimeLocalField
                    id="ps-end"
                    value={endLocal}
                    onChange={setEndLocal}
                    disabled={submitting}
                    placeholder={t('loyalty.form.endPlaceholder')}
                  />
                </div>
              </div>
              <label htmlFor={activeFieldId} className="form-switch">
                <span className="form-switch__control">
                  <input
                    id={activeFieldId}
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
                    {isActive ? t('loyalty.form.activeTitle') : t('loyalty.form.inactiveTitle')}
                  </span>
                  <span className="form-switch__desc">{t('loyalty.form.activeDesc')}</span>
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
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? t('loyalty.form.saving')
                    : mode === 'edit'
                      ? t('loyalty.form.saveChanges')
                      : t('loyalty.form.createRule')}
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
