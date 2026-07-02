import { useEffect } from 'react'
import { isApiMode } from '../services/apiBase'
import { fetchSystemSettings } from '../services/systemSettingService'
import { applyAppTheme } from '../theme/appThemes'
import { syncAppUiFromSettings } from '../utils/syncAppUiFromSettings'

/** Load saved theme from the API and apply CSS variables on the document root. */
export function useAppThemeSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isApiMode()) return
    let cancelled = false
    void fetchSystemSettings()
      .then((row) => {
        if (!cancelled) syncAppUiFromSettings(row)
      })
      .catch(() => {
        if (!cancelled) applyAppTheme('idhc')
      })
    return () => {
      cancelled = true
    }
  }, [enabled])
}
