import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type ApiPaymentStatus = 'pending' | 'received' | 'verified' | 'failed'

export type ApiPaymentMethod = 'cash' | 'bank_transfer' | 'mobile_pay'

export const PAYMENT_STATUS_OPTIONS: ApiPaymentStatus[] = ['pending', 'received', 'verified', 'failed']

export const PAYMENT_METHOD_OPTIONS: { value: ApiPaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'mobile_pay', label: 'Mobile pay' },
]

export type ApiPayment = {
  id: string
  order_id: string
  amount_mmk: number
  status: ApiPaymentStatus
  method?: string | null
  reference_no?: string | null
  verified_by?: string | null
  paid_at?: string | null
  verified_at?: string | null
  created_at?: string
  updated_at?: string
  points_redeemed?: number
  points_value_mmk?: number
}

export type ApiPaymentOrderSummary = {
  summary: {
    total_price: number
    total_paid: number
    balance: number
  }
  history: ApiPayment[]
}

export type ApiPaymentCreateBody = {
  order_id: string
  amount_mmk: number
  method: ApiPaymentMethod
  status?: ApiPaymentStatus
  reference_no?: string | null
  points_redeemed?: number
}

export async function fetchPaymentsByOrderId(orderId: string): Promise<ApiPaymentOrderSummary> {
  const res = await apiFetch(`/api/payments/${encodeURIComponent(orderId)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as ApiPaymentOrderSummary
  return {
    summary: {
      total_price: Number(data.summary?.total_price) || 0,
      total_paid: Number(data.summary?.total_paid) || 0,
      balance: Number(data.summary?.balance) || 0,
    },
    history: Array.isArray(data.history) ? data.history : [],
  }
}

export async function createPayment(body: ApiPaymentCreateBody): Promise<ApiPayment> {
  const res = await apiFetch('/api/payments', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as ApiPayment
}

export async function updatePaymentStatus(
  paymentId: string,
  body: { status: ApiPaymentStatus; staff_id?: string },
): Promise<ApiPayment> {
  const res = await apiFetch(`/api/payments/${encodeURIComponent(paymentId)}/status`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as ApiPayment
}

/** @deprecated Prefer updatePaymentStatus with status `verified` */
export async function verifyPayment(paymentId: string, staffId: string): Promise<ApiPayment> {
  return updatePaymentStatus(paymentId, { status: 'verified', staff_id: staffId })
}
