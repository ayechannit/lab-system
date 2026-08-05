/** Lab backend origin (`/api/users`, `/api/auth`, …). */
export function getApiBaseUrl(): string | null {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  const trimmed = v != null ? String(v).trim().replace(/\/$/, '') : ''

  // In Vite dev, always call same-origin `/api/...` so the proxy in
  // vite.config.ts forwards to the backend (no cross-origin / CORS).
  if (import.meta.env.DEV) {
    return ''
  }

  if (trimmed !== '') return trimmed
  return null
}

export function isApiMode(): boolean {
  return getApiBaseUrl() !== null
}
