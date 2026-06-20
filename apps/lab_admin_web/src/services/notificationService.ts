import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export interface AppNotification {
  id: string
  user_id: string
  user_type: string
  title: string
  body: string
  data_payload: string | null
  is_read: boolean
  created_at: string
}

export type SendPushNotificationBody = {
  title: string
  body: string
  topic?: string
  token?: string
  data?: Record<string, string | number | boolean>
}

export type SendPushNotificationResult = {
  message: string
  delivery?: {
    inbox_count?: number
    inbox_saved?: boolean
    fcm?: string | null
  }
}

export const NOTIFICATION_TOPIC_OPTIONS = [
  { value: 'staff_notifications', label: 'All staff' },
  { value: 'all_users', label: 'All users' },
  { value: 'patient_notifications', label: 'Patients' },
  { value: 'doctor_notifications', label: 'Doctors' },
  { value: 'clinic_notifications', label: 'Clinics' },
] as const

function normalizeNotification(row: Record<string, unknown>): AppNotification {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.user_id ?? ''),
    user_type: String(row.user_type ?? 'user'),
    title: String(row.title ?? ''),
    body: String(row.body ?? ''),
    data_payload:
      row.data_payload == null
        ? null
        : typeof row.data_payload === 'string'
          ? row.data_payload
          : JSON.stringify(row.data_payload),
    is_read: row.is_read === true || row.is_read === 1,
    created_at: String(row.created_at ?? ''),
  }
}

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const res = await apiFetch(`/api/notifications?limit=${limit}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data.map((row) => normalizeNotification(row as Record<string, unknown>))
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const res = await apiFetch(`/api/notifications/${encodeURIComponent(id)}/read`, {
    method: 'PUT',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const res = await apiFetch(`/api/notifications/read-all`, {
    method: 'PUT',
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function sendPushNotification(
  body: SendPushNotificationBody,
): Promise<SendPushNotificationResult> {
  const res = await apiFetch('/api/notifications/send', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json() as Promise<SendPushNotificationResult>
}

export async function registerFcmToken(token: string): Promise<void> {
  const res = await apiFetch(`/api/users/fcm-token`, {
    method: 'PUT',
    body: JSON.stringify({ fcm_token: token }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
