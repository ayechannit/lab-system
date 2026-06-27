import { useId, useState, type ChangeEvent } from 'react'
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
      setLocalError('Choose a PNG, JPG, GIF, or WebP image.')
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
    ? `${pickedFileName} (uploads when you save)`
    : value.trim()
      ? value.trim().startsWith('/uploads/')
        ? 'Banner saved on server'
        : 'URL set'
      : 'No banner selected'

  const showClear = Boolean(pickedFileName || value.trim() || displayPreview)

  return (
    <div className="field logo-url-field">
      <label className="logo-url-field__heading" id={`${id}-label`} htmlFor={fileInputId}>
        Banner image
      </label>
      <p className="staff-profile-image-field__hint" style={{ marginTop: 0 }}>
        Upload a banner for the mobile app, or paste an image URL. Recommended: wide landscape image (e.g. 1200×400).
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
          Choose image
        </label>
        <span className="file-upload-name">{statusLabel}</span>
        {showClear ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearBanner} disabled={disabled}>
            Clear
          </button>
        ) : null}
      </div>

      <label className="logo-url-field__url-label" htmlFor={id}>
        Or paste URL
      </label>
      <input
        id={id}
        aria-labelledby={`${id}-label`}
        value={value}
        onChange={(e) => {
          setLocalError(null)
          onChange(e.target.value)
        }}
        placeholder="https://… or /uploads/…"
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
