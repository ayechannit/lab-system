import idhcDefaultLogo from '../../assets/idhc-logo.png'
import { getAppliedAppTheme } from '../../theme/appThemes'

type BrandMarkProps = {
  logoUrl: string | null
  className?: string
}

/** Sidebar / header: custom logo, IDHC default on brand theme, or biotech icon fallback. */
export function BrandMark({ logoUrl, className = 'brand-mark' }: BrandMarkProps) {
  const themeId = getAppliedAppTheme()
  const resolvedLogo = logoUrl ?? (themeId === 'idhc' ? idhcDefaultLogo : null)

  if (resolvedLogo) {
    return (
      <img
        src={resolvedLogo}
        alt=""
        className={`brand-logo${themeId === 'idhc' && !logoUrl ? ' brand-logo--idhc' : ''}`}
      />
    )
  }

  return (
    <span className={className} aria-hidden>
      <span className="material-symbols-outlined">biotech</span>
    </span>
  )
}
