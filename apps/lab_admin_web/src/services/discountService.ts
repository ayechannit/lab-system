import type { EndUserRole } from '../model/types'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type FetchDiscountsParams = {
  role?: EndUserRole | ''
  test_id?: string
  is_active?: boolean
  test_name?: string
  test_code?: string
  page?: number
  limit?: number
}

export type TestDiscountListRow = {
  id: string
  test_id: string
  role: string
  discount_percent: number
  is_active: boolean
  is_deleted: boolean
  start_date: string | null
  end_date: string | null
  test_name?: string
  test_code?: string
  original_price?: number
  after_discount_price?: number
  created_at?: string
  updated_at?: string
}

export type DiscountUpsertBody = {
  test_id: string
  role: EndUserRole | 'all'
  discount_percent: number
  is_active: boolean
  start_date: string | null
  end_date: string | null
}

export type DiscountBulkUpsertBody = {
  discounts: DiscountUpsertBody[]
}

function toQuery(params?: FetchDiscountsParams): string {
  if (!params) return ''
  const q = new URLSearchParams()
  if (params.role) q.set('role', params.role)
  if (params.test_id) q.set('test_id', params.test_id)
  if (params.is_active !== undefined) q.set('is_active', String(params.is_active))
  if (params.test_name) q.set('test_name', params.test_name)
  if (params.test_code) q.set('test_code', params.test_code)
  if (params.page != null) q.set('page', String(params.page))
  if (params.limit != null) q.set('limit', String(params.limit))
  const s = q.toString()
  return s ? `?${s}` : ''
}

function normalizeDiscountRow(raw: Record<string, unknown>): TestDiscountListRow {
  return {
    id: String(raw.id),
    test_id: String(raw.test_id),
    role: String(raw.role ?? ''),
    discount_percent: Number(raw.discount_percent ?? 0),
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    start_date: raw.start_date != null && String(raw.start_date).trim() ? String(raw.start_date) : null,
    end_date: raw.end_date != null && String(raw.end_date).trim() ? String(raw.end_date) : null,
    test_name: raw.test_name != null ? String(raw.test_name) : undefined,
    test_code: raw.test_code != null ? String(raw.test_code) : undefined,
    original_price: raw.original_price != null ? Number(raw.original_price) : undefined,
    after_discount_price: raw.after_discount_price != null ? Number(raw.after_discount_price) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export function formatDiscountDateCell(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export function formatDiscountSchedulePeriod(start: string | null, end: string | null): string {
  if (!start && !end) return 'Always'
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  if (start && end) return `${fmt(start)} → ${fmt(end)}`
  if (start) return `From ${fmt(start)}`
  return `Until ${fmt(end!)}`
}

export function isDiscountLiveNow(row: TestDiscountListRow, now = new Date()): boolean {
  if (!row.is_active) return false
  if (row.start_date && now < new Date(row.start_date)) return false
  if (row.end_date && now > new Date(row.end_date)) return false
  return true
}

export async function fetchAllDiscounts(params?: FetchDiscountsParams): Promise<TestDiscountListRow[]> {
  const res = await apiFetch(`/api/discounts${toQuery(params)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeDiscountRow(row))
}

export async function upsertTestDiscount(body: DiscountUpsertBody): Promise<unknown> {
  const res = await apiFetch('/api/discounts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

/** `POST /api/discounts/bulk` — upsert many test/role rows in one request. */
export async function bulkUpsertTestDiscounts(body: DiscountBulkUpsertBody): Promise<unknown> {
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
