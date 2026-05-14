export type StaffRole = 'admin' | 'lab_technician' | 'reception' | 'manager'

/** End-user roles for `POST /api/users` (`users.role`). */
export type EndUserRole = 'clinic' | 'doctor' | 'patient'

/** Role stored in the admin session after login. */
export type SessionRole = StaffRole | EndUserRole

export interface StaffListRow {
  id: string
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export interface UserListRow {
  id: string
  name: string
  email: string
  phone: string
  role: EndUserRole
  address: string
  latitude: number
  longitude: number
  total_points: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/** Row for lab catalog UI: core fields from `GET /api/tests`; discount columns from each row’s `discounts` array (see service). */
export interface LabTestCatalogRow {
  id: string
  test_name: string
  test_code: string
  description: string | null
  base_price_mmk: number
  category: string | null
  is_active: boolean
  is_deleted: boolean
  /** Highest `discount_percent` among nested discounts on GET /api/tests (embedded array). */
  discount_percent: number
  /** Base price after `discount_percent`. */
  discounted_price_mmk: number
  created_at: string
  updated_at?: string
}
