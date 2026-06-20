import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'
import type { ApiPayment } from './paymentService'
import type { ApiOrderSchedule } from './scheduleService'

export type ApiOrderStatus =
  | 'pending'
  | 'scheduled'
  | 'collecting'
  | 'running'
  | 'completed'
  | 'delivered'

export type ApiOrderDetailItem = {
  id?: string
  test_id: string
  quantity: number
  unit_price_mmk: number
  subtotal_mmk: number
  test_name?: string | null
  test_code?: string | null
  result_file_url?: string | null
  download_url?: string | null
  ai_verdict?: string | null
  ai_raw_response?: string | null
}

export type ApiOrderListRow = {
  id: string
  user_id?: string
  patient_name: string
  patient_phone?: string
  address?: string
  latitude?: number | null
  longitude?: number | null
  priority: 'urgent' | 'elective'
  status: ApiOrderStatus
  original_price_mmk: number
  final_price_mmk: number
  created_at: string
  prescription_url?: string | null
  is_tests_assigned?: boolean | number | null
  report_delivery_method?: string
  items?: ApiOrderDetailItem[]
}

function normalizeOrderItems(raw: unknown): ApiOrderDetailItem[] {
  if (raw == null) return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed.map((row) => {
    const it = row as ApiOrderDetailItem
    return {
      test_id: it.test_id,
      quantity: Number(it.quantity) || 1,
      unit_price_mmk: Number(it.unit_price_mmk) || 0,
      subtotal_mmk: Number(it.subtotal_mmk) || 0,
      id: it.id,
      test_name: it.test_name ?? null,
      test_code: it.test_code ?? null,
      result_file_url: it.result_file_url ?? null,
      download_url: it.download_url ?? null,
      ai_verdict: it.ai_verdict ?? null,
      ai_raw_response: it.ai_raw_response ?? null,
    }
  })
}

function normalizePayments(raw: unknown): ApiPayment[] {
  if (raw == null) return []
  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []
  return parsed as ApiPayment[]
}

function normalizeOrderDetail(raw: Record<string, unknown>): ApiOrderDetail {
  return {
    ...(raw as ApiOrderDetail),
    items: normalizeOrderItems(raw.items),
    payments: normalizePayments(raw.payments),
    total_paid_mmk: raw.total_paid_mmk != null ? Number(raw.total_paid_mmk) : undefined,
    balance_mmk: raw.balance_mmk != null ? Number(raw.balance_mmk) : undefined,
  }
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
  latitude?: number | null
  longitude?: number | null
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
  payments?: ApiPayment[]
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
  if (!Array.isArray(data)) return []
  return data.map((row) => {
    const o = row as ApiOrderListRow
    return { ...o, items: normalizeOrderItems(o.items) }
  })
}

export async function fetchOrderById(id: string): Promise<ApiOrderDetail | null> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as Record<string, unknown>
  return normalizeOrderDetail(raw)
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

export type ApiOrderUpdateBody = {
  description?: string | null
  priority: 'urgent' | 'elective'
  patient_name: string
  patient_age: number
  patient_phone: string
  address: string
  latitude?: number | null
  longitude?: number | null
}

export type ApiOrderPendingSyncItem = {
  test_id: string
  quantity: number
  unit_price_mmk?: number
  subtotal_mmk?: number
}

export type ApiOrderPendingSyncBody = ApiOrderUpdateBody & {
  original_price_mmk: number
  discount_percent: number
  final_price_mmk: number
  items: ApiOrderPendingSyncItem[]
}

export async function updateOrder(id: string, body: ApiOrderUpdateBody): Promise<unknown> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function syncPendingOrder(id: string, body: ApiOrderPendingSyncBody): Promise<ApiOrderDetail> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(id)}/pending-sync`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const raw = (await res.json()) as Record<string, unknown>
  return normalizeOrderDetail(raw)
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

export type BulkUpdateOrderStatusBody = {
  order_ids: string[]
  status: ApiOrderStatus
  staff_id: string
  note?: string | null
}

export type BulkUpdateOrderStatusResult = {
  message: string
  orders: ApiOrderListRow[]
}

export async function bulkUpdateOrderStatus(
  body: BulkUpdateOrderStatusBody,
): Promise<BulkUpdateOrderStatusResult> {
  const res = await apiFetch('/api/orders/bulk-status', {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json() as Promise<BulkUpdateOrderStatusResult>
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

export async function replaceOrderItems(
  orderId: string,
  body: {
    items: ApiOrderCreateItem[]
    original_price_mmk: number
    discount_percent: number
    final_price_mmk: number
  },
): Promise<unknown> {
  const res = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/items`, {
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

export async function saveOrderTestAiReview(
  orderId: string,
  testId: string,
  body: { ai_verdict: string; ai_raw_response: string },
): Promise<unknown> {
  const res = await apiFetch(
    `/api/orders/${encodeURIComponent(orderId)}/tests/${encodeURIComponent(testId)}/ai-review`,
    {
      method: 'POST',
      body: JSON.stringify(body),
    },
  )
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}
