function readEnv(key: string): string {
  return String(import.meta.env[key] ?? '').trim()
}

/** Default AI model config id (UUID in ai_configs table). */
export function getAiConfigId(): string {
  return readEnv('VITE_AI_CONFIG_ID')
}

/** Prompt id for lab result PDF validation. */
export function getLabResultValidationPromptId(): string {
  return readEnv('VITE_LAB_RESULT_VALIDATION_PROMPT_ID')
}

/** Prompt id for lab result summarization (if used). */
export function getLabResultSummarizedPromptId(): string {
  return readEnv('VITE_LAB_RESULT_SUMMARIZED_PROMPT_ID')
}

/** AI config for collection route planning; falls back to VITE_AI_CONFIG_ID. */
export function getCollectionRouteAiConfigId(): string {
  return readEnv('VITE_COLLECTION_ROUTE_AI_CONFIG_ID') || getAiConfigId()
}

/** Prompt id for collection route planning. */
export function getCollectionRoutePromptId(): string {
  return readEnv('VITE_COLLECTION_ROUTE_PROMPT_ID')
}

export function isLabResultReviewConfigured(): boolean {
  return Boolean(getAiConfigId() && getLabResultValidationPromptId())
}

export function isCollectionRouteAiConfigured(): boolean {
  return Boolean(getCollectionRouteAiConfigId() && getCollectionRoutePromptId())
}
