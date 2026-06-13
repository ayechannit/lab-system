import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'
import type { ApiOrderStatus } from './orderService'

export type RatingOrderTest = {
  test_name?: string | null
  test_code?: string | null
}

export type RatingListRow = {
  id: string
  order_id: string
  rating: number
  remark: string | null
  created_at: string
  user_name?: string
  user_email?: string
  user_phone?: string
  user_role?: string
  patient_name?: string
  patient_age?: number | null
  order_status?: ApiOrderStatus
  priority?: 'urgent' | 'elective' | string
  final_price_mmk?: number
  order_created_at?: string
  order_tests: RatingOrderTest[]
}

function parseOrderTests(raw: unknown): RatingOrderTest[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    if (!item || typeof item !== 'object') return {}
    const row = item as Record<string, unknown>
    return {
      test_name: row.test_name != null ? String(row.test_name) : null,
      test_code: row.test_code != null ? String(row.test_code) : null,
    }
  })
}

export async function fetchAllRatings(): Promise<RatingListRow[]> {
  const res = await apiFetch('/api/ratings')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    id: String(raw.id),
    order_id: String(raw.order_id ?? ''),
    rating: Number(raw.rating ?? 0),
    remark: raw.remark != null ? String(raw.remark) : null,
    created_at: String(raw.created_at ?? ''),
    user_name: raw.user_name != null ? String(raw.user_name) : undefined,
    user_email: raw.user_email != null ? String(raw.user_email) : undefined,
    user_phone: raw.user_phone != null ? String(raw.user_phone) : undefined,
    user_role:
      raw.user_role != null
        ? String(raw.user_role)
        : raw.role != null
          ? String(raw.role)
          : undefined,
    patient_name: raw.patient_name != null ? String(raw.patient_name) : undefined,
    patient_age:
      raw.patient_age != null && Number.isFinite(Number(raw.patient_age))
        ? Number(raw.patient_age)
        : null,
    order_status: raw.order_status != null ? (String(raw.order_status) as ApiOrderStatus) : undefined,
    priority: raw.priority != null ? String(raw.priority) : undefined,
    final_price_mmk:
      raw.final_price_mmk != null && Number.isFinite(Number(raw.final_price_mmk))
        ? Number(raw.final_price_mmk)
        : undefined,
    order_created_at: raw.order_created_at != null ? String(raw.order_created_at) : undefined,
    order_tests: parseOrderTests(raw.order_tests),
  }))
}

export function formatRatingSubmittedDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString()
}

export function formatShortOrderId(orderId: string): string {
  const id = orderId.trim()
  if (!id) return '—'
  if (id.length <= 8) return id.toUpperCase()
  return `${id.slice(0, 8).toUpperCase()}…`
}

export function formatRatingTests(tests: RatingOrderTest[]): string {
  if (!tests.length) return '—'
  const names = tests
    .map((t) => t.test_name?.trim() || t.test_code?.trim() || '')
    .filter(Boolean)
  if (!names.length) return '—'
  const shown = names.slice(0, 2)
  const more = names.length - shown.length
  return more > 0 ? `${shown.join(', ')} +${more}` : shown.join(', ')
}

export function formatRatingContact(row: RatingListRow): string {
  const phone = row.user_phone?.trim()
  const email = row.user_email?.trim()
  if (phone && email) return `${phone} · ${email}`
  return phone || email || '—'
}
