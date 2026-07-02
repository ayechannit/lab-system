import { useEffect } from 'react'
import { isApiMode } from '../services/apiBase'
import { fetchSystemSettings } from '../services/systemSettingService'
import { syncAppUiFromSettings } from '../utils/syncAppUiFromSettings'

/** Load shared UI theme + locale from system settings (same source as mobile app). */
export function useAppLocaleSync(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || !isApiMode()) return
    let cancelled = false
    void fetchSystemSettings()
      .then((row) => {
        if (cancelled) return
        syncAppUiFromSettings(row)
      })
      .catch(() => {
        /* keep localStorage locale / boot theme */
      })
    return () => {
      cancelled = true
    }
  }, [enabled])
}
