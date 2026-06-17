import type { StaffListRow, StaffRole } from '../model/types'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

function normalizeStaffRow(raw: Record<string, unknown>): StaffListRow {
  const profileImage = raw.profile_image_url
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role: raw.role as StaffRole,
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    profile_image_url:
      profileImage == null || profileImage === '' ? null : String(profileImage),
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

export type StaffCreateBody = {
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  password_hash: string
}

export type StaffUpdateBody = {
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  password_hash?: string
}

export type FetchStaffListParams = {
  role?: StaffRole
  name?: string
  is_active?: boolean
  page?: number
  limit?: number
}

export async function fetchStaffById(id: string): Promise<StaffListRow> {
  const res = await apiFetch(`/api/staff/${encodeURIComponent(id)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as Record<string, unknown>
  return normalizeStaffRow({ ...raw, is_deleted: raw.is_deleted ?? false })
}

export async function fetchStaffList(params?: FetchStaffListParams): Promise<StaffListRow[]> {
  const sp = new URLSearchParams()
  if (params?.role) sp.set('role', params.role)
  if (params?.name?.trim()) sp.set('name', params.name.trim())
  if (params?.is_active !== undefined) sp.set('is_active', params.is_active ? 'true' : 'false')
  if (params?.page != null && params.page > 0) sp.set('page', String(params.page))
  if (params?.limit != null && params.limit > 0) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  const res = await apiFetch(`/api/staff${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeStaffRow({ ...row, is_deleted: row.is_deleted ?? false }))
}

export async function createStaff(body: StaffCreateBody): Promise<StaffListRow> {
  const res = await apiFetch('/api/staff', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as Record<string, unknown>
  return normalizeStaffRow({ ...raw, is_deleted: false })
}

export async function updateStaff(id: string, body: StaffUpdateBody): Promise<StaffListRow> {
  const res = await apiFetch(`/api/staff/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as Record<string, unknown>
  return normalizeStaffRow({ ...raw, is_deleted: raw.is_deleted ?? false })
}

export async function deleteStaff(id: string): Promise<void> {
  const res = await apiFetch(`/api/staff/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function uploadStaffProfileImage(id: string, file: File): Promise<StaffListRow> {
  const fd = new FormData()
  fd.append('image', file)
  const res = await apiFetch(`/api/staff/${encodeURIComponent(id)}/profile-image`, {
    method: 'POST',
    body: fd,
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const payload = (await res.json()) as Record<string, unknown>
  const staff = payload.staff
  if (staff && typeof staff === 'object') {
    return normalizeStaffRow({ ...(staff as Record<string, unknown>), is_deleted: false })
  }
  return fetchStaffById(id)
}
