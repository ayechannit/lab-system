import { apiFetch } from './apiClient'

export type MembershipTierRow = {
  id: string
  name: string
  min_points: number
  discount_percent: number
  is_active: boolean
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export type MembershipTierUpsertBody = {
  name: string
  min_points: number
  discount_percent: number
  is_active: boolean
}

function normalizeRow(raw: Record<string, unknown>): MembershipTierRow {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    min_points: Number(raw.min_points ?? raw.min_spend_mmk ?? 0),
    discount_percent: Number(raw.discount_percent ?? 0),
    is_active: Boolean(raw.is_active ?? true),
    is_deleted: Boolean(raw.is_deleted ?? false),
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchMembershipTiers(): Promise<MembershipTierRow[]> {
  const res = await apiFetch('/api/membership-tiers')
  if (!res.ok) throw new Error(`Failed to load membership tiers (${res.status})`)
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeRow(row as Record<string, unknown>))
}

export async function createMembershipTier(body: MembershipTierUpsertBody): Promise<MembershipTierRow> {
  const res = await apiFetch('/api/membership-tiers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message || `Failed to create membership tier (${res.status})`)
  }
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updateMembershipTier(
  id: string,
  body: MembershipTierUpsertBody,
): Promise<MembershipTierRow> {
  const res = await apiFetch(`/api/membership-tiers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message || `Failed to update membership tier (${res.status})`)
  }
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deleteMembershipTier(id: string): Promise<void> {
  const res = await apiFetch(`/api/membership-tiers/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string }
    throw new Error(err.message || `Failed to delete membership tier (${res.status})`)
  }
}
