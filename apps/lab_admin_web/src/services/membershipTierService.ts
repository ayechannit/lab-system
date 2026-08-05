import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type MembershipTierRow = {
  id: string
  name: string
  min_spend_mmk: number
  discount_percent: number
  is_active: boolean
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export type MembershipTierUpsertBody = {
  name: string
  min_spend_mmk: number
  discount_percent: number
  is_active: boolean
}

function normalizeRow(raw: Record<string, unknown>): MembershipTierRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    min_spend_mmk: Number(raw.min_spend_mmk ?? 0),
    discount_percent: Number(raw.discount_percent ?? 0),
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchMembershipTiers(): Promise<MembershipTierRow[]> {
  const res = await apiFetch('/api/membership-tiers')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}

export async function createMembershipTier(body: MembershipTierUpsertBody): Promise<MembershipTierRow> {
  const res = await apiFetch('/api/membership-tiers', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updateMembershipTier(
  id: string,
  body: MembershipTierUpsertBody,
): Promise<MembershipTierRow> {
  const res = await apiFetch(`/api/membership-tiers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deleteMembershipTier(id: string): Promise<void> {
  const res = await apiFetch(`/api/membership-tiers/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
