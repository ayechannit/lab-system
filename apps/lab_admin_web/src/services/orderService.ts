import { getApiBaseUrl } from './apiBase'
import { readApiErrorBody } from './readApiError'

function ordersBasePath(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return `${base}/api/orders`
}

export type ApiOrderStatus = 'pending' | 'scheduled' | 'collecting' | 'running' | 'completed' | 'delivered'

export type ApiOrderListRow = {
  id: string
  user_id: string
  description: string
  priority: 'urgent' | 'elective'
  patient_name: string
  patient_age: number
  patient_phone: string
  address: string
  latitude: number | null
  longitude: number | null
  status: ApiOrderStatus
  original_price_mmk: number
  discount_percent: number
  final_price_mmk: number
  is_deleted: boolean
  created_at: string
  updated_at?: string
}

export type ApiOrderItem = {
  id?: string
  order_id?: string
  test_id: string
  quantity: number
  unit_price_mmk: number
  subtotal_mmk: number
}

export type ApiOrderDetail = ApiOrderListRow & {
  items: ApiOrderItem[]
  schedule: Record<string, unknown> | null
  payments: Array<Record<string, unknown>>
  total_paid_mmk?: number
  balance_mmk?: number
}

export type OrderCreateBody = {
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
  original_price_mmk: number
  discount_percent?: number
  final_price_mmk: number
  items: ApiOrderItem[]
}

export type OrderStatusUpdateBody = {
  status: ApiOrderStatus
  staff_id: string
  note?: string | null
}

function toNum(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

function toInt(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.parseInt(String(v), 10)
  return Number.isFinite(n) ? n : 0
}

function toBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 1 || v === '1') return true
  if (v === 0 || v === '0') return false
  return Boolean(v)
}

function normalizeOrderListRow(parsed: unknown): ApiOrderListRow | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  const id = o.id != null && String(o.id) !== '' ? String(o.id) : null
  const userId = o.user_id != null && String(o.user_id) !== '' ? String(o.user_id) : null
  if (!id || !userId) return null
  const status = String(o.status ?? 'pending') as ApiOrderStatus
  return {
    id,
    user_id: userId,
    description: typeof o.description === 'string' ? o.description : '',
    priority: (o.priority === 'urgent' ? 'urgent' : 'elective'),
    patient_name: typeof o.patient_name === 'string' ? o.patient_name : '',
    patient_age: toInt(o.patient_age),
    patient_phone: typeof o.patient_phone === 'string' ? o.patient_phone : '',
    address: typeof o.address === 'string' ? o.address : '',
    latitude: o.latitude == null ? null : toNum(o.latitude),
    longitude: o.longitude == null ? null : toNum(o.longitude),
    status,
    original_price_mmk: toNum(o.original_price_mmk),
    discount_percent: toNum(o.discount_percent),
    final_price_mmk: toNum(o.final_price_mmk),
    is_deleted: toBool(o.is_deleted),
    created_at: typeof o.created_at === 'string' ? o.created_at : new Date().toISOString(),
    ...(typeof o.updated_at === 'string' ? { updated_at: o.updated_at } : {}),
  }
}

function normalizeOrderItem(parsed: unknown): ApiOrderItem | null {
  if (!parsed || typeof parsed !== 'object') return null
  const o = parsed as Record<string, unknown>
  const testId = o.test_id != null && String(o.test_id) !== '' ? String(o.test_id) : null
  if (!testId) return null
  return {
    ...(o.id != null ? { id: String(o.id) } : {}),
    ...(o.order_id != null ? { order_id: String(o.order_id) } : {}),
    test_id: testId,
    quantity: Math.max(1, toInt(o.quantity)),
    unit_price_mmk: toNum(o.unit_price_mmk),
    subtotal_mmk: toNum(o.subtotal_mmk),
  }
}

export async function fetchOrders(): Promise<ApiOrderListRow[]> {
  const res = await fetch(ordersBasePath())
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data: unknown = await res.json()
  if (!Array.isArray(data)) return []
  const out: ApiOrderListRow[] = []
  for (const item of data) {
    const row = normalizeOrderListRow(item)
    if (row) out.push(row)
  }
  return out
}

export async function fetchOrderById(id: string): Promise<ApiOrderDetail | null> {
  const res = await fetch(`${ordersBasePath()}/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data: unknown = await res.json()
  const base = normalizeOrderListRow(data)
  if (!base) return null
  const obj = data as Record<string, unknown>
  const itemsRaw = Array.isArray(obj.items) ? obj.items : []
  const items: ApiOrderItem[] = []
  for (const item of itemsRaw) {
    const next = normalizeOrderItem(item)
    if (next) items.push(next)
  }
  const schedule =
    obj.schedule && typeof obj.schedule === 'object' && !Array.isArray(obj.schedule)
      ? (obj.schedule as Record<string, unknown>)
      : null
  const payments = Array.isArray(obj.payments)
    ? obj.payments.filter((x): x is Record<string, unknown> => Boolean(x && typeof x === 'object'))
    : []
  return {
    ...base,
    items,
    schedule,
    payments,
    ...(obj.total_paid_mmk != null ? { total_paid_mmk: toNum(obj.total_paid_mmk) } : {}),
    ...(obj.balance_mmk != null ? { balance_mmk: toNum(obj.balance_mmk) } : {}),
  }
}

export async function createOrder(body: OrderCreateBody): Promise<ApiOrderListRow> {
  const res = await fetch(ordersBasePath(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeOrderListRow(await res.json())
  if (!row) throw new Error('Invalid order response from server')
  return row
}

export async function updateOrderStatus(id: string, body: OrderStatusUpdateBody): Promise<ApiOrderListRow> {
  const res = await fetch(`${ordersBasePath()}/${encodeURIComponent(id)}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const row = normalizeOrderListRow(await res.json())
  if (!row) throw new Error('Invalid order response from server')
  return row
}

export async function deleteOrder(id: string): Promise<void> {
  const res = await fetch(`${ordersBasePath()}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
