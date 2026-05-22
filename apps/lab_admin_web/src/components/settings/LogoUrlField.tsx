import { useId, useState, type ChangeEvent } from 'react'
import {
  resolveLogoDisplayUrl,
  uploadSystemSettingsLogo,
  type SystemSettingsRow,
} from '../../services/systemSettingService'
import { isDisplayableLogoUrl, LOGO_URL_MAX_LENGTH } from '../../utils/logoImage'

type LogoUrlFieldProps = {
  id: string
  value: string
  onChange: (value: string) => void
  onUploaded?: (row: SystemSettingsRow) => void
  disabled?: boolean
}

export function LogoUrlField({ id, value, onChange, onUploaded, disabled = false }: LogoUrlFieldProps) {
  const fileInputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [pickedName, setPickedName] = useState<string | null>(null)

  const previewSrc = isDisplayableLogoUrl(value) ? resolveLogoDisplayUrl(value) : null

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLocalError('Choose a PNG, JPG, GIF, or WebP image.')
      return
    }
    setLocalError(null)
    setUploading(true)
    try {
      const row = await uploadSystemSettingsLogo(file)
      const url = row.logo_url ?? ''
      onChange(url)
      onUploaded?.(row)
      setPickedName(file.name)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Logo upload failed.')
    } finally {
      setUploading(false)
    }
  }

  function clearLogo() {
    setLocalError(null)
    setPickedName(null)
    onChange('')
  }

  const statusLabel = uploading
    ? 'Uploading…'
    : pickedName
      ? pickedName
      : value.trim()
        ? value.trim().startsWith('/uploads/')
          ? 'Logo on server'
          : 'URL set'
        : 'No file selected'

  return (
    <div className="field logo-url-field">
      <label className="logo-url-field__heading" id={`${id}-label`} htmlFor={id}>
        Logo
      </label>

      {previewSrc ? (
        <div className="logo-url-field__preview-wrap">
          <img src={previewSrc} alt="" className="logo-url-field__preview" />
        </div>
      ) : null}

      <div className="file-upload-row">
        <input
          id={fileInputId}
          className="file-upload-input"
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={(e) => void onFileChange(e)}
          disabled={disabled || uploading}
        />
        <label htmlFor={fileInputId} className="file-upload-btn">
          Choose image
        </label>
        <span className="file-upload-name">{statusLabel}</span>
        {value.trim() ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearLogo} disabled={disabled || uploading}>
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
          setPickedName(null)
          onChange(e.target.value)
        }}
        placeholder="https://… or /uploads/…"
        disabled={disabled || uploading}
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
