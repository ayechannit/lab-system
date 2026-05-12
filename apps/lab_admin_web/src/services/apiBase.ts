/** Lab backend origin (`/api/users`, `/api/auth`, …). */
export function getApiBaseUrl(): string | null {
  const v = import.meta.env.VITE_API_BASE_URL as string | undefined
  const trimmed = v != null ? String(v).trim() : ''
  if (trimmed !== '') return trimmed.replace(/\/$/, '')
  if (import.meta.env.DEV) return 'http://localhost:3000'
  return null
}

export function isApiMode(): boolean {
  return getApiBaseUrl() !== null
}
