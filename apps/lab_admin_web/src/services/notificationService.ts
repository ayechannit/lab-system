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

export async function fetchNotifications(limit = 50): Promise<AppNotification[]> {
  const res = await apiFetch(`/api/notifications?limit=${limit}`)
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return res.json()
}

export async function markNotificationAsRead(id: string): Promise<void> {
  const res = await apiFetch(`/api/notifications/${id}/read`, {
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

export async function registerFcmToken(token: string): Promise<void> {
  const res = await apiFetch(`/api/users/fcm-token`, {
    method: 'PUT',
    body: JSON.stringify({ fcm_token: token }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}
