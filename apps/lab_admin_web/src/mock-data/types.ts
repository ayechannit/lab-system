export type StaffRole = 'admin' | 'lab_technician' | 'reception' | 'manager'

/**
 * `lab_staff` row as returned by the staff API (snake_case JSON).
 * Passwords are hashed on the server; this UI never persists real passwords in localStorage.
 */
export interface StaffListRow {
  id: string
  name: string
  email: string
  password_hash: string
  role: StaffRole
  is_active: boolean
  is_deleted: boolean
  created_at: string
  updated_at: string
}

/** `users.role` in the core schema (clinic / doctor / patient apps). */
export type EndUserRole = 'clinic' | 'doctor' | 'patient'

/**
 * App user row as returned by the users API (`users` table, snake_case JSON).
 */
export interface UserListRow {
  id: string
  name: string
  email: string
  phone: string
  password_hash: string
  role: EndUserRole
  address: string
  latitude: number
  longitude: number
  total_points: number
  is_deleted: boolean
  created_at: string
  updated_at: string
}

export type OrderStatus =
  | 'pending'
  | 'collection'
  | 'testing'
  | 'completed'
  | 'cancelled'

export type PaymentStatus = 'paid' | 'unpaid' | 'partial'

/** Channel the lab test order was received from (mirrors patient / doctor / clinic apps). */
export type OrderSource = 'patient_app' | 'doctor_app' | 'clinic_portal' | 'walk_in'

export interface OrderRow {
  orderId: string
  patientName: string
  patientPhone: string
  testType: string
  orderDate: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  technician?: string
  source: OrderSource
  patientAddress: string
  amountMmk: number
  /** `datetime-local` value for Collection */
  collectionTime: string
  collectingPerson: string
  /** When instruments / workflow are expected to finish (`datetime-local`). */
  labRunningCompleteAt: string
  /** When the signed report should be ready (`datetime-local`). */
  reportOutTime: string
  /** Attached PDF filename (mock). */
  resultPdfFileName: string | null
  /** Demo AI pre-send review: null = not run yet. */
  aiReviewPassed: boolean | null
  aiReviewNotes: string | null
  resultSentToUserApp: boolean
}

export interface FeedbackRow {
  user: string
  userRole: string
  rating: number
  comment: string
  date: string
}

export interface PointsRule {
  mmkSpend: number
  pointsEarned: number
}

export interface UserPointsRow {
  userId: string
  name: string
  role: string
  points: number
}

/**
 * Lab test catalog row as returned by the API (snake_case JSON).
 * `discounted_price_mmk` is typically derived from `base_price_mmk` and `discount_percent`.
 * `updated_at` is included when the backend sends it (optional in payloads that only have `created_at`).
 */
export interface LabTestCatalogRow {
  id: string
  test_name: string
  test_code: string
  description: string
  base_price_mmk: number
  category: string
  is_active: boolean
  is_deleted: boolean
  discount_percent: number
  discounted_price_mmk: number
  created_at: string
  updated_at?: string
}
