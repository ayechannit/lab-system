import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  createMembershipTier,
  type MembershipTierRow,
  type MembershipTierUpsertBody,
  updateMembershipTier,
} from '../../services/membershipTierService'
import '../common/ui.css'

type MembershipTierFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: MembershipTierRow | null
  onClose: () => void
  onSuccess: () => void
}

export function MembershipTierFormModal({
  open,
  mode,
  initial,
  onClose,
  onSuccess,
}: MembershipTierFormModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const activeFieldId = useId()
  const [name, setName] = useState('')
  const [minPoints, setMinPoints] = useState<number | ''>(0)
  const [discountPercent, setDiscountPercent] = useState<number | ''>(0)
  const [isActive, setIsActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setMinPoints(initial.min_points)
      setDiscountPercent(initial.discount_percent)
      setIsActive(initial.is_active)
    } else {
      setName('')
      setMinPoints(0)
      setDiscountPercent(0)
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
    const nameTrim = name.trim()
    if (!nameTrim) {
      setFormError(t('membershipTiers.form.errorName'))
      return
    }
    const points =
      typeof minPoints === 'number' ? minPoints : Number.parseInt(String(minPoints), 10)
    if (!Number.isFinite(points) || !Number.isInteger(points) || points < 0) {
      setFormError(t('membershipTiers.form.errorMinPoints'))
      return
    }
    const discount =
      typeof discountPercent === 'number' ? discountPercent : Number.parseFloat(String(discountPercent))
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      setFormError(t('membershipTiers.form.errorDiscount'))
      return
    }
    const body: MembershipTierUpsertBody = {
      name: nameTrim,
      min_points: points,
      discount_percent: Math.round(discount * 100) / 100,
      is_active: isActive,
    }
    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        await updateMembershipTier(initial.id, body)
      } else {
        await createMembershipTier(body)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('membershipTiers.form.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title = mode === 'edit' ? t('membershipTiers.form.editTitle') : t('membershipTiers.form.createTitle')

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
                <label htmlFor="mt-name">{t('membershipTiers.form.tierName')}</label>
                <input
                  id="mt-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="mt-min-points">{t('membershipTiers.form.minPoints')}</label>
                <input
                  id="mt-min-points"
                  type="number"
                  min={0}
                  step={1}
                  value={minPoints === '' ? '' : minPoints}
                  onChange={(e) => {
                    const v = e.target.value
                    setMinPoints(v === '' ? '' : Number.parseInt(v, 10))
                  }}
                  disabled={submitting}
                />
              </div>
              <div className="field">
                <label htmlFor="mt-discount">{t('membershipTiers.form.discountPercent')}</label>
                <input
                  id="mt-discount"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={discountPercent === '' ? '' : discountPercent}
                  onChange={(e) => {
                    const v = e.target.value
                    setDiscountPercent(v === '' ? '' : Number.parseFloat(v))
                  }}
                  disabled={submitting}
                />
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
                    {isActive ? t('membershipTiers.form.activeTitle') : t('membershipTiers.form.inactiveTitle')}
                  </span>
                  <span className="form-switch__desc">{t('membershipTiers.form.activeDesc')}</span>
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
                    ? t('membershipTiers.form.saving')
                    : mode === 'edit'
                      ? t('membershipTiers.form.saveChanges')
                      : t('membershipTiers.form.createTier')}
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
