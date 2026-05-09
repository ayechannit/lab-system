import type { EndUserRole, UserListRow } from './types'

const ROLES: EndUserRole[] = ['clinic', 'doctor', 'patient']

function isEndUserRole(v: unknown): v is EndUserRole {
  return typeof v === 'string' && (ROLES as string[]).includes(v)
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : 0
}

function toInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

function fromApiShape(o: Record<string, unknown>): UserListRow | null {
  if (!('name' in o) || typeof o.name !== 'string' || !o.name.trim()) return null
  if (!('email' in o) || typeof o.email !== 'string') return null

  const role: EndUserRole = isEndUserRole(o.role) ? o.role : 'patient'
  const idRaw = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const id =
    idRaw ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `user-${Date.now()}`)

  const now = new Date().toISOString()
  return {
    id,
    name: o.name as string,
    email: String(o.email).trim(),
    phone: typeof o.phone === 'string' ? o.phone : '',
    password_hash: typeof o.password_hash === 'string' ? o.password_hash : '',
    role,
    address: typeof o.address === 'string' ? o.address : '',
    latitude: toNum(o.latitude),
    longitude: toNum(o.longitude),
    total_points: toInt(o.total_points),
    is_deleted: Boolean(o.is_deleted),
    created_at: typeof o.created_at === 'string' ? o.created_at : now,
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : now,
  }
}

/** Parses a single API user object (e.g. POST/PUT response). */
export function normalizeUserRow(parsed: unknown): UserListRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  return fromApiShape(parsed as Record<string, unknown>)
}

/** Parses API JSON array of app user (`users` table) rows. */
export function normalizeUserListRows(parsed: unknown): UserListRow[] {
  if (!Array.isArray(parsed)) return []
  const out: UserListRow[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const row = fromApiShape(item as Record<string, unknown>)
    if (row?.id) out.push(row)
  }
  return out
}
