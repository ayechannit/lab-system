import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { AdvertisementBannerField } from './AdvertisementBannerField'
import { DatetimeLocalField } from '../common/DatetimeLocalField'
import {
  createAdvertisement,
  type AdvertisementRow,
  type AdvertisementUpsertBody,
  updateAdvertisement,
  uploadAdvertisementBannerImage,
} from '../../services/advertisementService'
import { datetimeLocalToIso, toDatetimeLocalValue } from '../../utils/datetimeLocal'
import '../common/ui.css'

type AdvertisementFormModalProps = {
  open: boolean
  mode: 'create' | 'edit'
  initial: AdvertisementRow | null
  onClose: () => void
  onSuccess: () => void
}

export function AdvertisementFormModal({
  open,
  mode,
  initial,
  onClose,
  onSuccess,
}: AdvertisementFormModalProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const activeFieldId = useId()
  const bannerFieldId = useId()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [imageDisplayUrl, setImageDisplayUrl] = useState<string | null>(null)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string | null>(null)
  const [actionUrl, setActionUrl] = useState('')
  const [startLocal, setStartLocal] = useState('')
  const [endLocal, setEndLocal] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    setFormError(null)
    setSubmitting(false)
    setBannerFile(null)
    if (bannerPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl)
    }
    setBannerPreviewUrl(null)
    if (mode === 'edit' && initial) {
      setTitle(initial.title)
      setDescription(initial.description ?? '')
      setImageUrl(initial.image_url ?? '')
      setImageDisplayUrl(initial.image_display_url ?? null)
      setActionUrl(initial.action_url ?? '')
      setStartLocal(toDatetimeLocalValue(initial.start_date))
      setEndLocal(toDatetimeLocalValue(initial.end_date))
      setIsActive(initial.is_active)
    } else {
      setTitle('')
      setDescription('')
      setImageUrl('')
      setImageDisplayUrl(null)
      setActionUrl('')
      setStartLocal('')
      setEndLocal('')
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

  useEffect(() => {
    return () => {
      if (bannerPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(bannerPreviewUrl)
      }
    }
  }, [bannerPreviewUrl])

  function onBannerFileSelected(file: File) {
    if (bannerPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl)
    }
    setBannerFile(file)
    setBannerPreviewUrl(URL.createObjectURL(file))
    setImageUrl('')
    setImageDisplayUrl(null)
    setImageDisplayUrl(null)
  }

  function clearBanner() {
    if (bannerPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl)
    }
    setBannerFile(null)
    setBannerPreviewUrl(null)
    setImageUrl('')
    setImageDisplayUrl(null)
  }

  function onBannerUrlChange(value: string) {
    if (bannerPreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(bannerPreviewUrl)
    }
    setBannerFile(null)
    setBannerPreviewUrl(null)
    setImageUrl(value)
    setImageDisplayUrl(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    const titleTrim = title.trim()
    if (!titleTrim) {
      setFormError(t('advertisements.form.errorTitleRequired'))
      return
    }
    const startIso = datetimeLocalToIso(startLocal)
    const endIso = datetimeLocalToIso(endLocal)
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      setFormError(t('advertisements.form.errorEndBeforeStart'))
      return
    }

    setSubmitting(true)
    try {
      let resolvedImageUrl = imageUrl.trim() || null
      if (bannerFile) {
        const uploaded = await uploadAdvertisementBannerImage(bannerFile)
        resolvedImageUrl = uploaded.image_url
        setImageDisplayUrl(uploaded.image_display_url ?? null)
      }

      const body: AdvertisementUpsertBody = {
        title: titleTrim,
        description: description.trim() || null,
        image_url: resolvedImageUrl,
        action_url: actionUrl.trim() || null,
        start_date: startIso,
        end_date: endIso,
        is_active: isActive,
      }

      if (mode === 'edit' && initial) {
        await updateAdvertisement(initial.id, body)
      } else {
        await createAdvertisement(body)
      }
      onSuccess()
      onClose()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t('advertisements.form.requestFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const modalTitle =
    mode === 'edit' ? t('advertisements.form.editTitle') : t('advertisements.form.createTitle')

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
              {modalTitle}
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
                <label htmlFor="ad-title">{t('common.title')}</label>
                <input
                  id="ad-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoComplete="off"
                  disabled={submitting}
                  maxLength={255}
                />
              </div>
              <div className="field">
                <label htmlFor="ad-description">{t('common.description')}</label>
                <textarea
                  id="ad-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={submitting}
                  placeholder={t('advertisements.form.descriptionPlaceholder')}
                />
              </div>
              <AdvertisementBannerField
                id={bannerFieldId}
                value={imageUrl}
                displayUrl={imageDisplayUrl}
                previewSrc={bannerPreviewUrl}
                pickedFileName={bannerFile?.name ?? null}
                onChange={onBannerUrlChange}
                onFileSelected={onBannerFileSelected}
                onClear={clearBanner}
                disabled={submitting}
              />
              <div className="field">
                <label htmlFor="ad-action">{t('advertisements.form.actionUrl')}</label>
                <input
                  id="ad-action"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  disabled={submitting}
                  placeholder={t('advertisements.form.actionUrlPlaceholder')}
                  autoComplete="off"
                />
              </div>
              <div className="discount-form-modal__pair">
                <div className="field">
                  <label htmlFor="ad-start">{t('advertisements.form.startOptional')}</label>
                  <DatetimeLocalField
                    id="ad-start"
                    value={startLocal}
                    onChange={setStartLocal}
                    disabled={submitting}
                    placeholder={t('advertisements.form.startPlaceholder')}
                  />
                </div>
                <div className="field">
                  <label htmlFor="ad-end">{t('advertisements.form.endOptional')}</label>
                  <DatetimeLocalField
                    id="ad-end"
                    value={endLocal}
                    onChange={setEndLocal}
                    disabled={submitting}
                    placeholder={t('advertisements.form.endPlaceholder')}
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
                    {isActive ? t('advertisements.form.activeTitle') : t('advertisements.form.inactiveTitle')}
                  </span>
                  <span className="form-switch__desc">{t('advertisements.form.activeDesc')}</span>
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
                    ? bannerFile
                      ? t('advertisements.form.uploadingSaving')
                      : t('advertisements.form.saving')
                    : mode === 'edit'
                      ? t('advertisements.form.saveChanges')
                      : t('advertisements.form.create')}
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
