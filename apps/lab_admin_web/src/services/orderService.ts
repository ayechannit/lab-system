import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type ApiOrderStatus =
  | 'pending'
  | 'scheduled'
  | 'collecting'
  | 'running'
  | 'completed'
  | 'delivered'

export type ApiOrderListRow = {
  id: string
  patient_name: string
  patient_phone?: string
  address?: string
  priority: 'urgent' | 'elective'
  status: ApiOrderStatus
  original_price_mmk: number
  final_price_mmk: number
  created_at: string
}

export type ApiOrderDetailItem = {
  test_id: string
  quantity: number
  unit_price_mmk: number
  subtotal_mmk: number
  result_file_url?: string | null
  download_url?: string | null
}

export type ApiOrderDetail = {
  id: string
  patient_name: string
  patient_phone: string
  patient_age?: number
  priority: 'urgent' | 'elective'
  status: ApiOrderStatus
  address: string
  original_price_mmk: number
  discount_percent: number
  final_price_mmk: number
  created_at: string
  updated_at?: string
  total_paid_mmk?: number
  balance_mmk?: number
  items: ApiOrderDetailItem[]
}

export type ApiOrderCreateItem = {
  test_id: string
  quantity: number
  unit_price_mmk: number
  subtotal_mmk: number
}

export type ApiOrderCreateBody = {
  user_id: string
  description?: string | null
  priority: 'urgent' | 'elective'
  patient_name: string
  patient_age: number
  patient_phone: string
  address: string
  latitude?: number | null
  longitude?: number | null
  status?: ApiOrderStatus
  report_delivery_method?: string
  original_price_mmk: number
  discount_percent: number
  final_price_mmk: number
  items: ApiOrderCreateItem[]
}

export async function fetchOrders(): Promise<ApiOrderListRow[]> {
  const res = await apiFetch('/api/orders')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = await res.json()
  return Array.isArray(data) ? (data as ApiOrderListRow[]) : []
}

export async function fetchOrderById(id: string): Promise<ApiOrderDetail | null> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as ApiOrderDetail
}

export async function createOrder(body: ApiOrderCreateBody): Promise<unknown> {
  const payload = {
    report_delivery_method: 'email',
    ...body,
  }
  const res = await apiFetch('/api/orders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function updateOrderStatus(
  id: string,
  body: { status: ApiOrderStatus; staff_id: string; note?: string | null },
): Promise<unknown> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function uploadOrderTestResult(orderId: string, testId: string, file: File): Promise<unknown> {
  const fd = new FormData()
  fd.append('file', file)
  const res = await apiFetch(
    `/api/orders/${encodeURIComponent(orderId)}/tests/${encodeURIComponent(testId)}/upload-result`,
    { method: 'POST', body: fd },
  )
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}
