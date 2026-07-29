import type { StaffRole } from '../model/types'
import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

/** Staff roles that can be granted per-module permissions. `admin` always has full access, hardcoded. */
export type ConfigurableStaffRole = Exclude<StaffRole, 'admin'>

export type PermissionMatrix = Record<StaffRole, Record<string, boolean>>

export type PermissionMatrixResponse = {
  modules: string[]
  roles: ConfigurableStaffRole[]
  matrix: PermissionMatrix
}

export type PermissionMatrixEntry = {
  role: ConfigurableStaffRole
  module_key: string
  is_allowed: boolean
}

export async function fetchMyPermissions(): Promise<string[]> {
  const res = await apiFetch('/api/permissions/me')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as { modules?: unknown }
  return Array.isArray(raw.modules) ? raw.modules.map(String) : []
}

export async function fetchPermissionMatrix(): Promise<PermissionMatrixResponse> {
  const res = await apiFetch('/api/permissions')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as PermissionMatrixResponse
}

export async function updatePermissionMatrix(
  entries: PermissionMatrixEntry[],
): Promise<PermissionMatrixResponse> {
  const res = await apiFetch('/api/permissions', {
    method: 'PUT',
    body: JSON.stringify({ entries }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as PermissionMatrixResponse
}
