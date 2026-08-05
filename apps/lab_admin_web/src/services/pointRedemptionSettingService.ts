import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type PointRedemptionSetting = {
  id: string
  mmk_per_point: number
  updated_user?: string | null
  updated_at?: string
}

function normalizeSetting(raw: Record<string, unknown>): PointRedemptionSetting {
  return {
    id: String(raw.id),
    mmk_per_point: Number(raw.mmk_per_point ?? 0),
    updated_user: raw.updated_user != null ? String(raw.updated_user) : null,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchPointRedemptionSetting(): Promise<PointRedemptionSetting> {
  const res = await apiFetch('/api/point-redemption-setting')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeSetting((await res.json()) as Record<string, unknown>)
}

export async function updatePointRedemptionSetting(mmkPerPoint: number): Promise<PointRedemptionSetting> {
  const res = await apiFetch('/api/point-redemption-setting', {
    method: 'PUT',
    body: JSON.stringify({ mmk_per_point: mmkPerPoint }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeSetting((await res.json()) as Record<string, unknown>)
}
