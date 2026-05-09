import { normalizeUserListRows, normalizeUserRow } from '../mock-data/usersApi'
import type { EndUserRole, UserListRow } from '../mock-data/types'
import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function usersBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/users`
}

/** Body for `POST /api/users` (password required). */
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

/** Body for `PUT /api/users/:id` (password optional). */
export type UserUpdateBody = {
  name: string
  email: string
  phone: string
  role: EndUserRole
  address?: string | null
  latitude?: number | null
  longitude?: number | null
  total_points?: number
  password_hash?: string
}

export async function fetchUserList(): Promise<UserListRow[]> {
  const res = await fetch(usersBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeUserListRows(await res.json())
}

export async function createUser(body: UserCreateBody): Promise<UserListRow> {
  const res = await fetch(usersBasePath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeUserRow(await res.json())
  if (!row) throw new Error('Invalid user response from server')
  return row
}

export async function updateUser(id: string, body: UserUpdateBody): Promise<UserListRow> {
  const res = await fetch(`${usersBasePath()}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeUserRow(await res.json())
  if (!row) throw new Error('Invalid user response from server')
  return row
}

export async function deleteUser(id: string): Promise<void> {
  const res = await fetch(`${usersBasePath()}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
