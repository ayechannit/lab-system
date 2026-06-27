import { getApiBaseUrl } from './apiBase'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type FetchAdvertisementsParams = {
  is_active?: boolean
  title?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc'
}

export type AdvertisementRow = {
  id: string
  title: string
  description: string | null
  image_url: string | null
  /** Resolved URL for display (from API); storage key stays in image_url. */
  image_display_url?: string | null
  action_url: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  is_deleted: boolean
  created_at?: string
  updated_at?: string
}

export type AdvertisementUpsertBody = {
  title: string
  description: string | null
  image_url: string | null
  action_url: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
}

function toQuery(params?: FetchAdvertisementsParams): string {
  if (!params) return ''
  const q = new URLSearchParams()
  if (params.is_active !== undefined) q.set('is_active', String(params.is_active))
  if (params.title) q.set('title', params.title)
  if (params.page != null) q.set('page', String(params.page))
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.sortBy) q.set('sortBy', params.sortBy)
  if (params.sortOrder) q.set('sortOrder', params.sortOrder)
  const s = q.toString()
  return s ? `?${s}` : ''
}

function normalizeRow(raw: Record<string, unknown>): AdvertisementRow {
  return {
    id: String(raw.id),
    title: String(raw.title ?? ''),
    description: raw.description != null ? String(raw.description) : null,
    image_url: raw.image_url != null ? String(raw.image_url) : null,
    image_display_url:
      raw.image_display_url != null && String(raw.image_display_url).trim()
        ? String(raw.image_display_url)
        : undefined,
    action_url: raw.action_url != null ? String(raw.action_url) : null,
    start_date: raw.start_date != null ? String(raw.start_date) : null,
    end_date: raw.end_date != null ? String(raw.end_date) : null,
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export function isDisplayableAdImageUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  return (
    u.startsWith('data:image/') ||
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('/uploads/') ||
    u.includes('/')
  )
}

export function resolveAdvertisementImageUrl(
  imageUrl: string | null | undefined,
  imageDisplayUrl?: string | null,
): string | null {
  const display = (imageDisplayUrl ?? '').trim()
  if (display) {
    if (display.startsWith('data:') || display.startsWith('http://') || display.startsWith('https://')) {
      return display
    }
    if (display.startsWith('/')) {
      const base = getApiBaseUrl()?.replace(/\/$/, '')
      if (base) return `${base}${display}`
    }
  }

  const u = (imageUrl ?? '').trim()
  if (!u) return null
  if (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) {
    const base = getApiBaseUrl()?.replace(/\/$/, '')
    if (base) return `${base}${u}`
  }
  // Storage key (e.g. advertisements/ad-banner-123.jpeg) — proxy via API to avoid S3 CORS
  const base = getApiBaseUrl()?.replace(/\/$/, '')
  if (base) {
    const segments = u.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
    return `${base}/api/media/${segments}`
  }
  return u
}

export function formatAdSchedulePeriod(start: string | null, end: string | null): string {
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

export function isAdLiveNow(row: AdvertisementRow, now = new Date()): boolean {
  if (!row.is_active) return false
  if (row.start_date && now < new Date(row.start_date)) return false
  if (row.end_date && now > new Date(row.end_date)) return false
  return true
}

export async function fetchAdvertisements(params?: FetchAdvertisementsParams): Promise<AdvertisementRow[]> {
  const res = await apiFetch(`/api/advertisements${toQuery(params)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeRow(row))
}

export async function fetchAdvertisementById(id: string): Promise<AdvertisementRow> {
  const res = await apiFetch(`/api/advertisements/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function createAdvertisement(body: AdvertisementUpsertBody): Promise<AdvertisementRow> {
  const res = await apiFetch('/api/advertisements', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updateAdvertisement(id: string, body: AdvertisementUpsertBody): Promise<AdvertisementRow> {
  const res = await apiFetch(`/api/advertisements/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deleteAdvertisement(id: string): Promise<void> {
  const res = await apiFetch(`/api/advertisements/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function uploadAdvertisementBannerImage(file: File): Promise<{
  image_url: string
  image_display_url?: string
}> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await apiFetch('/api/advertisements/upload-banner', {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const payload = (await res.json()) as Record<string, unknown>
  const url = payload.image_url
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('Upload succeeded but no image URL was returned.')
  }
  return {
    image_url: url.trim(),
    image_display_url:
      payload.image_display_url != null && String(payload.image_display_url).trim()
        ? String(payload.image_display_url)
        : undefined,
  }
}
