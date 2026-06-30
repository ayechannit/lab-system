import { useEffect } from 'react'
import { applyAppLocaleFromServer, type AppLocale } from '../i18n'
import { isApiMode } from '../services/apiBase'
import { fetchSystemSettings } from '../services/systemSettingService'

/** Load shared UI locale from system settings (same source as mobile app). */
export function useAppLocaleSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isApiMode()) return
    let cancelled = false
    void fetchSystemSettings()
      .then((row) => {
        if (cancelled) return
        const locale = row.ui_locale === 'my' ? 'my' : row.ui_locale === 'en' ? 'en' : null
        if (locale) void applyAppLocaleFromServer(locale as AppLocale)
      })
      .catch(() => {
        /* keep localStorage locale */
      })
    return () => {
      cancelled = true
    }
  }, [enabled])
}
