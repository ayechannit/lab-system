import { useId, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { isDisplayableAdImageUrl, resolveAdvertisementImageUrl } from '../../services/advertisementService'

type AdvertisementBannerFieldProps = {
  id: string
  value: string
  displayUrl?: string | null
  previewSrc: string | null
  pickedFileName?: string | null
  onChange: (value: string) => void
  onFileSelected?: (file: File) => void
  onClear?: () => void
  disabled?: boolean
}

export function AdvertisementBannerField({
  id,
  value,
  displayUrl = null,
  previewSrc,
  pickedFileName = null,
  onChange,
  onFileSelected,
  onClear,
  disabled = false,
}: AdvertisementBannerFieldProps) {
  const { t } = useTranslation()
  const fileInputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)

  const displayPreview =
    previewSrc ??
    (isDisplayableAdImageUrl(value) ? resolveAdvertisementImageUrl(value, displayUrl) : null)

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError(t('advertisements.banner.errorImageType'))
      return
    }
    setLocalError(null)
    onFileSelected?.(file)
  }

  function clearBanner() {
    setLocalError(null)
    onClear?.()
  }

  const statusLabel = pickedFileName
    ? t('advertisements.banner.uploadOnSave', { name: pickedFileName })
    : value.trim()
      ? value.trim().startsWith('/uploads/')
        ? t('advertisements.banner.savedOnServer')
        : t('advertisements.banner.urlSet')
      : t('advertisements.banner.noBanner')

  const showClear = Boolean(pickedFileName || value.trim() || displayPreview)

  return (
    <div className="field logo-url-field">
      <label className="logo-url-field__heading" id={`${id}-label`} htmlFor={fileInputId}>
        {t('advertisements.banner.label')}
      </label>
      <p className="staff-profile-image-field__hint" style={{ marginTop: 0 }}>
        {t('advertisements.banner.hint')}
      </p>

      {displayPreview ? (
        <div className="logo-url-field__preview-wrap">
          <img src={displayPreview} alt="" className="logo-url-field__preview" />
        </div>
      ) : null}

      <div className="file-upload-row">
        <input
          id={fileInputId}
          className="file-upload-input"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={onFileChange}
          disabled={disabled}
        />
        <label htmlFor={fileInputId} className="file-upload-btn">
          {t('advertisements.banner.chooseImage')}
        </label>
        <span className="file-upload-name">{statusLabel}</span>
        {showClear ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearBanner} disabled={disabled}>
            {t('discounts.form.clear')}
          </button>
        ) : null}
      </div>

      <label className="logo-url-field__url-label" htmlFor={id}>
        {t('advertisements.banner.pasteUrl')}
      </label>
      <input
        id={id}
        aria-labelledby={`${id}-label`}
        value={value}
        onChange={(e) => {
          setLocalError(null)
          onChange(e.target.value)
        }}
        placeholder={t('advertisements.banner.urlPlaceholder')}
        disabled={disabled}
        autoComplete="off"
      />

      {localError ? (
        <p className="logo-url-field__error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  )
}
