import { getApiBaseUrl } from './apiBase'
import { getStoredAccessToken } from './authSession'

export function requireApiOrigin(): string {
  const base = getApiBaseUrl()
  if (!base) throw new Error('VITE_API_BASE_URL is not set')
  return base
}

/** Absolute URL for a path under the lab API origin (e.g. `/api/users`). */
export function apiUrl(path: string): string {
  const base = requireApiOrigin()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

/** Authenticated fetch: adds `Authorization: Bearer` when a session token exists. */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers)
  const token = getStoredAccessToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const body = init?.body
  if (
    body != null &&
    !(body instanceof FormData) &&
    typeof body === 'string' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(apiUrl(path), { ...init, headers })
}
