import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type PromptRow = {
  id: string
  name: string
  prompt_text: string
  created_at?: string
  updated_at?: string
}

export type PromptUpsertBody = {
  name: string
  prompt_text: string
}

function normalizeRow(raw: Record<string, unknown>): PromptRow {
  return {
    id: String(raw.id),
    name: String(raw.name ?? ''),
    prompt_text: String(raw.prompt_text ?? ''),
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchPrompts(): Promise<PromptRow[]> {
  const res = await apiFetch('/api/prompts')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}

export async function createPrompt(body: PromptUpsertBody): Promise<PromptRow> {
  const res = await apiFetch('/api/prompts', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updatePrompt(id: string, body: PromptUpsertBody): Promise<PromptRow> {
  const res = await apiFetch(`/api/prompts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deletePrompt(id: string): Promise<void> {
  const res = await apiFetch(`/api/prompts/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export function previewPromptText(text: string, max = 120): string {
  const t = text.trim().replace(/\s+/g, ' ')
  if (t.length <= max) return t || '—'
  return `${t.slice(0, max - 1)}…`
}
