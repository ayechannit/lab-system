import { getApiBaseUrl } from '../services/apiBase'

export function isDisplayableProfileImageUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  return (
    u.startsWith('data:image/') ||
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('/uploads/')
  )
}

/** Resolve stored profile_image_url for <img src> (API-hosted /uploads paths need the API origin). */
export function resolveStaffProfileImageUrl(profileImageUrl: string | null | undefined): string | null {
  const u = (profileImageUrl ?? '').trim()
  if (!u) return null
  if (u.startsWith('data:') || u.startsWith('http://') || u.startsWith('https://')) return u
  if (u.startsWith('/')) {
    const base = getApiBaseUrl()?.replace(/\/$/, '')
    if (base) return `${base}${u}`
  }
  return u
}
