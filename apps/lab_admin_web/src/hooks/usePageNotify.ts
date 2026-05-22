import { useEffect } from 'react'
import { useToast } from './ToastContext'

export function messageFromError(error: unknown, fallback = 'Something went wrong'): string {
  return error instanceof Error ? error.message : fallback
}

/** Shows a persistent error toast while `message` is set. */
export function useErrorToast(message: string | null) {
  const { showError } = useToast()
  useEffect(() => {
    if (message) showError(message, 0)
  }, [message, showError])
}
