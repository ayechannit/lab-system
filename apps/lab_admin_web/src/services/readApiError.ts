/** Parse JSON error bodies from the lab backend (`message` or `error`). */
export async function readApiErrorBody(res: Response): Promise<string> {
  const text = await res.text()
  const trimmed = text.trim()
  if (!trimmed) return `${res.status} ${res.statusText}`

  try {
    const j = JSON.parse(trimmed) as { message?: string; error?: string }
    if (typeof j.message === 'string' && j.message) return j.message
    if (typeof j.error === 'string' && j.error) return j.error
  } catch {
    /* not JSON */
  }

  // Avoid dumping HTML error pages (e.g. another app on :3000) into toasts.
  if (/^<!DOCTYPE html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return `API returned HTML instead of JSON (HTTP ${res.status}). Is the lab backend running on the configured port?`
  }

  if (trimmed.length > 240) return `${trimmed.slice(0, 237)}…`
  return trimmed
}
