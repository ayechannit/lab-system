import type { StaffListRow } from '../model/types'

/** Active staff with role `collector` for route assignment. */
export function collectorRoleStaffList(st: StaffListRow[]): StaffListRow[] {
  return st.filter((s) => !s.is_deleted && s.is_active && s.role === 'collector')
}

/** Any active staff for schedule pickers (not limited to Collector role). */
export function collectorStaffDropdownList(st: StaffListRow[]): StaffListRow[] {
  const active = st.filter((s) => !s.is_deleted && s.is_active)
  return active.length > 0 ? active : st.filter((s) => !s.is_deleted)
}

export const COLLECTOR_OTHER_VALUE = '__other__'
