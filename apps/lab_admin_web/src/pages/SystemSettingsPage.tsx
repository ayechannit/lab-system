import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { PageHeader } from '../components/common/PageHeader'
import { ThemePicker } from '../components/settings/ThemePicker'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { formatCoordPair, LocationMapPicker } from '../components/users/LocationMapPicker'
import { useAddressGeocode } from '../hooks/useAddressGeocode'
import { isApiMode } from '../services/apiBase'
import {
  fetchSystemSettings,
  fixedBrandingFields,
  type SystemSettingsRow,
  type SystemSettingsUpdateBody,
  type ThemeMode,
  resetSystemSettingsToDefaults,
  updateSystemSettings,
} from '../services/systemSettingService'
import { getIntlLocale } from '../i18n'
import { formatIsoDatetime } from '../utils/dateIntl'
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
    setMode: (v: ThemeMode) => void
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
  setters.setMode(themeId)
  setters.setAddress(row.address ?? '')
  setters.setLatitude(row.latitude ?? '')
  setters.setLongitude(row.longitude ?? '')
  setters.setContactPhone(row.contact_phone ?? '')
  setters.setContactEmail(row.contact_email ?? '')
}

type FormSnapshotFields = {
  mode: ThemeMode
  address: string
  latitude: number | ''
  longitude: number | ''
  contactPhone: string
  contactEmail: string
}

function formSnapshot(fields: FormSnapshotFields): string {
  return JSON.stringify({
    mode: fields.mode,
    address: fields.address.trim(),
    latitude: fields.latitude,
    longitude: fields.longitude,
    contactPhone: fields.contactPhone.trim(),
    contactEmail: fields.contactEmail.trim(),
  })
}

function snapshotFromRow(row: SystemSettingsRow): string {
  return formSnapshot({
    mode: normalizeAppThemeId(row.mode),
    address: row.address ?? '',
    latitude: row.latitude ?? '',
    longitude: row.longitude ?? '',
    contactPhone: row.contact_phone ?? '',
    contactEmail: row.contact_email ?? '',
  })
}

export function SystemSettingsPage() {
  const { t } = useTranslation()
  const intlLocale = getIntlLocale()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [settingsId, setSettingsId] = useState<string | undefined>()
  const [updatedAt, setUpdatedAt] = useState<string | undefined>()

  const [mode, setMode] = useState<ThemeMode>(() => getAppliedAppTheme())
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>('')
  const [longitude, setLongitude] = useState<number | ''>('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [loadedAddressBaseline, setLoadedAddressBaseline] = useState<string | null>(null)

  const savedThemeRef = useRef<AppThemeId>(getAppliedAppTheme())
  const savedFormSnapshotRef = useRef('')
  const isDirtyRef = useRef(false)

  const syncSavedFromRow = useCallback((row: SystemSettingsRow) => {
    savedThemeRef.current = normalizeAppThemeId(row.mode)
    savedFormSnapshotRef.current = snapshotFromRow(row)
  }, [])

  const commitSavedToApp = useCallback((row: SystemSettingsRow) => {
    const themeId = normalizeAppThemeId(row.mode)
    savedThemeRef.current = themeId
    savedFormSnapshotRef.current = snapshotFromRow(row)
    applyAppTheme(themeId)
  }, [])

  const revertUnsavedTheme = useCallback(() => {
    applyAppTheme(savedThemeRef.current)
  }, [])

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
    setMode,
    setAddress,
    setLatitude,
    setLongitude,
    setContactPhone,
    setContactEmail,
  }

  const currentSnapshot = useMemo(
    () =>
      formSnapshot({
        mode,
        address,
        latitude,
        longitude,
        contactPhone,
        contactEmail,
      }),
    [mode, address, latitude, longitude, contactPhone, contactEmail],
  )

  const isDirty =
    hasApi && !loading && savedFormSnapshotRef.current.length > 0 && currentSnapshot !== savedFormSnapshotRef.current

  isDirtyRef.current = isDirty

  const handleThemeChange = useCallback((next: ThemeMode) => {
    setMode(next)
    applyAppTheme(next)
  }, [])

  useEffect(() => {
    return () => {
      if (isDirtyRef.current) {
        revertUnsavedTheme()
      }
    }
  }, [revertUnsavedTheme])

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
          syncSavedFromRow(row)
          const addr = row.address?.trim() ?? ''
          const hasCoords =
            row.latitude != null &&
            row.longitude != null &&
            !(row.latitude === 0 && row.longitude === 0)
          setLoadedAddressBaseline(addr && hasCoords ? addr : '')
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('systemSettings.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once when API mode is on
  }, [hasApi, syncSavedFromRow])

  async function confirmResetToDefaults() {
    if (!hasApi) return
    setResetConfirmOpen(false)
    setResetting(true)
    try {
      const next = await resetSystemSettingsToDefaults()
      applyRowToState(next, setters)
      commitSavedToApp(next)
      setLoadedAddressBaseline('')
      showSuccess(t('systemSettings.reset.success'))
    } catch (err) {
      showError(messageFromError(err, t('systemSettings.reset.failed')))
    } finally {
      setResetting(false)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!hasApi) return
    const lat = latitude === '' ? null : Number(latitude)
    const lng = longitude === '' ? null : Number(longitude)
    const body: SystemSettingsUpdateBody = {
      ...fixedBrandingFields(),
      ...themeFieldsForApi(mode),
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
      showSuccess(t('systemSettings.save.success'))
    } catch (err) {
      showError(messageFromError(err, t('systemSettings.save.failed')))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="system-settings-page">
      <PageHeader title={t('pages.systemSettings.title')} description={t('pages.systemSettings.description')} />

      {!hasApi ? <ApiConfigBanner variant="settings" /> : null}

      <div className="card system-settings-panel">
        {loading ? (
          <LoadingSpinner layout="block" label={t('systemSettings.loading')} />
        ) : (
          <form className="system-settings-form" onSubmit={(e) => void handleSubmit(e)}>
            <div className="system-settings-callout" role="note">
              <span className="material-symbols-outlined system-settings-callout__icon" aria-hidden>
                info
              </span>
              <p className="system-settings-callout__text">{t('systemSettings.draftHint')}</p>
            </div>

            {settingsId ? (
              <div className="system-settings-meta">
                <span>
                  {t('common.record')} <code>{settingsId}</code>
                </span>
                {updatedAt ? (
                  <span className="system-settings-meta__updated">
                    {t('systemSettings.updatedAt', {
                      date: formatIsoDatetime(updatedAt, intlLocale),
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}

            <div className="system-settings-panel__grid">
              <section className="system-settings-section">
                <h2 className="system-settings-section__title">{t('systemSettings.appearance')}</h2>
                <div className="settings-form__stack settings-form__stack--relaxed">
                  <ThemePicker
                    value={mode}
                    onChange={handleThemeChange}
                    disabled={submitting || resetting || !hasApi}
                  />
                </div>
              </section>

              <section className="system-settings-section">
                <h2 className="system-settings-section__title">{t('systemSettings.locationContact')}</h2>
                <div className="settings-form__stack settings-form__stack--relaxed">
                  <div className="field">
                    <label htmlFor="sys-address">{t('common.address')}</label>
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
                    {t('systemSettings.coordinates', {
                      coords: formatCoordPair(latitude, longitude),
                    })}
                  </p>
                  <p className="catalog-mode-hint" style={{ margin: '0.35rem 0 0' }}>
                    {t('systemSettings.mapHint')}
                  </p>
                  <div className="settings-form__pair">
                    <div className="field">
                      <label htmlFor="sys-phone">{t('systemSettings.contactPhone')}</label>
                      <input
                        id="sys-phone"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        disabled={submitting || resetting || !hasApi}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="sys-email">{t('systemSettings.contactEmail')}</label>
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
                    <span className="system-settings-actions__label">{t('systemSettings.unsavedChanges')}</span>
                    <span className="system-settings-actions__sub">
                      {t('systemSettings.unsavedSub')}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined system-settings-actions__saved-icon" aria-hidden>
                      check_circle
                    </span>
                    <span className="system-settings-actions__label">{t('systemSettings.allSaved')}</span>
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
                  {t('systemSettings.resetDefaults')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || resetting || !hasApi || !isDirty}
                >
                  {submitting ? t('common.saving') : t('systemSettings.saveSettings')}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      <ConfirmDialog
        open={resetConfirmOpen}
        title={t('systemSettings.reset.title')}
        message={t('systemSettings.reset.message')}
        confirmLabel={t('systemSettings.reset.confirm')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmResetToDefaults()}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}
