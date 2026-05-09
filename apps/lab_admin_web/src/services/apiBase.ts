/**
 * API origin for Staff, Users, and Lab test catalog.
 *
 * - **Development:** defaults to `http://localhost:3000` (same default port as `lab_backend`) so
 *   `npm run dev` works without a `.env` file. Override with `VITE_API_BASE_URL` if needed.
 * - **Production build:** set `VITE_API_BASE_URL` in the environment before `vite build`; if unset,
 *   those screens show an empty state and a configuration hint.
 */
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
