import { idhcEmblem, idhcLockup } from '../../assets/brandAssets'

type IdhcBrandLockupProps = {
  /** Icon rail: emblem only. Expanded: full lockup (emblem is already in the lockup image). */
  compact?: boolean
  className?: string
}

/** IDHC brand — emblem when compact, full lockup otherwise (no duplicate emblem). */
export function IdhcBrandLockup({ compact = false, className = '' }: IdhcBrandLockupProps) {
  if (compact) {
    return (
      <img
        src={idhcEmblem}
        alt=""
        className={`idhc-brand-emblem${className ? ` ${className}` : ''}`}
      />
    )
  }

  return (
    <img
      src={idhcLockup}
      alt="International Diagnostic & Healthcare Center"
      className={`idhc-brand-lockup${className ? ` ${className}` : ''}`}
    />
  )
}
