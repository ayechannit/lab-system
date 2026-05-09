import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function ratingsBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/ratings`
}

/** Row from GET /api/ratings (RatingWithDetails in Swagger). */
export type RatingListRow = {
  id: string
  order_id: string
  user_id: string
  rating: number
  remark: string | null
  created_at: string
  user_name?: string
  user_email?: string
  user_phone?: string
  user_role?: string
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

export function normalizeRatingListRow(parsed: unknown): RatingListRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  const id = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const order_id = o.order_id != null && String(o.order_id) !== '' ? String(o.order_id) : null
  const user_id = o.user_id != null && String(o.user_id) !== '' ? String(o.user_id) : null
  if (!id || !order_id || !user_id) return null
  const rating = Math.min(5, Math.max(1, toNum(o.rating)))
  const remark =
    o.remark == null || o.remark === '' ? null : typeof o.remark === 'string' ? o.remark : String(o.remark)
  const created_at =
    typeof o.created_at === 'string' && o.created_at !== '' ? o.created_at : new Date(0).toISOString()
  return {
    id,
    order_id,
    user_id,
    rating,
    remark,
    created_at,
    ...(typeof o.user_name === 'string' ? { user_name: o.user_name } : {}),
    ...(typeof o.user_email === 'string' ? { user_email: o.user_email } : {}),
    ...(typeof o.user_phone === 'string' ? { user_phone: o.user_phone } : {}),
    ...(typeof o.user_role === 'string' ? { user_role: o.user_role } : {}),
  }
}

export function normalizeRatingListRows(parsed: unknown): RatingListRow[] {
  if (!Array.isArray(parsed)) return []
  const out: RatingListRow[] = []
  for (const item of parsed) {
    const row = normalizeRatingListRow(item)
    if (row) out.push(row)
  }
  return out
}

/** Format API `created_at` as YYYY-MM-DD for the admin table. */
export function formatRatingSubmittedDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** GET /api/ratings — all order ratings with user / order context (Swagger tag Ratings). */
export async function fetchAllRatings(): Promise<RatingListRow[]> {
  const res = await fetch(ratingsBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRatingListRows(await res.json())
}
