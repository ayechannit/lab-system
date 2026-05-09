import type { StaffListRow, StaffRole } from './types'

const ROLES: StaffRole[] = ['admin', 'lab_technician', 'reception', 'manager']

function isStaffRole(v: unknown): v is StaffRole {
  return typeof v === 'string' && (ROLES as string[]).includes(v)
}

function isoFromUnknown(v: unknown, fallback: string): string {
  if (typeof v === 'string' && v) return v
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString()
  return fallback
}

function fromApiShape(o: Record<string, unknown>): StaffListRow | null {
  if (!('name' in o) || typeof o.name !== 'string' || !o.name.trim()) return null
  if (!('email' in o) || typeof o.email !== 'string') return null
  const role: StaffRole = isStaffRole(o.role) ? o.role : 'lab_technician'

  const idRaw = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const id =
    idRaw ??
    (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `staff-${Date.now()}`)

  const now = new Date().toISOString()
  return {
    id,
    name: o.name as string,
    email: String(o.email),
    password_hash: typeof o.password_hash === 'string' ? o.password_hash : '',
    role,
    is_active: o.is_active === undefined || o.is_active === null ? true : Boolean(o.is_active),
    is_deleted: Boolean(o.is_deleted),
    created_at: isoFromUnknown(o.created_at, now),
    updated_at: isoFromUnknown(o.updated_at, now),
  }
}

/** Normalizes one staff object from `GET/POST/PUT /api/staff` (Swagger `Staff` schema). */
export function normalizeStaffRow(parsed: unknown): StaffListRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  return fromApiShape(parsed as Record<string, unknown>)
}

/** Parses API JSON array of lab staff rows. */
export function normalizeStaffListRows(parsed: unknown): StaffListRow[] {
  if (!Array.isArray(parsed)) return []
  const out: StaffListRow[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const row = fromApiShape(item as Record<string, unknown>)
    if (row?.id) out.push(row)
  }
  return out
}
