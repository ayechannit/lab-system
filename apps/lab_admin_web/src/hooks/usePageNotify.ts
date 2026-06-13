import { useEffect } from 'react'
import { useToast } from './ToastContext'

export function messageFromError(error: unknown, fallback = 'Something went wrong'): string {
  return error instanceof Error ? error.message : fallback
}

/** Short, staff-facing copy for AI review failures (hides raw SDK / JSON blobs). */
export function friendlyAiReviewErrorMessage(
  error: unknown,
  fallback = 'AI review could not be completed.',
): string {
  const raw = messageFromError(error, fallback)
  const lower = raw.toLowerCase()

  if (/api key not valid|invalid api key|api_key_invalid|incorrect api key/i.test(raw)) {
    return 'The AI API key is invalid or expired. Check your provider API key in the database ai_configs record, then try again.'
  }
  if (/quota|rate limit|resource exhausted|429/.test(lower)) {
    return 'AI usage limit reached. Wait a moment or check your provider quota, then try again.'
  }
  if (/model.*not found|404.*model/i.test(lower)) {
    return 'The selected AI model is unavailable. Check the model name in your ai_configs record.'
  }
  if (/failed to fetch|network error|econnrefused|enotfound/i.test(lower)) {
    return 'Could not reach the AI service. Check your network and API settings.'
  }
  if (/no ai configuration|add an ai configuration/i.test(lower)) {
    return raw
  }

  let cleaned = raw
    .replace(/^\[[^\]]+\]:\s*/i, '')
    .replace(/Error fetching from https?:\/\/\S+\s*/i, '')
    .replace(/\[\d{3}\s[^\]]+\]\s*/g, '')
    .replace(/\{[\s\S]*\}$/, '')
    .trim()

  if (cleaned.length > 200) {
    const sentence = cleaned.split(/(?<=[.!?])\s+/)[0]
    cleaned = sentence && sentence.length <= 200 ? sentence : `${cleaned.slice(0, 197)}…`
  }

  return cleaned || fallback
}

export function aiReviewErrorNeedsConfigFix(message: string): boolean {
  return /api key|ai configuration/i.test(message)
}

/** Shows a persistent error toast while `message` is set. */
export function useErrorToast(message: string | null) {
  const { showError } = useToast()
  useEffect(() => {
    if (message) showError(message, 0)
  }, [message, showError])
}
