import type { StaffListRow, StaffRole } from '../model/types'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

function normalizeStaffRow(raw: Record<string, unknown>): StaffListRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role: raw.role as StaffRole,
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
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

export async function fetchStaffList(): Promise<StaffListRow[]> {
  const res = await apiFetch('/api/staff')
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
