/** Matches theme_settings.logo_url NVARCHAR(2048). */
export const LOGO_URL_MAX_LENGTH = 2048

export function isDisplayableLogoUrl(url: string): boolean {
  const u = url.trim()
  if (!u) return false
  return (
    u.startsWith('data:image/') ||
    u.startsWith('http://') ||
    u.startsWith('https://') ||
    u.startsWith('/uploads/')
  )
}
