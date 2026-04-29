export type StaffRole = 'admin' | 'lab_technician' | 'reception' | 'manager'

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

export type DiscountAppliesTo = 'doctor' | 'clinic' | 'patient' | 'reception'

export interface DiscountRule {
  id: string
  label: string
  percent: number
  appliesTo: DiscountAppliesTo
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
