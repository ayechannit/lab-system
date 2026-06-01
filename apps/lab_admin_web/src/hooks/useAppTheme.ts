import { useEffect } from 'react'
import { isApiMode } from '../services/apiBase'
import { fetchSystemSettings } from '../services/systemSettingService'
import { applyAppTheme, normalizeAppThemeId } from '../theme/appThemes'

/** Load saved theme from the API and apply CSS variables on the document root. */
export function useAppThemeSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isApiMode()) return
    let cancelled = false
    void fetchSystemSettings()
      .then((row) => {
        if (!cancelled) applyAppTheme(normalizeAppThemeId(row.mode))
      })
      .catch(() => {
        if (!cancelled) applyAppTheme('light')
      })
    return () => {
      cancelled = true
    }
  }, [enabled])
}
