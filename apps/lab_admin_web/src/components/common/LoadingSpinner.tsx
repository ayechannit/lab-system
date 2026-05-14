type LoadingSpinnerProps = {
  /** Screen reader label (visually hidden) */
  label?: string
  size?: 'sm' | 'md'
  /** Full-width centered block (modals, session gate) */
  layout?: 'inline' | 'block'
}

export function LoadingSpinner({ label = 'Loading', size = 'md', layout = 'inline' }: LoadingSpinnerProps) {
  const wrapClass =
    layout === 'block'
      ? 'loading-spinner-wrap loading-spinner-wrap--block'
      : 'loading-spinner-wrap loading-spinner-wrap--inline'
  return (
    <span className={wrapClass} role="status" aria-live="polite">
      <span className={`loading-spinner loading-spinner--${size}`} aria-hidden />
      <span className="visually-hidden">{label}</span>
    </span>
  )
}
