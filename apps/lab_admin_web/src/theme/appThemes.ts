import type { CSSProperties } from 'react'
import type { SystemSettingsUpdateBody } from '../services/systemSettingService'

export type AppThemeId = 'light' | 'dark'

export type ThemeOption = {
  id: AppThemeId
  label: string
  description: string
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'light', label: 'Light', description: 'Default bright workspace' },
  { id: 'dark', label: 'Dark', description: 'Reduced glare for low-light rooms' },
]

type ThemePreset = {
  mode: AppThemeId
  primary_color: string
  secondary_color: string
  custom_colors: null
  css: Record<string, string>
}

const LIGHT_SEMANTIC: Record<string, string> = {
  '--elevated-bg': '#ffffff',
  '--input-bg': '#ffffff',
  '--table-bg': '#ffffff',
  '--table-header-bg': '#f5f7fb',
  '--table-row-hover': 'rgba(0, 61, 155, 0.04)',
  '--segment-track': '#f1f4f9',
  '--segment-active': '#ffffff',
  '--segment-hover': 'rgba(255, 255, 255, 0.65)',
  '--subtle-fill': '#f8fafc',
  '--subtle-fill-2': '#fafbfd',
  '--code-bg': '#f1f3f7',
  '--btn-secondary-bg': '#ffffff',
  '--btn-export-bg': '#ffffff',
  '--btn-export-hover': '#f3f7ff',
  '--btn-ghost-hover': 'rgba(0, 61, 155, 0.06)',
  '--nav-active-bg': 'rgba(0, 61, 155, 0.08)',
  '--action-trigger-color': '#536176',
  '--action-trigger-hover-bg': '#f5f8ff',
  '--action-trigger-open-bg': '#eef4ff',
  '--menu-bg': '#ffffff',
  '--menu-border': '#d9e1ef',
  '--menu-shadow': '0 10px 24px rgba(13, 23, 45, 0.14)',
  '--menu-item-hover': 'rgba(0, 61, 155, 0.07)',
  '--input-text': '#0f172a',
  '--sticky-col-shadow': '-10px 0 14px -8px rgba(13, 23, 45, 0.14)',
  '--stat-border': '#e8edf4',
  '--warning-bg': '#fffbeb',
  '--warning-border': '#fde68a',
  '--warning-text': '#92400e',
  '--popover-shadow': '0 4px 12px rgba(15, 23, 42, 0.08), 0 18px 44px rgba(15, 23, 42, 0.12)',
  '--focus-ring': 'rgba(0, 61, 155, 0.12)',
  '--banner-fade': '#ffffff',
  '--shadow-sm': '0 1px 2px rgba(25, 27, 35, 0.06)',
  '--info-panel-bg': '#f8fbff',
  '--info-panel-border': '#dbeafe',
  '--error-panel-bg': '#fef2f2',
  '--error-panel-border': '#fecaca',
  '--error-panel-text': '#991b1b',
  '--error-panel-text-muted': '#7f1d1d',
  '--success-panel-border': '#bbf7d0',
}

const DARK_SEMANTIC: Record<string, string> = {
  '--elevated-bg': '#1a2332',
  '--input-bg': '#151b26',
  '--table-bg': '#1a2332',
  '--table-header-bg': '#151b26',
  '--table-row-hover': 'rgba(107, 159, 255, 0.08)',
  '--segment-track': '#151b26',
  '--segment-active': '#243044',
  '--segment-hover': 'rgba(255, 255, 255, 0.06)',
  '--subtle-fill': '#151b26',
  '--subtle-fill-2': '#1a2332',
  '--code-bg': '#243044',
  '--btn-secondary-bg': '#243044',
  '--btn-export-bg': '#243044',
  '--btn-export-hover': '#2d3d52',
  '--btn-ghost-hover': 'rgba(107, 159, 255, 0.12)',
  '--nav-active-bg': 'rgba(107, 159, 255, 0.15)',
  '--action-trigger-color': '#94a3b8',
  '--action-trigger-hover-bg': '#243044',
  '--action-trigger-open-bg': '#2d3d52',
  '--menu-bg': '#1a2332',
  '--menu-border': '#2a3341',
  '--menu-shadow': '0 10px 24px rgba(0, 0, 0, 0.45)',
  '--menu-item-hover': 'rgba(107, 159, 255, 0.12)',
  '--input-text': '#e2e8f0',
  '--sticky-col-shadow': '-10px 0 14px -8px rgba(0, 0, 0, 0.35)',
  '--stat-border': '#2a3341',
  '--warning-bg': '#422006',
  '--warning-border': '#854d0e',
  '--warning-text': '#fde68a',
  '--popover-shadow': '0 4px 12px rgba(0, 0, 0, 0.35), 0 18px 44px rgba(0, 0, 0, 0.5)',
  '--focus-ring': 'rgba(107, 159, 255, 0.25)',
  '--banner-fade': '#1a2332',
  '--shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.35)',
  '--info-panel-bg': '#1e293b',
  '--info-panel-border': '#334155',
  '--error-panel-bg': '#450a0a',
  '--error-panel-border': '#7f1d1d',
  '--error-panel-text': '#fecaca',
  '--error-panel-text-muted': '#fca5a5',
  '--success-panel-border': '#14532d',
}

export const THEME_PRESETS: Record<AppThemeId, ThemePreset> = {
  light: {
    mode: 'light',
    primary_color: '#003d9b',
    secondary_color: '#0d8a5b',
    custom_colors: null,
    css: {
      '--primary': '#003d9b',
      '--primary-light': '#0052cc',
      '--accent-green': '#0d8a5b',
      '--surface': '#faf8ff',
      '--border': '#e1e2ec',
      '--text': '#434654',
      '--heading': '#191b23',
      '--muted': '#6b6f80',
      '--card-bg': '#ffffff',
      '--panel-muted': '#f5f7fb',
      ...LIGHT_SEMANTIC,
    },
  },
  dark: {
    mode: 'dark',
    primary_color: '#6b9fff',
    secondary_color: '#34d399',
    custom_colors: null,
    css: {
      '--primary': '#6b9fff',
      '--primary-light': '#8bb4ff',
      '--accent-green': '#34d399',
      '--surface': '#0f1419',
      '--border': '#2a3341',
      '--text': '#d1d9e6',
      '--heading': '#f1f5f9',
      '--muted': '#94a3b8',
      '--card-bg': '#1a2332',
      '--panel-muted': '#151b26',
      ...DARK_SEMANTIC,
    },
  },
}

export function normalizeAppThemeId(mode: unknown): AppThemeId {
  return String(mode) === 'dark' ? 'dark' : 'light'
}

/** Preview a theme on a container (settings page only) without changing the whole app. */
export function themePreviewStyle(themeId: AppThemeId): CSSProperties {
  const preset = THEME_PRESETS[themeId] ?? THEME_PRESETS.light
  return preset.css as CSSProperties
}

export function applyAppTheme(themeId: AppThemeId): void {
  const preset = THEME_PRESETS[themeId] ?? THEME_PRESETS.light
  const root = document.documentElement
  root.dataset.theme = preset.mode
  for (const [key, value] of Object.entries(preset.css)) {
    root.style.setProperty(key, value)
  }
}

export function themeFieldsForApi(
  themeId: AppThemeId,
): Pick<SystemSettingsUpdateBody, 'mode' | 'primary_color' | 'secondary_color' | 'custom_colors'> {
  const preset = THEME_PRESETS[themeId] ?? THEME_PRESETS.light
  return {
    mode: preset.mode,
    primary_color: preset.primary_color,
    secondary_color: preset.secondary_color,
    custom_colors: null,
  }
}
