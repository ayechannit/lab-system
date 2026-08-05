import type { LabTestCatalogRow } from '../model/types'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type FetchLabTestsQueryParams = {
  category?: string
  is_active?: boolean
  test_name?: string
  test_code?: string
  page?: number
  limit?: number
}

export type LabTestWriteBody = {
  test_name: string
  test_code: string
  description: string | null
  base_price_mmk: number
  category: string | null
  is_active: boolean
}

function searchParamsFromQuery(query: FetchLabTestsQueryParams): string {
  const p = new URLSearchParams()
  if (query.category) p.set('category', query.category)
  if (query.is_active !== undefined) p.set('is_active', String(query.is_active))
  if (query.test_name) p.set('test_name', query.test_name)
  if (query.test_code) p.set('test_code', query.test_code)
  if (query.page != null) p.set('page', String(query.page))
  if (query.limit != null) p.set('limit', String(query.limit))
  const s = p.toString()
  return s ? `?${s}` : ''
}

function toCatalogRow(t: Record<string, unknown>): LabTestCatalogRow {
  const base = Number(t.base_price_mmk ?? 0)
  return {
    id: String(t.id),
    test_name: String(t.test_name ?? ''),
    test_code: String(t.test_code ?? ''),
    description: t.description != null ? String(t.description) : null,
    base_price_mmk: base,
    category: t.category != null ? String(t.category) : null,
    is_active: Boolean(t.is_active),
    is_deleted: Boolean(t.is_deleted),
    created_at: String(t.created_at ?? ''),
    updated_at: t.updated_at != null ? String(t.updated_at) : undefined,
    discount_percent: t.discount_percent != null ? Number(t.discount_percent) : null,
    discounted_price_mmk: t.discounted_price_mmk != null ? Number(t.discounted_price_mmk) : null,
  }
}

export async function fetchLabTestsList(query: FetchLabTestsQueryParams = {}): Promise<LabTestCatalogRow[]> {
  const res = await apiFetch(`/api/tests${searchParamsFromQuery(query)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return (data as Record<string, unknown>[]).map((row) => toCatalogRow(row))
}

export async function deleteLabTest(id: string): Promise<void> {
  const res = await apiFetch(`/api/tests/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function createLabTest(body: LabTestWriteBody): Promise<LabTestCatalogRow> {
  const res = await apiFetch('/api/tests', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return toCatalogRow((await res.json()) as Record<string, unknown>)
}

export async function updateLabTest(id: string, body: LabTestWriteBody): Promise<LabTestCatalogRow> {
  const res = await apiFetch(`/api/tests/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return toCatalogRow((await res.json()) as Record<string, unknown>)
}
