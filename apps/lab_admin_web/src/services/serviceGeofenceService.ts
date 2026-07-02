import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type ServiceGeofenceRow = {
  id: string
  name: string
  west_longitude: number
  east_longitude: number
  north_latitude: number
  south_latitude: number
  service_fee_mmk: number
  priority: number
  is_active: boolean
  is_deleted: boolean
  created_user?: string | null
  updated_user?: string | null
  created_at?: string
  updated_at?: string
}

export type ServiceGeofenceUpsertBody = {
  name: string
  west_longitude: number
  east_longitude: number
  north_latitude: number
  south_latitude: number
  service_fee_mmk: number
  priority: number
  is_active: boolean
}

export type CalculateServiceFeeResult = {
  service_geofence_id: string
  zone_name: string
  service_fee_mmk: number
}

function normalizeRow(raw: Record<string, unknown>): ServiceGeofenceRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    west_longitude: Number(raw.west_longitude ?? 0),
    east_longitude: Number(raw.east_longitude ?? 0),
    north_latitude: Number(raw.north_latitude ?? 0),
    south_latitude: Number(raw.south_latitude ?? 0),
    service_fee_mmk: Number(raw.service_fee_mmk ?? 0),
    priority: Number(raw.priority) === 0 ? 0 : 1,
    is_active: Boolean(raw.is_active),
    is_deleted: Boolean(raw.is_deleted),
    created_user: raw.created_user != null ? String(raw.created_user) : null,
    updated_user: raw.updated_user != null ? String(raw.updated_user) : null,
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchServiceGeofences(): Promise<ServiceGeofenceRow[]> {
  const res = await apiFetch('/api/service-geofences')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}

export async function fetchServiceGeofenceById(id: string): Promise<ServiceGeofenceRow | null> {
  const res = await apiFetch(`/api/service-geofences/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function createServiceGeofence(body: ServiceGeofenceUpsertBody): Promise<ServiceGeofenceRow> {
  const res = await apiFetch('/api/service-geofences', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updateServiceGeofence(
  id: string,
  body: ServiceGeofenceUpsertBody,
): Promise<ServiceGeofenceRow> {
  const res = await apiFetch(`/api/service-geofences/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deleteServiceGeofence(id: string): Promise<void> {
  const res = await apiFetch(`/api/service-geofences/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export async function calculateServiceFee(lat: number, lng: number): Promise<CalculateServiceFeeResult> {
  const qs = new URLSearchParams({ lat: String(lat), lng: String(lng) })
  const res = await apiFetch(`/api/service-geofences/calculate-fee?${qs}`)
  if (!res.ok) {
    const text = await res.text()
    let message = text || `${res.status} ${res.statusText}`
    let code: string | undefined
    try {
      const j = JSON.parse(text) as { message?: string; error?: string; code?: string }
      if (typeof j.message === 'string' && j.message) message = j.message
      else if (typeof j.error === 'string' && j.error) message = j.error
      code = j.code
    } catch {
      /* use raw text */
    }
    const err = new Error(message) as Error & { isOutOfCoverage?: boolean }
    err.isOutOfCoverage = code === 'OUT_OF_COVERAGE'
    throw err
  }
  const data = (await res.json()) as Record<string, unknown>
  return {
    service_geofence_id: String(data.service_geofence_id),
    zone_name: String(data.zone_name ?? ''),
    service_fee_mmk: Number(data.service_fee_mmk ?? 0),
  }
}
