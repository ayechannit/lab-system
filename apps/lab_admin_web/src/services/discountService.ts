import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type FetchDiscountsParams = {
  is_active?: boolean
  test_name?: string
  test_code?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc'
}

export type TestDiscountListRow = {
  id: string
  test_id: string
  discount_percent: number
  is_active: boolean
  is_deleted: boolean
  start_date?: string
  end_date?: string
  test_name?: string
  test_code?: string
  original_price?: number
  after_discount_price?: number
  created_at?: string
  updated_at?: string
}

export type DiscountUpsertBody = {
  test_id: string
  discount_percent: number
  is_active: boolean
  start_date?: string
  end_date?: string
}

export type DiscountBulkUpsertBody = {
  discounts: DiscountUpsertBody[]
}

function toQuery(params?: FetchDiscountsParams): string {
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

function normalizeDiscountRow(raw: Record<string, unknown>): TestDiscountListRow {
  return {
    id: String(raw.id),
    test_id: String(raw.test_id),
    discount_percent: Number(raw.discount_percent ?? 0),
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    start_date: raw.start_date != null ? String(raw.start_date) : undefined,
    end_date: raw.end_date != null ? String(raw.end_date) : undefined,
    test_name: raw.test_name != null ? String(raw.test_name) : undefined,
    test_code: raw.test_code != null ? String(raw.test_code) : undefined,
    original_price: raw.original_price != null ? Number(raw.original_price) : undefined,
    after_discount_price: raw.after_discount_price != null ? Number(raw.after_discount_price) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export function discountAmountMmk(basePriceMmk: number, discountPercent: number): number {
  return Math.round(basePriceMmk * (1 - discountPercent / 100))
}

export async function fetchAllDiscounts(params?: FetchDiscountsParams): Promise<TestDiscountListRow[]> {
  const res = await apiFetch(`/api/discounts${toQuery(params)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeDiscountRow(row))
}

export async function upsertDiscount(body: DiscountUpsertBody): Promise<unknown> {
  const res = await apiFetch('/api/discounts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function bulkUpsertDiscounts(body: DiscountBulkUpsertBody): Promise<unknown> {
  const res = await apiFetch('/api/discounts/bulk', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function deleteDiscountById(id: string): Promise<void> {
  const res = await apiFetch(`/api/discounts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
