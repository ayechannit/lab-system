import { type FormEvent, useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'
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
      setFormError('Title is required.')
      return
    }
    const startIso = datetimeLocalToIso(startLocal)
    const endIso = datetimeLocalToIso(endLocal)
    if (startIso && endIso && new Date(endIso) < new Date(startIso)) {
      setFormError('End date must be on or after the start date.')
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
      setFormError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  const modalTitle = mode === 'edit' ? 'Edit advertisement' : 'Add advertisement'

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
                <label htmlFor="ad-title">Title</label>
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
                <label htmlFor="ad-description">Description</label>
                <textarea
                  id="ad-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  disabled={submitting}
                  placeholder="Optional short copy for the banner or promo card"
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
                <label htmlFor="ad-action">Action URL</label>
                <input
                  id="ad-action"
                  value={actionUrl}
                  onChange={(e) => setActionUrl(e.target.value)}
                  disabled={submitting}
                  placeholder="https://… (optional link when tapped)"
                  autoComplete="off"
                />
              </div>
              <div className="discount-form-modal__pair">
                <div className="field">
                  <label htmlFor="ad-start">Start (optional)</label>
                  <DatetimeLocalField
                    id="ad-start"
                    value={startLocal}
                    onChange={setStartLocal}
                    disabled={submitting}
                    placeholder="Start date & time"
                  />
                </div>
                <div className="field">
                  <label htmlFor="ad-end">End (optional)</label>
                  <DatetimeLocalField
                    id="ad-end"
                    value={endLocal}
                    onChange={setEndLocal}
                    disabled={submitting}
                    placeholder="End date & time"
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
                  <span className="form-switch__title">{isActive ? 'Advertisement is active' : 'Advertisement is inactive'}</span>
                  <span className="form-switch__desc">
                    Inactive ads stay in the list but are not shown in the mobile app.
                  </span>
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
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting
                    ? bannerFile
                      ? 'Uploading & saving…'
                      : 'Saving…'
                    : mode === 'edit'
                      ? 'Save changes'
                      : 'Create advertisement'}
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
