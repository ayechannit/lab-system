import { apiFetch } from './apiClient'
import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'
import { LOGO_URL_MAX_LENGTH } from '../utils/logoImage'

export { LOGO_URL_MAX_LENGTH }

/** Stored in `theme_settings.mode`; only preset themes are supported in the admin UI. */
export type ThemeMode = 'light' | 'dark'

export type SystemSettingsRow = {
  id?: string
  lab_name: string
  mode: ThemeMode
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  custom_colors: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  contact_phone: string | null
  contact_email: string | null
  updated_at?: string
}

export type SystemSettingsUpdateBody = {
  lab_name: string
  mode: ThemeMode
  logo_url: string | null
  primary_color: string | null
  secondary_color: string | null
  custom_colors: string | null
  latitude: number | null
  longitude: number | null
  address: string | null
  contact_phone: string | null
  contact_email: string | null
}

/** Canonical defaults for theme_settings (kept in sync with lab_backend systemSettingModel). */
export const DEFAULT_SYSTEM_SETTINGS: SystemSettingsUpdateBody = {
  lab_name: 'MedLab Smart',
  mode: 'light',
  logo_url: null,
  primary_color: '#003d9b',
  secondary_color: '#0d8a5b',
  custom_colors: null,
  latitude: null,
  longitude: null,
  address: null,
  contact_phone: null,
  contact_email: null,
}

export function defaultSystemSettingsRow(): SystemSettingsRow {
  return normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS as unknown as Record<string, unknown>)
}

function asStr(v: unknown, fallback = ''): string {
  if (v == null) return fallback
  return String(v)
}

function asNullableStr(v: unknown): string | null {
  if (v == null || v === '') return null
  return String(v)
}

function asNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function normalizeMode(v: unknown): ThemeMode {
  return String(v) === 'dark' ? 'dark' : 'light'
}

/** HTML color inputs require `#rrggbb`. */
export function normalizeHexColor(v: string | null | undefined, fallback: string): string {
  const s = (v ?? '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase()
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`
  return fallback
}

export function normalizeSystemSettings(raw: Record<string, unknown> | null | undefined): SystemSettingsRow {
  if (!raw) {
    return defaultSystemSettingsRow()
  }
  return {
    id: raw.id != null ? String(raw.id) : undefined,
    lab_name: asStr(raw.lab_name, 'MedLab Smart'),
    mode: normalizeMode(raw.mode),
    logo_url: asNullableStr(raw.logo_url),
    primary_color: normalizeHexColor(asNullableStr(raw.primary_color), '#003d9b'),
    secondary_color: normalizeHexColor(asNullableStr(raw.secondary_color), '#0d8a5b'),
    custom_colors: asNullableStr(raw.custom_colors),
    latitude: asNum(raw.latitude),
    longitude: asNum(raw.longitude),
    address: asNullableStr(raw.address),
    contact_phone: asNullableStr(raw.contact_phone),
    contact_email: asNullableStr(raw.contact_email),
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchSystemSettings(): Promise<SystemSettingsRow> {
  const res = await apiFetch('/api/system-settings')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown> | null
  return normalizeSystemSettings(data ?? undefined)
}

export async function updateSystemSettings(body: SystemSettingsUpdateBody): Promise<SystemSettingsRow> {
  const res = await apiFetch('/api/system-settings', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeSystemSettings((await res.json()) as Record<string, unknown>)
}

/** Resolve stored logo_url for <img src> (API-hosted /uploads paths need the API origin). */
export function resolveLogoDisplayUrl(logoUrl: string | null | undefined): string | null {
  const u = (logoUrl ?? '').trim()
  if (!u) return null
  if (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) {
    const base = getApiBaseUrl()?.replace(/\/$/, '')
    if (base) return `${base}${u}`
  }
  return u
}

export async function resetSystemSettingsToDefaults(): Promise<SystemSettingsRow> {
  const res = await apiFetch('/api/system-settings/reset', { method: 'POST' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeSystemSettings((await res.json()) as Record<string, unknown>)
}

export async function uploadSystemSettingsLogo(file: File): Promise<SystemSettingsRow> {
  const fd = new FormData()
  fd.append('logo', file)
  const res = await apiFetch('/api/system-settings/logo', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeSystemSettings((await res.json()) as Record<string, unknown>)
}
