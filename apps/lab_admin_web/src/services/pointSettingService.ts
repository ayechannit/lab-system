import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

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
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

function normalizeRow(raw: Record<string, unknown>): PointSettingRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    spend_amount_mmk: Number(raw.spend_amount_mmk ?? 0),
    points_reward: Number(raw.points_reward ?? 0),
    start_date: raw.start_date != null ? String(raw.start_date) : null,
    end_date: raw.end_date != null ? String(raw.end_date) : null,
    is_active: Boolean(raw.is_active),
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchPointSettings(): Promise<PointSettingRow[]> {
  const res = await apiFetch('/api/point-settings')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}

export async function createPointSetting(body: PointSettingUpsertBody): Promise<PointSettingRow> {
  const res = await apiFetch('/api/point-settings', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updatePointSetting(id: string, body: PointSettingUpsertBody): Promise<PointSettingRow> {
  const res = await apiFetch(`/api/point-settings/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deletePointSetting(id: string): Promise<void> {
  const res = await apiFetch(`/api/point-settings/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
