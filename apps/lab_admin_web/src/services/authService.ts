import { apiFetch, apiUrl } from './apiClient'
import { readApiErrorBody } from './readApiError'
import type { StoredAccount } from './authSession'

export type StaffLoginResponse = {
  token: string
  staff: { id: string; name: string; email: string; role: string }
}

const STAFF_ROLES = new Set(['admin', 'lab_technician', 'reception', 'manager'])

function accountFromMePayload(raw: Record<string, unknown>): StoredAccount {
  const role = String(raw.role ?? '')
  const type = STAFF_ROLES.has(role) ? 'staff' : 'user'
  return {
    type,
    id: String(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    role,
  }
}

export async function loginStaff(email: string, password: string): Promise<StaffLoginResponse> {
  const res = await fetch(apiUrl('/api/auth/login/staff'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as StaffLoginResponse
}

export async function fetchSessionAccount(): Promise<StoredAccount> {
  const res = await apiFetch('/api/auth/me')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as Record<string, unknown>
  return accountFromMePayload(raw)
}
