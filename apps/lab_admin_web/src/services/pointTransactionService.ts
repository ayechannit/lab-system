import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type PointTransactionType = 'earn' | 'redeem' | 'adjustment'

export type PointTransactionRow = {
  id: string
  user_id: string
  points: number
  transaction_type: PointTransactionType | string
  description: string | null
  reference_id: string | null
  user_name?: string
  user_phone?: string
  created_at?: string
}

export type FetchPointTransactionsParams = {
  user_id?: string
  transaction_type?: PointTransactionType | ''
}

function normalizeRow(raw: Record<string, unknown>): PointTransactionRow {
  return {
    id: String(raw.id),
    user_id: String(raw.user_id ?? ''),
    points: Number(raw.points ?? 0),
    transaction_type: String(raw.transaction_type ?? ''),
    description: raw.description != null ? String(raw.description) : null,
    reference_id: raw.reference_id != null ? String(raw.reference_id) : null,
    user_name: raw.user_name != null ? String(raw.user_name) : undefined,
    user_phone: raw.user_phone != null ? String(raw.user_phone) : undefined,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
  }
}

function toQuery(params?: FetchPointTransactionsParams): string {
  if (!params) return ''
  const q = new URLSearchParams()
  if (params.user_id) q.set('user_id', params.user_id)
  if (params.transaction_type) q.set('transaction_type', params.transaction_type)
  const s = q.toString()
  return s ? `?${s}` : ''
}

export async function fetchPointTransactions(
  params?: FetchPointTransactionsParams,
): Promise<PointTransactionRow[]> {
  const res = await apiFetch(`/api/point-transactions${toQuery(params)}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}
