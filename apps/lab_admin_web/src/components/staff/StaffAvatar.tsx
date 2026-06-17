import { resolveStaffProfileImageUrl } from '../../utils/profileImage'

type StaffAvatarProps = {
  name: string
  profileImageUrl?: string | null
  className?: string
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  const one = parts[0] ?? '?'
  return one.slice(0, 2).toUpperCase()
}

export function StaffAvatar({ name, profileImageUrl, className = 'staff-avatar' }: StaffAvatarProps) {
  const src = resolveStaffProfileImageUrl(profileImageUrl)
  if (src) {
    return <img src={src} alt="" className={`${className} staff-avatar--image`} />
  }
  return (
    <span className={className} aria-hidden="true">
      {initialsFromName(name)}
    </span>
  )
}
