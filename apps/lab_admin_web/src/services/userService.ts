import type { EndUserRole, UserListRow } from '../model/types'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type UserCreateBody = {
  name: string
  email: string
  phone: string
  password_hash: string
  role: EndUserRole
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  total_points?: number
}

export type UserUpdateBody = {
  name: string
  email: string
  phone: string
  role: EndUserRole
  address: string
  latitude: number
  longitude: number
  total_points: number
  password_hash?: string
}

function normalizeUserRow(raw: Record<string, unknown>): UserListRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    role: raw.role as EndUserRole,
    address: String(raw.address ?? ''),
    latitude: Number(raw.latitude ?? 0),
    longitude: Number(raw.longitude ?? 0),
    total_points: Number(raw.total_points ?? 0),
    is_deleted: Boolean(raw.is_deleted),
    created_at: String(raw.created_at ?? ''),
    updated_at: String(raw.updated_at ?? ''),
  }
}

/** `POST /api/users` — plain password in `password_hash`; server hashes it. */
export async function createUser(body: UserCreateBody): Promise<unknown> {
  const res = await apiFetch('/api/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export type FetchUserListParams = {
  role?: EndUserRole
  name?: string
  phone?: string
  page?: number
  limit?: number
}

export async function fetchUserList(params?: FetchUserListParams): Promise<UserListRow[]> {
  const sp = new URLSearchParams()
  if (params?.role) sp.set('role', params.role)
  if (params?.name?.trim()) sp.set('name', params.name.trim())
  if (params?.phone?.trim()) sp.set('phone', params.phone.trim())
  if (params?.page != null && params.page > 0) sp.set('page', String(params.page))
  if (params?.limit != null && params.limit > 0) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  const res = await apiFetch(`/api/users${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeUserRow({ ...row, is_deleted: row.is_deleted ?? false }))
}

export async function updateUser(id: string, body: UserUpdateBody): Promise<unknown> {
  const { email: _e, role: _r, total_points: _t, ...rest } = body
  const res = await apiFetch(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(rest),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function deleteUser(id: string): Promise<void> {
  const res = await apiFetch(`/api/users/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
