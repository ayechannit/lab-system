type BrandMarkProps = {
  logoUrl: string | null
  className?: string
}

/** Sidebar / header: custom logo image (no icon box), or default biotech icon in brand-mark. */
export function BrandMark({ logoUrl, className = 'brand-mark' }: BrandMarkProps) {
  if (logoUrl) {
    return <img src={logoUrl} alt="" className="brand-logo" />
  }
  return (
    <span className={className} aria-hidden>
      <span className="material-symbols-outlined">biotech</span>
    </span>
  )
}
