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
  fetchActiveMaterialFees,
  updateMaterialFee,
  type MaterialFeeRow,
} from '../services/materialFeeService'
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

type FormSnapshotFields = {
  mode: ThemeMode
  address: string
  latitude: number | ''
  longitude: number | ''
  contactPhone: string
  contactEmail: string
  materialFeeAmount: number | ''
}

function formSnapshot(fields: FormSnapshotFields): string {
  return JSON.stringify({
    mode: fields.mode,
    address: fields.address.trim(),
    latitude: fields.latitude,
    longitude: fields.longitude,
    contactPhone: fields.contactPhone.trim(),
    contactEmail: fields.contactEmail.trim(),
    materialFeeAmount: fields.materialFeeAmount,
  })
}

function snapshotFromState(
  row: SystemSettingsRow,
  materialFeeAmount: number | '',
): string {
  return formSnapshot({
    mode: normalizeAppThemeId(row.mode),
    address: row.address ?? '',
    latitude: row.latitude ?? '',
    longitude: row.longitude ?? '',
    contactPhone: row.contact_phone ?? '',
    contactEmail: row.contact_email ?? '',
    materialFeeAmount,
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
  const [updatedAt, setUpdatedAt] = useState<string | undefined>()

  const [mode, setMode] = useState<ThemeMode>(() => getAppliedAppTheme())
  const [address, setAddress] = useState('')
  const [latitude, setLatitude] = useState<number | ''>('')
  const [longitude, setLongitude] = useState<number | ''>('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [materialFeeId, setMaterialFeeId] = useState<string | null>(null)
  const [materialFeeName, setMaterialFeeName] = useState('')
  const [materialFeeAmount, setMaterialFeeAmount] = useState<number | ''>('')
  const [loadedAddressBaseline, setLoadedAddressBaseline] = useState<string | null>(null)

  const savedThemeRef = useRef<AppThemeId>(getAppliedAppTheme())
  const savedFormSnapshotRef = useRef('')
  const isDirtyRef = useRef(false)

  const applyMaterialFeeToState = useCallback((fee: MaterialFeeRow | null) => {
    if (fee) {
      setMaterialFeeId(fee.id)
      setMaterialFeeName(fee.name)
      setMaterialFeeAmount(fee.amount_mmk)
    } else {
      setMaterialFeeId(null)
      setMaterialFeeName('')
      setMaterialFeeAmount('')
    }
  }, [])

  const applySettingsRowToState = useCallback((row: SystemSettingsRow) => {
    const themeId = normalizeAppThemeId(row.mode)
    setUpdatedAt(row.updated_at)
    setMode(themeId)
    setAddress(row.address ?? '')
    setLatitude(row.latitude ?? '')
    setLongitude(row.longitude ?? '')
    setContactPhone(row.contact_phone ?? '')
    setContactEmail(row.contact_email ?? '')
  }, [])

  const syncSavedSnapshot = useCallback(
    (row: SystemSettingsRow, feeAmount: number | '') => {
      savedThemeRef.current = normalizeAppThemeId(row.mode)
      savedFormSnapshotRef.current = snapshotFromState(row, feeAmount)
    },
    [],
  )

  const commitSavedToApp = useCallback(
    (row: SystemSettingsRow, feeAmount: number | '') => {
      const themeId = normalizeAppThemeId(row.mode)
      savedThemeRef.current = themeId
      savedFormSnapshotRef.current = snapshotFromState(row, feeAmount)
      applyAppTheme(themeId)
    },
    [],
  )

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

  const currentSnapshot = useMemo(
    () =>
      formSnapshot({
        mode,
        address,
        latitude,
        longitude,
        contactPhone,
        contactEmail,
        materialFeeAmount,
      }),
    [mode, address, latitude, longitude, contactPhone, contactEmail, materialFeeAmount],
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
        const [row, fees] = await Promise.all([fetchSystemSettings(), fetchActiveMaterialFees()])
        const fee = fees[0] ?? null
        if (!cancelled) {
          applySettingsRowToState(row)
          applyMaterialFeeToState(fee)
          syncSavedSnapshot(row, fee?.amount_mmk ?? '')
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
  }, [hasApi, applyMaterialFeeToState, applySettingsRowToState, syncSavedSnapshot, t])

  async function confirmResetToDefaults() {
    if (!hasApi) return
    setResetConfirmOpen(false)
    setResetting(true)
    try {
      const next = await resetSystemSettingsToDefaults()
      applySettingsRowToState(next)
      commitSavedToApp(next, materialFeeAmount)
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

    const amount =
      typeof materialFeeAmount === 'number' ? materialFeeAmount : Number.parseFloat(String(materialFeeAmount))
    if (materialFeeId != null && (!Number.isFinite(amount) || amount < 0)) {
      showError(t('systemSettings.materialFees.errorAmount'))
      return
    }

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
      let savedAmount = materialFeeAmount
      if (materialFeeId != null && Number.isFinite(amount)) {
        const rounded = Math.round(amount * 100) / 100
        const updatedFee = await updateMaterialFee(materialFeeId, {
          name: materialFeeName.trim() || t('systemSettings.materialFees.defaultName'),
          amount_mmk: rounded,
          is_active: true,
        })
        savedAmount = updatedFee.amount_mmk
        setMaterialFeeName(updatedFee.name)
      }
      applySettingsRowToState(next)
      commitSavedToApp(next, savedAmount)
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
            <div className="system-settings-topbar">
              <div className="system-settings-callout" role="note">
                <span className="material-symbols-outlined system-settings-callout__icon" aria-hidden>
                  info
                </span>
                <p className="system-settings-callout__text">{t('systemSettings.draftHint')}</p>
              </div>
              {updatedAt ? (
                <p className="system-settings-last-saved">
                  {t('systemSettings.lastSaved', {
                    date: formatIsoDatetime(updatedAt, intlLocale),
                  })}
                </p>
              ) : null}
            </div>

            <div className="system-settings-panel__grid">
              <section className="system-settings-section">
                <header className="system-settings-section__head">
                  <span className="system-settings-section__icon" aria-hidden>
                    <span className="material-symbols-outlined">palette</span>
                  </span>
                  <div className="system-settings-section__copy">
                    <h2 className="system-settings-section__title">{t('systemSettings.appearance')}</h2>
                    <p className="system-settings-section__desc">{t('systemSettings.appearanceDesc')}</p>
                  </div>
                </header>
                <div className="settings-form__stack settings-form__stack--relaxed">
                  <ThemePicker
                    value={mode}
                    onChange={handleThemeChange}
                    disabled={submitting || resetting || !hasApi}
                  />
                  <div className="system-settings-subsection">
                    <div className="system-settings-subsection__head">
                      <span className="material-symbols-outlined system-settings-subsection__icon" aria-hidden>
                        science
                      </span>
                      <div>
                        <h3 className="system-settings-subsection__title">
                          {t('systemSettings.materialFees.title')}
                        </h3>
                        <p className="system-settings-subsection__hint">{t('systemSettings.materialFees.hint')}</p>
                      </div>
                    </div>
                    <div className="field system-settings-currency-field">
                      <label htmlFor="sys-material-fee">{t('systemSettings.materialFees.amountLabel')}</label>
                      <div className="system-settings-currency-input">
                        <input
                          id="sys-material-fee"
                          type="number"
                          min={0}
                          step={0.01}
                          inputMode="decimal"
                          value={materialFeeAmount === '' ? '' : materialFeeAmount}
                          onChange={(e) => {
                            const v = e.target.value
                            setMaterialFeeAmount(v === '' ? '' : Number.parseFloat(v))
                          }}
                          disabled={submitting || resetting || !hasApi || materialFeeId == null}
                          aria-describedby={materialFeeId == null ? 'sys-material-fee-hint' : undefined}
                        />
                        <span className="system-settings-currency-input__suffix">{t('orders.currency')}</span>
                      </div>
                    </div>
                    {materialFeeId == null ? (
                      <p id="sys-material-fee-hint" className="system-settings-subsection__hint system-settings-subsection__hint--warn">
                        {t('systemSettings.materialFees.unavailable')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </section>

              <section className="system-settings-section">
                <header className="system-settings-section__head">
                  <span className="system-settings-section__icon" aria-hidden>
                    <span className="material-symbols-outlined">location_on</span>
                  </span>
                  <div className="system-settings-section__copy">
                    <h2 className="system-settings-section__title">{t('systemSettings.locationContact')}</h2>
                    <p className="system-settings-section__desc">{t('systemSettings.locationContactDesc')}</p>
                  </div>
                </header>
                <div className="settings-form__stack settings-form__stack--relaxed">
                  <div className="field">
                    <label htmlFor="sys-address">{t('common.address')}</label>
                    <textarea
                      id="sys-address"
                      className="system-settings-address"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value)
                        setLoadedAddressBaseline(null)
                      }}
                      rows={3}
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
                      mapHeight={220}
                    />
                  </div>
                  <div className="system-settings-map-meta">
                    <span className="system-settings-coord-chip">
                      <span className="material-symbols-outlined" aria-hidden>
                        my_location
                      </span>
                      {t('systemSettings.coordinates', {
                        coords: formatCoordPair(latitude, longitude),
                      })}
                    </span>
                  </div>
                  {geocodeHint ? (
                    <p className="system-settings-geocode-hint" role="status">
                      {geocodeHint}
                    </p>
                  ) : null}
                  <div className="settings-form__pair system-settings-contact-pair">
                    <div className="field">
                      <label htmlFor="sys-phone">
                        <span className="system-settings-field-label">
                          <span className="material-symbols-outlined" aria-hidden>
                            call
                          </span>
                          {t('systemSettings.contactPhone')}
                        </span>
                      </label>
                      <input
                        id="sys-phone"
                        type="tel"
                        autoComplete="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        disabled={submitting || resetting || !hasApi}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="sys-email">
                        <span className="system-settings-field-label">
                          <span className="material-symbols-outlined" aria-hidden>
                            mail
                          </span>
                          {t('systemSettings.contactEmail')}
                        </span>
                      </label>
                      <input
                        id="sys-email"
                        type="email"
                        autoComplete="email"
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
              role="region"
              aria-label={t('systemSettings.saveSettings')}
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
