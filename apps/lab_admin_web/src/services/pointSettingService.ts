import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function pointSettingsBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/point-settings`
}

export type PointSettingRow = {
  id: string
  name: string
  spend_amount_mmk: number
  points_reward: number
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type PointSettingUpsertBody = {
  name: string
  spend_amount_mmk: number
  points_reward: number
  start_date?: string | null
  end_date?: string | null
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 1 || v === '1') return true
  if (v === 0 || v === '0') return false
  return Boolean(v)
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function toInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

export function normalizePointSettingRow(parsed: unknown): PointSettingRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  const id = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const nameRaw =
    typeof o.name === 'string' ? o.name : o.name != null ? String(o.name) : ''
  const name = nameRaw.trim() || 'Untitled rule'
  if (!id) return null
  const start =
    o.start_date == null || o.start_date === ''
      ? null
      : typeof o.start_date === 'string'
        ? o.start_date
        : String(o.start_date)
  const end =
    o.end_date == null || o.end_date === ''
      ? null
      : typeof o.end_date === 'string'
        ? o.end_date
        : String(o.end_date)
  return {
    id,
    name,
    spend_amount_mmk: toNum(o.spend_amount_mmk),
    points_reward: toInt(o.points_reward),
    start_date: start,
    end_date: end,
    is_active: toBool(o.is_active ?? true),
    ...(typeof o.created_at === 'string' ? { created_at: o.created_at } : {}),
    ...(typeof o.updated_at === 'string' ? { updated_at: o.updated_at } : {}),
  }
}

export function normalizePointSettingRows(parsed: unknown): PointSettingRow[] {
  if (!Array.isArray(parsed)) return []
  const out: PointSettingRow[] = []
  for (const item of parsed) {
    const row = normalizePointSettingRow(item)
    if (row) out.push(row)
  }
  return out
}

/** GET /api/point-settings */
export async function fetchPointSettings(): Promise<PointSettingRow[]> {
  const res = await fetch(pointSettingsBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizePointSettingRows(await res.json())
}

/** POST /api/point-settings */
export async function createPointSetting(body: PointSettingUpsertBody): Promise<PointSettingRow> {
  const res = await fetch(pointSettingsBasePath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizePointSettingRow(await res.json())
  if (!row) throw new Error('Invalid point setting response from server')
  return row
}

/** PUT /api/point-settings/:id */
export async function updatePointSetting(
  id: string,
  body: PointSettingUpsertBody,
): Promise<PointSettingRow> {
  const res = await fetch(`${pointSettingsBasePath()}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizePointSettingRow(await res.json())
  if (!row) throw new Error('Invalid point setting response from server')
  return row
}

/** DELETE /api/point-settings/:id */
export async function deletePointSetting(id: string): Promise<void> {
  const res = await fetch(`${pointSettingsBasePath()}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
