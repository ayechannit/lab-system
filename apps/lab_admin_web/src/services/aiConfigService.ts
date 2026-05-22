import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type AiProviderType = 'gemini' | 'openai'

export type AiConfigRow = {
  id: string
  model_name: string
  api_key: string
  type: AiProviderType
  created_at?: string
  updated_at?: string
}

export type AiConfigUpsertBody = {
  model_name: string
  api_key: string
  type: AiProviderType
}

function normalizeRow(raw: Record<string, unknown>): AiConfigRow {
  const type = String(raw.type ?? 'gemini')
  return {
    id: String(raw.id),
    model_name: String(raw.model_name ?? ''),
    api_key: String(raw.api_key ?? ''),
    type: type === 'openai' ? 'openai' : 'gemini',
    created_at: raw.created_at != null ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at != null ? String(raw.updated_at) : undefined,
  }
}

export async function fetchAiConfigs(): Promise<AiConfigRow[]> {
  const res = await apiFetch('/api/ai-configs')
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as Record<string, unknown>[]
  if (!Array.isArray(data)) return []
  return data.map((r) => normalizeRow(r))
}

export async function fetchAiConfigById(id: string): Promise<AiConfigRow | null> {
  const res = await apiFetch(`/api/ai-configs/${encodeURIComponent(id)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function createAiConfig(body: AiConfigUpsertBody): Promise<AiConfigRow> {
  const res = await apiFetch('/api/ai-configs', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function updateAiConfig(id: string, body: AiConfigUpsertBody): Promise<AiConfigRow> {
  const res = await apiFetch(`/api/ai-configs/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  return normalizeRow((await res.json()) as Record<string, unknown>)
}

export async function deleteAiConfig(id: string): Promise<void> {
  const res = await apiFetch(`/api/ai-configs/${encodeURIComponent(id)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
}

export function maskApiKey(key: string): string {
  const k = key.trim()
  if (!k) return '—'
  if (k.length <= 8) return '••••••••'
  return `${k.slice(0, 4)}…${k.slice(-4)}`
}

export function providerLabel(type: AiProviderType): string {
  return type === 'openai' ? 'OpenAI' : 'Google Gemini'
}
