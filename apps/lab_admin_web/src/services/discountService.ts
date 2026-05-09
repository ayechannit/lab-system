import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function discountsBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/discounts`
}

export type TestDiscountRow = {
  id: string
  test_id: string
  role: string
  discount_percent: number
  is_active: boolean
  is_deleted: boolean
}

/** Row from GET /api/discounts (joined test_name / test_code per Swagger). */
export type TestDiscountListRow = TestDiscountRow & {
  test_name?: string
  test_code?: string
  created_at?: string
  updated_at?: string
}

export type DiscountUpsertBody = {
  test_id: string
  role: 'clinic' | 'doctor' | 'patient' | 'all'
  discount_percent: number
  is_active?: boolean
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 1 || v === '1') return true
  if (v === 0 || v === '0') return false
  return Boolean(v)
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export function normalizeDiscountListRow(parsed: unknown): TestDiscountListRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  const id = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const test_id = o.test_id != null && String(o.test_id) !== '' ? String(o.test_id) : null
  if (!id || !test_id) return null
  return {
    id,
    test_id,
    role: typeof o.role === 'string' ? o.role : '',
    discount_percent: toNum(o.discount_percent),
    is_active: toBool(o.is_active ?? true),
    is_deleted: toBool(o.is_deleted),
    ...(typeof o.test_name === 'string' ? { test_name: o.test_name } : {}),
    ...(typeof o.test_code === 'string' ? { test_code: o.test_code } : {}),
    ...(typeof o.created_at === 'string' ? { created_at: o.created_at } : {}),
    ...(typeof o.updated_at === 'string' ? { updated_at: o.updated_at } : {}),
  }
}

export function normalizeDiscountListRows(parsed: unknown): TestDiscountListRow[] {
  if (!Array.isArray(parsed)) return []
  const out: TestDiscountListRow[] = []
  for (const item of parsed) {
    const row = normalizeDiscountListRow(item)
    if (row) out.push(row)
  }
  return out
}

/** GET /api/discounts — all test-specific discounts (Swagger tag Discounts). */
export async function fetchAllDiscounts(): Promise<TestDiscountListRow[]> {
  const res = await fetch(discountsBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeDiscountListRows(await res.json())
}

export async function fetchDiscountsForTest(testId: string): Promise<TestDiscountRow[]> {
  const res = await fetch(`${discountsBasePath()}/${encodeURIComponent(testId)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []
  return normalizeDiscountListRows(data).map((r) => ({
    id: r.id,
    test_id: r.test_id,
    role: r.role,
    discount_percent: r.discount_percent,
    is_active: r.is_active,
    is_deleted: r.is_deleted,
  }))
}

/** Upsert discount rows (backend expands `role: 'all'` to clinic, doctor, patient). */
export async function upsertTestDiscount(body: DiscountUpsertBody): Promise<unknown> {
  const res = await fetch(discountsBasePath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

/** DELETE /api/discounts/:id — soft delete (Swagger). */
export async function deleteDiscountById(id: string): Promise<void> {
  const res = await fetch(`${discountsBasePath()}/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
