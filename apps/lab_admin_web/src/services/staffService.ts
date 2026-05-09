import { normalizeStaffListRows, normalizeStaffRow } from '../mock-data/staffApi'
import type { StaffListRow, StaffRole } from '../mock-data/types'
import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function staffBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/staff`
}

/** Request body for `POST /api/staff`. */
export type StaffCreateBody = {
  name: string
  email: string
  password_hash: string
  role: StaffRole
  is_active: boolean
}

/** Request body for `PUT /api/staff/:id` (password optional). */
export type StaffUpdateBody = {
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  password_hash?: string
}

export async function fetchStaffList(): Promise<StaffListRow[]> {
  const res = await fetch(staffBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data: unknown = await res.json()
  return normalizeStaffListRows(data)
}

export async function fetchStaffById(id: string): Promise<StaffListRow | null> {
  const res = await fetch(`${staffBasePath()}/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeStaffRow(await res.json())
}

export async function createStaff(body: StaffCreateBody): Promise<StaffListRow> {
  const res = await fetch(staffBasePath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeStaffRow(await res.json())
  if (!row) throw new Error('Invalid staff response from server')
  return row
}

export async function updateStaff(id: string, body: StaffUpdateBody): Promise<StaffListRow> {
  const res = await fetch(`${staffBasePath()}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeStaffRow(await res.json())
  if (!row) throw new Error('Invalid staff response from server')
  return row
}

export async function deleteStaff(id: string): Promise<void> {
  const res = await fetch(`${staffBasePath()}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
