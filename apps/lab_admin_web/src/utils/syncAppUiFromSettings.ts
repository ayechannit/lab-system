import { applyAppLocaleFromServer, type AppLocale } from '../i18n'
import type { SystemSettingsRow } from '../services/systemSettingService'
import { applyAppTheme, normalizeAppThemeId } from '../theme/appThemes'

/** Apply theme + locale from a system settings row (header, CSS, i18n). */
export function syncAppUiFromSettings(row: SystemSettingsRow): void {
  applyAppTheme(normalizeAppThemeId(row.mode))
  if (row.ui_locale === 'my' || row.ui_locale === 'en') {
    void applyAppLocaleFromServer(row.ui_locale as AppLocale)
  }
}
