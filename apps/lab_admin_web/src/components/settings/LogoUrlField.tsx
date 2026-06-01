import { useId, useState, type ChangeEvent } from 'react'
import { resolveLogoDisplayUrl } from '../../services/systemSettingService'
import { isDisplayableLogoUrl, LOGO_URL_MAX_LENGTH } from '../../utils/logoImage'

type LogoUrlFieldProps = {
  id: string
  value: string
  /** Local preview (unsaved file) or resolved saved URL — controlled by parent. */
  previewSrc: string | null
  pickedFileName?: string | null
  onChange: (value: string) => void
  onFileSelected?: (file: File) => void
  onClear?: () => void
  disabled?: boolean
}

export function LogoUrlField({
  id,
  value,
  previewSrc,
  pickedFileName = null,
  onChange,
  onFileSelected,
  onClear,
  disabled = false,
}: LogoUrlFieldProps) {
  const fileInputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)

  const displayPreview =
    previewSrc ?? (isDisplayableLogoUrl(value) ? resolveLogoDisplayUrl(value) : null)

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

  function clearLogo() {
    setLocalError(null)
    onClear?.()
  }

  const statusLabel = pickedFileName
    ? `${pickedFileName} (not saved yet)`
    : value.trim()
      ? value.trim().startsWith('/uploads/')
        ? 'Saved logo URL'
        : 'URL set (not saved yet)'
      : 'No file selected'

  const showClear = Boolean(pickedFileName || value.trim() || displayPreview)

  return (
    <div className="field logo-url-field">
      <label className="logo-url-field__heading" id={`${id}-label`} htmlFor={id}>
        Logo
      </label>

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
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearLogo} disabled={disabled}>
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
      />

      {localError ? (
        <p className="logo-url-field__error" role="alert">
          {localError}
        </p>
      ) : null}
      {value.trim().length > LOGO_URL_MAX_LENGTH ? (
        <p className="logo-url-field__error" role="alert">
          Logo URL is too long ({value.trim().length} / {LOGO_URL_MAX_LENGTH} characters).
        </p>
      ) : null}
    </div>
  )
}
