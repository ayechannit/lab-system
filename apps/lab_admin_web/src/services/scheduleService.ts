import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type ApiOrderSchedule = {
  id?: string
  order_id?: string
  collecting_person?: string | null
  collection_time?: string | null
  running_time?: string | null
  report_out_time?: string | null
  accepted_by_user?: boolean
}

export type UpsertScheduleBody = {
  order_id: string
  collecting_person?: string | null
  collection_time?: string | null
  running_time?: string | null
  report_out_time?: string | null
  accepted_by_user?: boolean
}

export async function upsertSchedule(body: UpsertScheduleBody): Promise<ApiOrderSchedule> {
  const res = await apiFetch('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return (await res.json()) as ApiOrderSchedule
}
