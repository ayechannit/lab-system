export type StaffRole = 'admin' | 'lab_technician' | 'reception' | 'manager' | 'collector'

/** Role stored in the admin session after login. */
export type SessionRole = StaffRole

export interface StaffListRow {
  id: string
  name: string
  email: string
  role: StaffRole
  is_active: boolean
  is_deleted: boolean
  profile_image_url: string | null
  created_at: string
  updated_at: string
}

export interface UserListRow {
  id: string
  name: string
  phone: string
  address: string
  latitude: number
  longitude: number
  total_points: number
  total_spent_mmk: number
  tier_name: string
  tier_discount_percent: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/** Row for lab catalog UI: core fields from `GET /api/tests`. */
export interface LabTestCatalogRow {
  id: string
  test_name: string
  test_code: string
  description: string | null
  base_price_mmk: number
  category: string | null
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at?: string
  discount_percent?: number | null
  discounted_price_mmk?: number | null
}
