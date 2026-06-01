import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type AiReviewParams = {
  ai_config_id: string
  prompt_id?: string
  orderId: string
  patientName: string
  testId: string
  testName: string
  testCode?: string
  downloadUrl?: string
}

const STAFF_REVIEW_PREAMBLE =
  'You are a clinical lab quality reviewer for MedLab Smart. Review the lab result document for accuracy, completeness, and internal consistency. ' +
  'Flag critical anomalies, missing sections, or identifiers that do not match the order. ' +
  'Write for lab staff in clear sections: Summary, Findings, Release recommendation (approve / needs correction). ' +
  'Do not replace physician diagnosis.'

export async function reviewLabResultWithAi(params: AiReviewParams): Promise<string> {
  const testLabel = params.testCode ? `${params.testName} (${params.testCode})` : params.testName
  const message =
    `${STAFF_REVIEW_PREAMBLE}\n\n` +
    `Order: ${params.orderId}\n` +
    `Patient: ${params.patientName}\n` +
    `Test line: ${testLabel}\n` +
    `Test ID: ${params.testId}`

  const url = params.downloadUrl?.trim()
  let pdfBlob: Blob | null = null
  if (url) {
    try {
      const fileRes = await fetch(url, { credentials: 'include' })
      if (fileRes.ok) {
        const blob = await fileRes.blob()
        if (blob.size > 0) pdfBlob = blob
      }
    } catch {
      /* fall back to URL in message */
    }
  }

  if (pdfBlob) {
    const fd = new FormData()
    fd.append('ai_config_id', params.ai_config_id)
    if (params.prompt_id) fd.append('prompt_id', params.prompt_id)
    fd.append('message', message)
    fd.append('stream', 'false')
    fd.append('file', pdfBlob, 'lab-result.pdf')
    const res = await apiFetch('/api/conversations', { method: 'POST', body: fd })
    if (!res.ok) throw new Error(await readApiErrorBody(res))
    const data = (await res.json()) as { reply?: string }
    return String(data.reply ?? '').trim() || 'No text returned from AI.'
  }

  const res = await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      ai_config_id: params.ai_config_id,
      prompt_id: params.prompt_id || undefined,
      message: url ? `${message}\n\nResult PDF URL: ${url}` : message,
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))
  const data = (await res.json()) as { reply?: string }
  return String(data.reply ?? '').trim() || 'No text returned from AI.'
}
