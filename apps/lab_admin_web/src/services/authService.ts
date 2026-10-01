import { apiFetch, apiUrl } from './apiClient'
import { readApiErrorBody } from './readApiError'
import type { StoredAccount } from './authSession'

export type StaffLoginResponse = {
  token: string
  staff: { id: string; name: string; email: string | null; staff_code: string | null; role: string }
}

const STAFF_ROLES = new Set(['admin', 'lab_technician', 'reception', 'manager', 'collector'])

function accountFromMePayload(raw: Record<string, unknown>): StoredAccount {
  const role = String(raw.role ?? '')
  const type = STAFF_ROLES.has(role) ? 'staff' : 'user'
  return {
    type,
    id: String(raw.id),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    staff_code: String(raw.staff_code ?? ''),
    role,
  }
}

/** `identifier` is the staff member's email or staff code. */
export async function loginStaff(
  identifier: string,
  password: string,
  remember = false,
): Promise<StaffLoginResponse> {
  const res = await fetch(apiUrl('/api/auth/login/staff'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password, remember }),
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
