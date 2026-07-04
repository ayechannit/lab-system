import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import {
  GeofenceBoundsMapPicker,
  hasCompleteGeofenceBounds,
  type GeofenceBounds,
} from './GeofenceBoundsMapPicker'
import {
  createServiceGeofence,
  type ServiceGeofenceRow,
  type ServiceGeofenceUpsertBody,
  updateServiceGeofence,
} from '../../services/serviceGeofenceService'
import '../common/ui.css'

type ServiceGeofenceFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: ServiceGeofenceRow | null
  onClose: () => void
  onSuccess: () => void
}

const EMPTY_BOUNDS: GeofenceBounds = {
  south_latitude: '',
  north_latitude: '',
  west_longitude: '',
  east_longitude: '',
}

function boundsFromRow(row: ServiceGeofenceRow): GeofenceBounds {
  return {
    south_latitude: row.south_latitude,
    north_latitude: row.north_latitude,
    west_longitude: row.west_longitude,
    east_longitude: row.east_longitude,
  }
}

function parseCoord(raw: number | ''): number | null {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null
  const n = Number.parseFloat(String(raw))
  return Number.isFinite(n) ? n : null
}

export function ServiceGeofenceFormModal({
  open,
  mode,
  initial,
  onClose,
  onSuccess,
}: ServiceGeofenceFormModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const activeFieldId = useId()
  const [name, setName] = useState('')
  const [bounds, setBounds] = useState<GeofenceBounds>(EMPTY_BOUNDS)
  const [serviceFeeMmk, setServiceFeeMmk] = useState<number | ''>(0)
  const [priority, setPriority] = useState<0 | 1>(1)
  const [isActive, setIsActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setSubmitting(false)
    if (mode === 'edit' && initial) {
      setName(initial.name)
      setBounds(boundsFromRow(initial))
      setServiceFeeMmk(initial.service_fee_mmk)
      setPriority(initial.priority === 0 ? 0 : 1)
      setIsActive(initial.is_active)
    } else {
      setName('')
      setBounds(EMPTY_BOUNDS)
      setServiceFeeMmk(0)
      setPriority(1)
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
      setFormError(t('serviceGeofences.form.errorName'))
      return
    }
    if (!hasCompleteGeofenceBounds(bounds)) {
      setFormError(t('serviceGeofences.form.errorBounds'))
      return
    }
    const west = parseCoord(bounds.west_longitude)!
    const east = parseCoord(bounds.east_longitude)!
    const north = parseCoord(bounds.north_latitude)!
    const south = parseCoord(bounds.south_latitude)!
    const fee = parseCoord(serviceFeeMmk)
    if (fee == null || fee < 0) {
      setFormError(t('serviceGeofences.form.errorFee'))
      return
    }
    if (priority !== 0 && priority !== 1) {
      setFormError(t('serviceGeofences.form.errorPriority'))
      return
    }
    const body: ServiceGeofenceUpsertBody = {
      name: nameTrim,
      west_longitude: west,
      east_longitude: east,
      north_latitude: north,
      south_latitude: south,
      service_fee_mmk: Math.round(fee * 100) / 100,
      priority,
      is_active: isActive,
    }
    setSubmitting(true)
    try {
      if (mode === 'edit' && initial) {
        await updateServiceGeofence(initial.id, body)
      } else {
        await createServiceGeofence(body)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('serviceGeofences.form.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const title =
    mode === 'edit' ? t('serviceGeofences.form.editTitle') : t('serviceGeofences.form.createTitle')

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
      <div className="modal-card modal-card--geofence-form" onMouseDown={(e) => e.stopPropagation()}>
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

        <form
          className="discount-form-modal__form"
          onSubmit={(e) => void handleSubmit(e)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            const el = e.target
            if (!(el instanceof HTMLElement)) return
            if (el.closest('.geofence-bounds-map-picker') || el.closest('.geofence-bounds-location-search')) {
              e.preventDefault()
            }
          }}
        >
          <div className="discount-form-modal__body">
            <div className="discount-form-modal__stack">
              <div className="field">
                <label htmlFor="sgf-name">{t('common.name')}</label>
                <input
                  id="sgf-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                />
              </div>

              <GeofenceBoundsMapPicker
                bounds={bounds}
                onChange={setBounds}
                disabled={submitting}
                mapHeight={580}
              />

              <div className="discount-form-modal__pair">
                <div className="field">
                  <label htmlFor="sgf-fee">{t('serviceGeofences.form.serviceFee')}</label>
                  <input
                    id="sgf-fee"
                    type="number"
                    min={0}
                    step={0.01}
                    value={serviceFeeMmk === '' ? '' : serviceFeeMmk}
                    onChange={(e) => {
                      const v = e.target.value
                      setServiceFeeMmk(v === '' ? '' : Number.parseFloat(v))
                    }}
                    disabled={submitting}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sgf-priority">{t('serviceGeofences.form.coverage')}</label>
                  <select
                    id="sgf-priority"
                    className="select-chevron-left"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value === '0' ? 0 : 1)}
                    disabled={submitting}
                  >
                    <option value={1}>{t('serviceGeofences.form.priorityInside')}</option>
                    <option value={0}>{t('serviceGeofences.form.priorityOutside')}</option>
                  </select>
                  <p className="discount-form-modal__hint">{t('serviceGeofences.form.priorityHint')}</p>
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
                    {isActive ? t('serviceGeofences.form.activeTitle') : t('serviceGeofences.form.inactiveTitle')}
                  </span>
                  <span className="form-switch__desc">{t('serviceGeofences.form.activeDesc')}</span>
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
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => !submitting && onClose()}
                  disabled={submitting}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? t('common.saving')
                    : mode === 'edit'
                      ? t('common.save')
                      : t('serviceGeofences.form.createButton')}
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
