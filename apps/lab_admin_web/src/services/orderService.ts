import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'
import type { ApiOrderSchedule } from './scheduleService'

export type ApiOrderStatus =
  | 'pending'
  | 'scheduled'
  | 'collecting'
  | 'running'
  | 'completed'
  | 'delivered'

export type ApiOrderListRow = {
  id: string
  user_id?: string
  patient_name: string
  patient_phone?: string
  address?: string
  priority: 'urgent' | 'elective'
  status: ApiOrderStatus
  original_price_mmk: number
  final_price_mmk: number
  created_at: string
  prescription_url?: string | null
  is_tests_assigned?: boolean | number | null
  report_delivery_method?: string
}

export type ApiOrderDetailItem = {
  id?: string
  test_id: string
  quantity: number
  unit_price_mmk: number
  subtotal_mmk: number
  result_file_url?: string | null
  download_url?: string | null
}

export type ApiOrderDetail = {
  id: string
  user_id?: string
  /** From users join on GET /orders/:id (may be null if no user row) */
  ordering_user_name?: string | null
  ordering_user_role?: string | null
  patient_name: string
  patient_phone: string
  patient_age?: number
  priority: 'urgent' | 'elective'
  status: ApiOrderStatus
  address: string
  description?: string | null
  report_delivery_method?: string
  original_price_mmk: number
  discount_percent: number
  final_price_mmk: number
  created_at: string
  updated_at?: string
  total_paid_mmk?: number
  balance_mmk?: number
  prescription_url?: string | null
  prescription_download_url?: string | null
  is_tests_assigned?: boolean | number | null
  items: ApiOrderDetailItem[]
  schedule?: ApiOrderSchedule | null
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

export type FetchOrdersParams = {
  status?: ApiOrderStatus
  priority?: 'urgent' | 'elective'
  patient_name?: string
  is_tests_assigned?: boolean
  page?: number
  limit?: number
}

export async function fetchOrders(params?: FetchOrdersParams): Promise<ApiOrderListRow[]> {
  const sp = new URLSearchParams()
  if (params?.status) sp.set('status', params.status)
  if (params?.priority) sp.set('priority', params.priority)
  if (params?.patient_name?.trim()) sp.set('patient_name', params.patient_name.trim())
  if (params?.is_tests_assigned !== undefined) sp.set('is_tests_assigned', params.is_tests_assigned ? 'true' : 'false')
  if (params?.page != null && params.page > 0) sp.set('page', String(params.page))
  if (params?.limit != null && params.limit > 0) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  const res = await apiFetch(`/api/orders${qs ? `?${qs}` : ''}`)
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

export async function addOrderItems(
  orderId: string,
  body: {
    items: ApiOrderCreateItem[]
    original_price_mmk: number
    discount_percent: number
    final_price_mmk: number
  },
): Promise<unknown> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/items`, {
    method: 'POST',
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
