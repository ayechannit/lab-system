import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { PageBanner, type PageBannerKind } from '../components/common/PageBanner'

const DEFAULT_DURATION_MS = 5500
const EXIT_MS = 280

type ToastRecord = {
  id: string
  kind: PageBannerKind
  message: string
  exiting: boolean
}

export type ShowToastOptions = {
  kind: PageBannerKind
  message: string
  /** Auto-dismiss after this many ms. Use `0` to keep until dismissed. Default 5500. */
  durationMs?: number
}

type ToastContextValue = {
  showToast: (options: ShowToastOptions) => string
  showSuccess: (message: string, durationMs?: number) => string
  showError: (message: string, durationMs?: number) => string
  showInfo: (message: string, durationMs?: number) => string
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: ToastRecord[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return createPortal(
    <div className="toast-viewport" aria-live="polite" aria-relevant="additions text">
      {toasts.map((t) => (
        <PageBanner
          key={t.id}
          kind={t.kind}
          className={t.exiting ? 'page-banner--toast-exit' : 'page-banner--toast-enter'}
          onDismiss={() => onDismiss(t.id)}
        >
          {t.message}
        </PageBanner>
      ))}
    </div>,
    document.body,
  )
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([])
  const timersRef = useRef<Map<string, number>>(new Map())

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id)
    if (timer != null) {
      window.clearTimeout(timer)
      timersRef.current.delete(id)
    }

    setToasts((prev) => {
      const hit = prev.find((t) => t.id === id)
      if (!hit || hit.exiting) return prev
      return prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    })

    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, EXIT_MS)
  }, [])

  const showToast = useCallback(
    ({ kind, message, durationMs = DEFAULT_DURATION_MS }: ShowToastOptions) => {
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

      setToasts((prev) => [...prev, { id, kind, message, exiting: false }])

      if (durationMs > 0) {
        const timer = window.setTimeout(() => dismiss(id), durationMs)
        timersRef.current.set(id, timer)
      }

      return id
    },
    [dismiss],
  )

  const showSuccess = useCallback(
    (message: string, durationMs?: number) => showToast({ kind: 'success', message, durationMs }),
    [showToast],
  )

  const showError = useCallback(
    (message: string, durationMs?: number) => showToast({ kind: 'error', message, durationMs }),
    [showToast],
  )

  const showInfo = useCallback(
    (message: string, durationMs?: number) => showToast({ kind: 'info', message, durationMs }),
    [showToast],
  )

  const value = useMemo(
    () => ({ showToast, showSuccess, showError, showInfo, dismiss }),
    [showToast, showSuccess, showError, showInfo, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

/** @deprecated Prefer {@link useToast}. */
export function useLegacyPageToast() {
  const toast = useToast()
  return {
    ...toast,
    showOk: (message: string) => toast.showSuccess(message),
    showErr: (message: string, durationMs?: number) => toast.showError(message, durationMs),
  }
}
