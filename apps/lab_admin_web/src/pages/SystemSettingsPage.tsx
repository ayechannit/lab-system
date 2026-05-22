import { type FormEvent, useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ColorField } from '../components/common/ColorField'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { PageBanner } from '../components/common/PageBanner'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { LogoUrlField } from '../components/settings/LogoUrlField'
import { LOGO_URL_MAX_LENGTH } from '../services/systemSettingService'
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
import '../components/common/ui.css'

const MODE_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'custom', label: 'Custom' },
]

function applyRowToState(
  row: SystemSettingsRow,
  setters: {
    setSettingsId: (id?: string) => void
    setUpdatedAt: (v?: string) => void
    setLabName: (v: string) => void
    setMode: (v: ThemeMode) => void
    setLogoUrl: (v: string) => void
    setPrimaryColor: (v: string) => void
    setSecondaryColor: (v: string) => void
    setCustomColors: (v: string) => void
    setAddress: (v: string) => void
    setLatitude: (v: number | '') => void
    setLongitude: (v: number | '') => void
    setContactPhone: (v: string) => void
    setContactEmail: (v: string) => void
  },
) {
  setters.setSettingsId(row.id)
  setters.setUpdatedAt(row.updated_at)
  setters.setLabName(row.lab_name)
  setters.setMode(row.mode)
  setters.setLogoUrl(row.logo_url ?? '')
  setters.setPrimaryColor(row.primary_color)
  setters.setSecondaryColor(row.secondary_color)
  setters.setCustomColors(row.custom_colors ?? '')
  setters.setAddress(row.address ?? '')
  setters.setLatitude(row.latitude ?? '')
  setters.setLongitude(row.longitude ?? '')
  setters.setContactPhone(row.contact_phone ?? '')
  setters.setContactEmail(row.contact_email ?? '')
}

export function SystemSettingsPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [settingsId, setSettingsId] = useState<string | undefined>()
  const [updatedAt, setUpdatedAt] = useState<string | undefined>()

  const [labName, setLabName] = useState('MedLab Smart')
  const [mode, setMode] = useState<ThemeMode>('light')
  const [logoUrl, setLogoUrl] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#0055ff')
  const [secondaryColor, setSecondaryColor] = useState('#00cc66')
  const [customColors, setCustomColors] = useState('')
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>('')
  const [longitude, setLongitude] = useState<number | ''>('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loadedAddressBaseline, setLoadedAddressBaseline] = useState<string | null>(null)

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
    setPrimaryColor,
    setSecondaryColor,
    setCustomColors,
    setAddress,
    setLatitude,
    setLongitude,
    setContactPhone,
    setContactEmail,
  }

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
          applyRowToState(row, setters)
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
  }, [hasApi])

  async function confirmResetToDefaults() {
    if (!hasApi) return
    setResetConfirmOpen(false)
    setResetting(true)
    try {
      const next = await resetSystemSettingsToDefaults()
      applyRowToState(next, setters)
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
    if (customColors.trim()) {
      try {
        JSON.parse(customColors)
      } catch {
        showError('Custom colors must be valid JSON (or leave empty).')
        return
      }
    }
    const logoTrim = logoUrl.trim()
    if (logoTrim.length > LOGO_URL_MAX_LENGTH) {
      showError(
        `Logo must be at most ${LOGO_URL_MAX_LENGTH} characters. Upload a smaller image or use a shorter URL.`,
      )
      return
    }
    const lat = latitude === '' ? null : Number(latitude)
    const lng = longitude === '' ? null : Number(longitude)
    const body: SystemSettingsUpdateBody = {
      lab_name: nameTrim,
      mode,
      logo_url: logoUrl.trim() || null,
      primary_color: primaryColor.trim() || null,
      secondary_color: secondaryColor.trim() || null,
      custom_colors: customColors.trim() || null,
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
        description="Branding, theme colors, lab logo, and contact details."
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
            {settingsId ? (
              <p className="catalog-mode-hint" style={{ margin: 0 }}>
                Record id: <code>{settingsId}</code>
                {updatedAt ? ` · Last updated ${new Date(updatedAt).toLocaleString()}` : null}
              </p>
            ) : null}

            <div className="system-settings-panel__grid">
            <section className="system-settings-section">
              <h2 className="system-settings-section__title">Branding</h2>
              <div className="settings-form__stack">
                <div className="field">
                  <label htmlFor="sys-lab-name">Lab name</label>
                  <input
                    id="sys-lab-name"
                    value={labName}
                    onChange={(e) => setLabName(e.target.value)}
                    disabled={submitting || resetting || !hasApi}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sys-mode">Theme mode</label>
                  <select
                    id="sys-mode"
                    className="select-chevron-left"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as ThemeMode)}
                    disabled={submitting || resetting || !hasApi}
                  >
                    {MODE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <LogoUrlField
                  id="sys-logo"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  onUploaded={(row) => {
                    applyRowToState(row, setters)
                    showSuccess('Logo uploaded.')
                  }}
                  disabled={submitting || resetting || !hasApi}
                />
                <div className="settings-form__pair">
                  <ColorField
                    id="sys-primary"
                    label="Primary color"
                    value={primaryColor}
                    onChange={setPrimaryColor}
                    fallback="#0055ff"
                    disabled={submitting || resetting || !hasApi}
                  />
                  <ColorField
                    id="sys-secondary"
                    label="Secondary color"
                    value={secondaryColor}
                    onChange={setSecondaryColor}
                    fallback="#00cc66"
                    disabled={submitting || resetting || !hasApi}
                  />
                </div>
                <div className="field">
                  <label htmlFor="sys-custom-colors">Custom colors (JSON, optional)</label>
                  <textarea
                    id="sys-custom-colors"
                    value={customColors}
                    onChange={(e) => setCustomColors(e.target.value)}
                    rows={3}
                    placeholder='{"accent":"#ff5500"}'
                    disabled={submitting || resetting || !hasApi}
                  />
                </div>
              </div>
            </section>

            <section className="system-settings-section">
              <h2 className="system-settings-section__title">Location & contact</h2>
              <div className="settings-form__stack">
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

            <div className="system-settings-form__footer">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={submitting || resetting || !hasApi}
                onClick={() => setResetConfirmOpen(true)}
              >
                Reset to defaults
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting || resetting || !hasApi}>
                {submitting ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title="Reset to defaults?"
        message="All branding, theme colors, logo, and contact fields will be restored to the application defaults. This cannot be undone except by saving again."
        confirmLabel="Reset to defaults"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmResetToDefaults()}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}
