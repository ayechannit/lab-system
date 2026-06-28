import { useState } from 'react'
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

export function StaffAvatar({
  name,
  profileImageUrl,
  className = '',
}: StaffAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)
  const src = resolveStaffProfileImageUrl(profileImageUrl)
  const classes = ['staff-avatar', className].filter(Boolean).join(' ')
  if (src && !imageFailed) {
    return (
      <img
        src={src}
        alt=""
        className={`${classes} staff-avatar--image`}
        onError={() => setImageFailed(true)}
      />
    )
  }
  return (
    <span className={classes} aria-hidden="true">
      {initialsFromName(name)}
    </span>
  )
}
