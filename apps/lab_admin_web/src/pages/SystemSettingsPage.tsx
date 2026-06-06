import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { PageBanner } from '../components/common/PageBanner'
import { PageHeader } from '../components/common/PageHeader'
import { ThemePicker } from '../components/settings/ThemePicker'
import { useSystemBranding } from '../hooks/SystemBrandingContext'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { LogoUrlField } from '../components/settings/LogoUrlField'
import {
  LOGO_URL_MAX_LENGTH,
  resolveLogoDisplayUrl,
  uploadSystemSettingsLogo,
} from '../services/systemSettingService'
import { formatCoordPair, LocationMapPicker } from '../components/users/LocationMapPicker'
import { useAddressGeocode } from '../hooks/useAddressGeocode'
import { isApiMode } from '../services/apiBase'
import {
  fetchSystemSettings,
  type SystemSettingsRow,
  type SystemSettingsUpdateBody,
  type ThemeMode,
  resetSystemSettingsToDefaults,
  updateSystemSettings,
} from '../services/systemSettingService'
import {
  applyAppTheme,
  type AppThemeId,
  getAppliedAppTheme,
  normalizeAppThemeId,
  themeFieldsForApi,
} from '../theme/appThemes'
import '../components/common/ui.css'

function applyRowToState(
  row: SystemSettingsRow,
  setters: {
    setSettingsId: (id?: string) => void
    setUpdatedAt: (v?: string) => void
    setLabName: (v: string) => void
    setMode: (v: ThemeMode) => void
    setLogoUrl: (v: string) => void
    setAddress: (v: string) => void
    setLatitude: (v: number | '') => void
    setLongitude: (v: number | '') => void
    setContactPhone: (v: string) => void
    setContactEmail: (v: string) => void
  },
) {
  const themeId = normalizeAppThemeId(row.mode)
  setters.setSettingsId(row.id)
  setters.setUpdatedAt(row.updated_at)
  setters.setLabName(row.lab_name)
  setters.setMode(themeId)
  setters.setLogoUrl(row.logo_url ?? '')
  setters.setAddress(row.address ?? '')
  setters.setLatitude(row.latitude ?? '')
  setters.setLongitude(row.longitude ?? '')
  setters.setContactPhone(row.contact_phone ?? '')
  setters.setContactEmail(row.contact_email ?? '')
}

type FormSnapshotFields = {
  labName: string
  mode: ThemeMode
  logoUrl: string
  address: string
  latitude: number | ''
  longitude: number | ''
  contactPhone: string
  contactEmail: string
}

type SavedBranding = { labName: string; logoUrl: string | null }

function formSnapshot(fields: FormSnapshotFields, hasPendingLogo: boolean): string {
  return JSON.stringify({
    labName: fields.labName.trim(),
    mode: fields.mode,
    logoUrl: fields.logoUrl.trim(),
    address: fields.address.trim(),
    latitude: fields.latitude,
    longitude: fields.longitude,
    contactPhone: fields.contactPhone.trim(),
    contactEmail: fields.contactEmail.trim(),
    hasPendingLogo,
  })
}

function snapshotFromRow(row: SystemSettingsRow): string {
  return formSnapshot(
    {
      labName: row.lab_name,
      mode: normalizeAppThemeId(row.mode),
      logoUrl: row.logo_url ?? '',
      address: row.address ?? '',
      latitude: row.latitude ?? '',
      longitude: row.longitude ?? '',
      contactPhone: row.contact_phone ?? '',
      contactEmail: row.contact_email ?? '',
    },
    false,
  )
}

export function SystemSettingsPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const { applyBranding } = useSystemBranding()
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [settingsId, setSettingsId] = useState<string | undefined>()
  const [updatedAt, setUpdatedAt] = useState<string | undefined>()

  const [labName, setLabName] = useState('MedLab Smart')
  const [mode, setMode] = useState<ThemeMode>(() => getAppliedAppTheme())
  const [logoUrl, setLogoUrl] = useState('')
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null)
  const [pendingLogoPreview, setPendingLogoPreview] = useState<string | null>(null)
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>('')
  const [longitude, setLongitude] = useState<number | ''>('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loadedAddressBaseline, setLoadedAddressBaseline] = useState<string | null>(null)

  const savedThemeRef = useRef<AppThemeId>(getAppliedAppTheme())
  const savedBrandingRef = useRef<SavedBranding>({ labName: 'MedLab Smart', logoUrl: null })
  const savedFormSnapshotRef = useRef('')
  const isDirtyRef = useRef(false)

  const clearPendingLogo = useCallback(() => {
    setPendingLogoPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPendingLogoFile(null)
  }, [])

  const syncSavedFromRow = useCallback((row: SystemSettingsRow) => {
    savedThemeRef.current = normalizeAppThemeId(row.mode)
    savedBrandingRef.current = { labName: row.lab_name, logoUrl: row.logo_url }
    savedFormSnapshotRef.current = snapshotFromRow(row)
  }, [])

  const commitSavedToApp = useCallback(
    (row: SystemSettingsRow) => {
      const themeId = normalizeAppThemeId(row.mode)
      savedThemeRef.current = themeId
      savedBrandingRef.current = { labName: row.lab_name, logoUrl: row.logo_url }
      savedFormSnapshotRef.current = snapshotFromRow(row)
      applyAppTheme(themeId)
      applyBranding({ labName: row.lab_name, logoUrl: row.logo_url })
    },
    [applyBranding],
  )

  const revertUnsavedToApp = useCallback(() => {
    applyAppTheme(savedThemeRef.current)
    applyBranding(savedBrandingRef.current)
  }, [applyBranding])

  const handleGeocodeCoords = useCallback((lat: number, lng: number) => {
    setLatitude(lat)
    setLongitude(lng)
  }, [])

  const geocodeHint = useAddressGeocode({
    enabled: hasApi && !loading,
    address,
    onCoords: handleGeocodeCoords,
    baselineAddress: loadedAddressBaseline ?? undefined,
  })

  const setters = {
    setSettingsId,
    setUpdatedAt,
    setLabName,
    setMode,
    setLogoUrl,
    setAddress,
    setLatitude,
    setLongitude,
    setContactPhone,
    setContactEmail,
  }

  const logoPreviewSrc = useMemo(() => {
    if (pendingLogoPreview) return pendingLogoPreview
    return resolveLogoDisplayUrl(logoUrl.trim() || null)
  }, [pendingLogoPreview, logoUrl])

  const currentSnapshot = useMemo(
    () =>
      formSnapshot(
        {
          labName,
          mode,
          logoUrl,
          address,
          latitude,
          longitude,
          contactPhone,
          contactEmail,
        },
        pendingLogoFile !== null,
      ),
    [labName, mode, logoUrl, address, latitude, longitude, contactPhone, contactEmail, pendingLogoFile],
  )

  const isDirty =
    hasApi && !loading && savedFormSnapshotRef.current.length > 0 && currentSnapshot !== savedFormSnapshotRef.current

  isDirtyRef.current = isDirty

  const handleThemeChange = useCallback((next: ThemeMode) => {
    setMode(next)
  }, [])

  const handleLogoFileSelected = useCallback(
    (file: File) => {
      clearPendingLogo()
      setPendingLogoFile(file)
      setPendingLogoPreview(URL.createObjectURL(file))
      setLogoUrl('')
    },
    [clearPendingLogo],
  )

  const handleLogoClear = useCallback(() => {
    clearPendingLogo()
    setLogoUrl('')
  }, [clearPendingLogo])

  useEffect(() => {
    return () => {
      clearPendingLogo()
      // Only roll back draft edits; saved theme/branding must stay applied app-wide.
      if (isDirtyRef.current) {
        revertUnsavedToApp()
      }
    }
  }, [clearPendingLogo, revertUnsavedToApp])

  useErrorToast(loadError)

  useEffect(() => {
    if (!hasApi) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const row = await fetchSystemSettings()
        if (!cancelled) {
          clearPendingLogo()
          applyRowToState(row, setters)
          syncSavedFromRow(row)
          const addr = row.address?.trim() ?? ''
          const hasCoords =
            row.latitude != null &&
            row.longitude != null &&
            !(row.latitude === 0 && row.longitude === 0)
          setLoadedAddressBaseline(addr && hasCoords ? addr : '')
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load system settings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when API mode is on
  }, [hasApi, clearPendingLogo, syncSavedFromRow])

  async function confirmResetToDefaults() {
    if (!hasApi) return
    setResetConfirmOpen(false)
    setResetting(true)
    try {
      const next = await resetSystemSettingsToDefaults()
      clearPendingLogo()
      applyRowToState(next, setters)
      commitSavedToApp(next)
      setLoadedAddressBaseline('')
      showSuccess('Settings reset to defaults.')
    } catch (err) {
      showError(messageFromError(err, 'Reset failed'))
    } finally {
      setResetting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!hasApi) return
    const nameTrim = labName.trim()
    if (!nameTrim) {
      showError('Lab name is required.')
      return
    }
    let logoToSave = logoUrl.trim() || null
    if (pendingLogoFile) {
      try {
        const uploaded = await uploadSystemSettingsLogo(pendingLogoFile)
        logoToSave = uploaded.logo_url
        clearPendingLogo()
      } catch (err) {
        showError(messageFromError(err, 'Logo upload failed'))
        return
      }
    }
    if (logoToSave && logoToSave.length > LOGO_URL_MAX_LENGTH) {
      showError(
        `Logo must be at most ${LOGO_URL_MAX_LENGTH} characters. Upload a smaller image or use a shorter URL.`,
      )
      return
    }
    const lat = latitude === '' ? null : Number(latitude)
    const lng = longitude === '' ? null : Number(longitude)
    const body: SystemSettingsUpdateBody = {
      lab_name: nameTrim,
      ...themeFieldsForApi(mode),
      logo_url: logoToSave,
      latitude: lat != null && Number.isFinite(lat) ? lat : null,
      longitude: lng != null && Number.isFinite(lng) ? lng : null,
      address: address.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
    }
    setSubmitting(true)
    try {
      const next = await updateSystemSettings(body)
      applyRowToState(next, setters)
      commitSavedToApp(next)
      showSuccess('System settings saved.')
    } catch (err) {
      showError(messageFromError(err, 'Save failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="system-settings-page">
      <PageHeader
        title="System settings"
        description="Branding, appearance theme, lab logo, and contact details."
      />

      {!hasApi ? (
        <PageBanner kind="info">
          Set <code>VITE_API_BASE_URL</code> to load and save settings from the backend.
        </PageBanner>
      ) : null}

      <div className="card system-settings-panel">
        {loading ? (
          <LoadingSpinner layout="block" label="Loading system settings" />
        ) : (
          <form className="system-settings-form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="system-settings-callout" role="note">
              <span className="material-symbols-outlined system-settings-callout__icon" aria-hidden>
                info
              </span>
              <p className="system-settings-callout__text">
                Changes are drafts until you click <strong>Save settings</strong>. Leaving this page without
                saving restores your last saved lab name, logo, and theme.
              </p>
            </div>

            {settingsId ? (
              <div className="system-settings-meta">
                <span>
                  Record <code>{settingsId}</code>
                </span>
                {updatedAt ? (
                  <span className="system-settings-meta__updated">
                    Updated {new Date(updatedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="system-settings-panel__grid">
            <section className="system-settings-section">
              <h2 className="system-settings-section__title">Branding</h2>
              <div className="settings-form__stack settings-form__stack--relaxed">
                <div className="field">
                  <label htmlFor="sys-lab-name">Lab name</label>
                  <input
                    id="sys-lab-name"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    disabled={submitting || resetting || !hasApi}
                  />
                </div>
                <ThemePicker
                  value={mode}
                  onChange={handleThemeChange}
                  disabled={submitting || resetting || !hasApi}
                />
                <LogoUrlField
                  id="sys-logo"
                  value={logoUrl}
                  previewSrc={logoPreviewSrc}
                  pickedFileName={pendingLogoFile?.name ?? null}
                  onChange={(url) => {
                    clearPendingLogo()
                    setLogoUrl(url)
                  }}
                  onFileSelected={handleLogoFileSelected}
                  onClear={handleLogoClear}
                  disabled={submitting || resetting || !hasApi}
                />
              </div>
            </section>

            <section className="system-settings-section">
              <h2 className="system-settings-section__title">Location & contact</h2>
              <div className="settings-form__stack settings-form__stack--relaxed">
                <div className="field">
                  <label htmlFor="sys-address">Address</label>
                  <textarea
                    id="sys-address"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value)
                      setLoadedAddressBaseline(null)
                    }}
                    rows={2}
                    disabled={submitting || resetting || !hasApi}
                  />
                </div>
                <div className="system-settings-map-card">
                  <LocationMapPicker
                    latitude={latitude}
                    longitude={longitude}
                    onPick={(lat, lng) => {
                      setLatitude(lat)
                      setLongitude(lng)
                      setLoadedAddressBaseline(null)
                    }}
                    onAddressFromMap={(line) => {
                      setAddress(line)
                      setLoadedAddressBaseline(null)
                    }}
                    mapHeight={240}
                  />
                </div>
                {geocodeHint ? <p className="user-form-modal__geocode-hint">{geocodeHint}</p> : null}
                <p className="catalog-mode-hint" style={{ margin: 0 }}>
                  Coordinates: {formatCoordPair(latitude, longitude)}
                </p>
                <p className="catalog-mode-hint" style={{ margin: '0.35rem 0 0' }}>
                  Type an address to move the map pin, or click the map / use my location to set coordinates.
                </p>
                <div className="settings-form__pair">
                  <div className="field">
                    <label htmlFor="sys-phone">Contact phone</label>
                    <input
                      id="sys-phone"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      disabled={submitting || resetting || !hasApi}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sys-email">Contact email</label>
                    <input
                      id="sys-email"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      disabled={submitting || resetting || !hasApi}
                    />
                  </div>
                </div>
              </div>
            </section>
            </div>

            <div
              className={`system-settings-actions${isDirty ? ' system-settings-actions--dirty' : ''}`}
            >
              <div className="system-settings-actions__status">
                {isDirty ? (
                  <>
                    <span className="system-settings-actions__dot" aria-hidden />
                    <span className="system-settings-actions__label">Unsaved changes</span>
                    <span className="system-settings-actions__sub">
                      Save to apply branding and theme across the app
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined system-settings-actions__saved-icon" aria-hidden>
                      check_circle
                    </span>
                    <span className="system-settings-actions__label">All changes saved</span>
                  </>
                )}
              </div>
              <div className="system-settings-actions__buttons">
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={submitting || resetting || !hasApi}
                  onClick={() => setResetConfirmOpen(true)}
                >
                  Reset to defaults
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || resetting || !hasApi || !isDirty}
                >
                  {submitting ? 'Saving…' : 'Save settings'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset to defaults?"
        message="Lab name, theme, logo, and contact fields will be restored to the application defaults. This cannot be undone except by saving again."
        confirmLabel="Reset to defaults"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmResetToDefaults()}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}
