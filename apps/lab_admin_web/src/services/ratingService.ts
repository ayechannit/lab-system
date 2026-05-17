import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type RatingListRow = {
  id: string
  rating: number
  remark: string | null
  created_at: string
  user_name?: string
  user_role?: string
}

export async function fetchAllRatings(): Promise<RatingListRow[]> {
  const res = await apiFetch('/api/ratings')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((raw) => ({
    id: String(raw.id),
    rating: Number(raw.rating ?? 0),
    remark: raw.remark != null ? String(raw.remark) : null,
    created_at: String(raw.created_at ?? ''),
    user_name: raw.user_name != null ? String(raw.user_name) : undefined,
    user_role:
      raw.user_role != null
        ? String(raw.user_role)
        : raw.role != null
          ? String(raw.role)
          : undefined,
  }))
}

export function formatRatingSubmittedDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString()
}
