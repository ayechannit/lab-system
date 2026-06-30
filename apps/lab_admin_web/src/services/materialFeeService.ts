import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type MaterialFeeRow = {
  id: string
  name: string
  amount_mmk: number
  is_active: boolean
}

function normalizeRow(raw: Record<string, unknown>): MaterialFeeRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    amount_mmk: Number(raw.amount_mmk ?? 0),
    is_active: Boolean(raw.is_active),
  }
}

/** Active material fees from the lab (typically one standard fee). */
export async function fetchActiveMaterialFees(): Promise<MaterialFeeRow[]> {
  const res = await apiFetch('/api/material-fees/active')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}

export async function updateMaterialFee(
  id: string,
  body: { name: string; amount_mmk: number; is_active: boolean },
): Promise<MaterialFeeRow> {
  const res = await apiFetch(`/api/material-fees/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}
