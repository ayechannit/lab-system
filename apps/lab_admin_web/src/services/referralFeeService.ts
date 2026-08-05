import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type FetchReferralFeesParams = {
  is_active?: boolean
  test_name?: string
  test_code?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc'
}

export type TestReferralFeeListRow = {
  id: string
  test_id: string
  referral_percent: number
  is_active: boolean
  is_deleted: boolean
  test_name?: string
  test_code?: string
  original_price?: number
  referral_fee_amount?: number
  created_at?: string
  updated_at?: string
}

export type ReferralFeeUpsertBody = {
  test_id: string
  referral_percent: number
  is_active: boolean
}

export type ReferralFeeBulkUpsertBody = {
  referral_fees: ReferralFeeUpsertBody[]
}

function toQuery(params?: FetchReferralFeesParams): string {
  if (!params) return ''
  const q = new URLSearchParams()
  if (params.is_active !== undefined) q.set('is_active', String(params.is_active))
  if (params.test_name) q.set('test_name', params.test_name)
  if (params.test_code) q.set('test_code', params.test_code)
  if (params.page != null) q.set('page', String(params.page))
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.sortBy) q.set('sortBy', params.sortBy)
  if (params.sortOrder) q.set('sortOrder', params.sortOrder)
  const s = q.toString()
  return s ? `?${s}` : ''
}

function normalizeReferralFeeRow(raw: Record<string, unknown>): TestReferralFeeListRow {
  return {
    id: String(raw.id),
    test_id: String(raw.test_id),
    referral_percent: Number(raw.referral_percent ?? 0),
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    test_name: raw.test_name != null ? String(raw.test_name) : undefined,
    test_code: raw.test_code != null ? String(raw.test_code) : undefined,
    original_price: raw.original_price != null ? Number(raw.original_price) : undefined,
    referral_fee_amount: raw.referral_fee_amount != null ? Number(raw.referral_fee_amount) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export function referralFeeAmountMmk(basePriceMmk: number, referralPercent: number): number {
  return Math.round(basePriceMmk * (referralPercent / 100))
}

export async function fetchAllReferralFees(params?: FetchReferralFeesParams): Promise<TestReferralFeeListRow[]> {
  const res = await apiFetch(`/api/referral-fees${toQuery(params)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeReferralFeeRow(row))
}

export async function upsertReferralFee(body: ReferralFeeUpsertBody): Promise<unknown> {
  const res = await apiFetch('/api/referral-fees', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function bulkUpsertReferralFees(body: ReferralFeeBulkUpsertBody): Promise<unknown> {
  const res = await apiFetch('/api/referral-fees/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function deleteReferralFeeById(id: string): Promise<void> {
  const res = await apiFetch(`/api/referral-fees/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
