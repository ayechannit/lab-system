/** Parse JSON error bodies from the lab backend (`message` or `error`). */
export async function readApiErrorBody(res: Response): Promise<string> {
  const text = await res.text()
  try {
    const j = JSON.parse(text) as { message?: string; error?: string }
    if (typeof j.message === 'string' && j.message) return j.message
    if (typeof j.error === 'string' && j.error) return j.error
  } catch {
    /* ignore */
  }
  return text || `${res.status} ${res.statusText}`
}
