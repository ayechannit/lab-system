import type { ReactNode } from 'react'

export type PageBannerKind = 'success' | 'error' | 'info'

const ICONS: Record<PageBannerKind, string> = {
  success: 'check_circle',
  error: 'error',
  info: 'info',
}

export type PageBannerProps = {
  kind: PageBannerKind
  children: ReactNode
  className?: string
  /** When set, shows a dismiss control. */
  onDismiss?: () => void
}

export function PageBanner({ kind, children, className, onDismiss }: PageBannerProps) {
  const classes = ['page-banner', `page-banner--${kind}`, className].filter(Boolean).join(' ')
  return (
    <div
      className={classes}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'error' ? 'assertive' : 'polite'}
    >
      <span className={`page-banner__icon page-banner__icon--${kind}`} aria-hidden="true">
        <span className="material-symbols-outlined">{ICONS[kind]}</span>
      </span>
      <p className="page-banner__message">{children}</p>
      {onDismiss ? (
        <button
          type="button"
          className="page-banner__dismiss"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            close
          </span>
        </button>
      ) : null}
    </div>
  )
}

/** Maps legacy `ok` / `err` banner state to {@link PageBannerKind}. */
export function pageBannerKindFromLegacy(kind: 'ok' | 'err'): PageBannerKind {
  return kind === 'ok' ? 'success' : 'error'
}
