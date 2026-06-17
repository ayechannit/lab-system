import { useId, useState, type ChangeEvent } from 'react'
import { isDisplayableProfileImageUrl, resolveStaffProfileImageUrl } from '../../utils/profileImage'

type StaffProfileImageFieldProps = {
  id: string
  savedImageUrl: string | null
  previewSrc: string | null
  pickedFileName?: string | null
  onFileSelected?: (file: File) => void
  onClear?: () => void
  disabled?: boolean
}

export function StaffProfileImageField({
  id,
  savedImageUrl,
  previewSrc,
  pickedFileName = null,
  onFileSelected,
  onClear,
  disabled = false,
}: StaffProfileImageFieldProps) {
  const fileInputId = useId()
  const [localError, setLocalError] = useState<string | null>(null)

  const displayPreview =
    previewSrc ??
    (savedImageUrl && isDisplayableProfileImageUrl(savedImageUrl)
      ? resolveStaffProfileImageUrl(savedImageUrl)
      : null)

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

  function clearImage() {
    setLocalError(null)
    onClear?.()
  }

  const statusLabel = pickedFileName
    ? `${pickedFileName} (not saved yet)`
    : savedImageUrl
      ? 'Profile image saved'
      : 'No image selected'

  const showClear = Boolean(pickedFileName || savedImageUrl || displayPreview)

  return (
    <div className="field logo-url-field staff-profile-image-field">
      <label className="logo-url-field__heading" id={`${id}-label`} htmlFor={fileInputId}>
        Profile image
      </label>
      <p className="staff-profile-image-field__hint">
        Required for collectors — shown to patients when a collector is assigned to their order.
      </p>

      {displayPreview ? (
        <div className="logo-url-field__preview-wrap">
          <img src={displayPreview} alt="" className="logo-url-field__preview staff-profile-image-field__preview" />
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
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearImage} disabled={disabled}>
            Clear
          </button>
        ) : null}
      </div>

      {localError ? (
        <p className="logo-url-field__error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  )
}
