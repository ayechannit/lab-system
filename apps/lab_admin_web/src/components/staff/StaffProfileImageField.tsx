import { useId, useState, type ChangeEvent } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      setLocalError(t('staff.profileImage.invalidType'))
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
    ? t('staff.profileImage.notSavedYet', { name: pickedFileName })
    : savedImageUrl
      ? t('staff.profileImage.saved')
      : t('staff.profileImage.none')

  const showClear = Boolean(pickedFileName || savedImageUrl || displayPreview)

  return (
    <div className="field logo-url-field staff-profile-image-field">
      <label className="logo-url-field__heading" id={`${id}-label`} htmlFor={fileInputId}>
        {t('staff.profileImage.label')}
      </label>
      <p className="staff-profile-image-field__hint">{t('staff.profileImage.hint')}</p>

      {displayPreview ? (
        <div className="staff-profile-image-field__preview-wrap">
          <img src={displayPreview} alt="" className="staff-profile-image-field__preview" />
        </div>
      ) : null}

      <div className="staff-profile-image-field__toolbar">
        <div className="file-upload-row staff-profile-image-field__file-row">
          <input
            id={fileInputId}
            className="file-upload-input"
            type="file"
            accept="image/png,image/jpeg,image/gif,image/webp"
            onChange={onFileChange}
            disabled={disabled}
          />
          <label htmlFor={fileInputId} className="file-upload-btn">
            {t('staff.profileImage.choose')}
          </label>
          {showClear ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm staff-profile-image-field__clear"
              onClick={clearImage}
              disabled={disabled}
            >
              {t('staff.profileImage.clear')}
            </button>
          ) : null}
        </div>
        <p className="staff-profile-image-field__status" aria-live="polite">
          {statusLabel}
        </p>
      </div>

      {localError ? (
        <p className="logo-url-field__error" role="alert">
          {localError}
        </p>
      ) : null}
    </div>
  )
}
