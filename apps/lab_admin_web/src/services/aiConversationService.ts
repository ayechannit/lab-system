import { apiFetch } from './apiClient'
import { readApiErrorBody } from './readApiError'

export type CollectionRouteStop = {
  orderId: string
  patientName: string
  address: string
  lat: number
  lng: number
}

export type CollectionRouteStopDetail = {
  orderId: string
  sequence: number
  arrivalTime: string | null
  collectionStart: string | null
  collectionEnd: string | null
}

export type CollectionRouteResult = {
  orderedStops: string[]
  summary: string
  estimatedFinishTime: string | null
  estimatedMinutes: number | null
  routeStops: CollectionRouteStopDetail[]
}

export const COLLECTION_ROUTE_AI_CONFIG_ID = '6bdff7e4-fc4b-4751-865e-4a2004f41c9b'
export const COLLECTION_ROUTE_PROMPT_ID = '6c5027bd-719b-4b4c-b977-cf3aed6ee487'

export type PlanCollectionRouteParams = {
  stops: CollectionRouteStop[]
  startLocation: { lat: number; lng: number }
  startTime: string
  collectionDurationMinutes: number
  ai_config_id?: string
  prompt_id?: string
}

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


function buildRoutePlanMessage(params: PlanCollectionRouteParams): string {
  const payload = {
    start_location: params.startLocation,
    start_time: params.startTime,
    collection_duration_minutes: params.collectionDurationMinutes,
    orders: params.stops.map((stop) => ({
      order_id: stop.orderId,
      customer_name: stop.patientName,
      lat: stop.lat,
      lng: stop.lng,
    })),
  }
  return JSON.stringify(payload)
}

function stopLine(stop: CollectionRouteStop): string {
  return `${stop.orderId}: ${stop.patientName} — ${stop.address.trim() || '—'}`
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    /* try other shapes */
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) {
    try {
      return JSON.parse(fenced[1].trim())
    } catch {
      /* continue */
    }
  }

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1))
  }

  throw new Error('AI did not return valid JSON for the collection route.')
}

function buildStopLookup(stops: CollectionRouteStop[]): Map<string, CollectionRouteStop> {
  return new Map(stops.map((stop) => [stop.orderId.toLowerCase(), stop]))
}

function findStop(lookup: Map<string, CollectionRouteStop>, orderId: string): CollectionRouteStop | undefined {
  return lookup.get(orderId.toLowerCase())
}

function parseClockTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null
  if (hours > 23 || minutes > 59) return null
  return hours * 60 + minutes
}

function sortRouteRows(rows: unknown[]): Record<string, unknown>[] {
  return [...rows]
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .sort((a, b) => {
      const seqA = Number(a.sequence)
      const seqB = Number(b.sequence)
      if (Number.isFinite(seqA) && Number.isFinite(seqB) && seqA !== seqB) return seqA - seqB
      return 0
    })
}

function orderIdsFromRouteBody(body: Record<string, unknown>): string[] {
  const candidates = [
    body.orderIds,
    body.ordered_order_ids,
    body.orderedOrderIds,
  ]
  for (const value of candidates) {
    if (Array.isArray(value)) {
      return value.map((id) => String(id).trim()).filter(Boolean)
    }
  }

  if (Array.isArray(body.route)) {
    return sortRouteRows(body.route)
      .map((item) => String(item.order_id ?? item.orderId ?? '').trim())
      .filter(Boolean)
  }

  if (Array.isArray(body.orders)) {
    return body.orders
      .map((row) => {
        if (!row || typeof row !== 'object') return ''
        const item = row as Record<string, unknown>
        return String(item.order_id ?? item.orderId ?? '').trim()
      })
      .filter(Boolean)
  }

  for (const key of ['ordered_stops', 'visits', 'stops']) {
    const value = body[key]
    if (!Array.isArray(value)) continue
    const ids = value
      .map((row) => {
        if (!row || typeof row !== 'object') return ''
        const item = row as Record<string, unknown>
        return String(item.order_id ?? item.orderId ?? '').trim()
      })
      .filter(Boolean)
    if (ids.length > 0) return ids
  }

  return []
}

function parseMinutesValue(value: unknown): number | null {
  if (value == null) return null
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value > 500 ? Math.round(value / 60) : Math.round(value)
  }
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const direct = Number(trimmed)
    if (Number.isFinite(direct) && direct > 0) {
      return direct > 500 ? Math.round(direct / 60) : Math.round(direct)
    }
    const hourMin = trimmed.match(/(\d+)\s*h(?:ours?)?(?:\s*(\d+)\s*m(?:in(?:ute)?s?)?)?/i)
    if (hourMin) {
      const total = Number(hourMin[1]) * 60 + (hourMin[2] ? Number(hourMin[2]) : 0)
      return total > 0 ? total : null
    }
    const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:min(?:ute)?s?|m\b)/i)
    if (minMatch) {
      const minutes = Number(minMatch[1])
      return Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes) : null
    }
  }
  return null
}

function unwrapRouteBody(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {}
  const body = raw as Record<string, unknown>
  for (const key of ['data', 'result', 'response', 'route_plan', 'optimized_route', 'output']) {
    const nested = body[key]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return { ...body, ...(nested as Record<string, unknown>) }
    }
  }
  return body
}

const ESTIMATED_TIME_KEYS = [
  'estimatedMinutes',
  'estimated_minutes',
  'estimated_time_minutes',
  'estimated_time',
  'total_time_minutes',
  'estimated_total_minutes',
  'total_duration_minutes',
  'total_minutes',
  'total_time',
  'total_duration',
  'total_estimated_time',
  'total_estimated_minutes',
  'duration_minutes',
  'estimated_duration',
  'estimated_duration_minutes',
  'eta_minutes',
  'travel_time_minutes',
  'total_travel_time_minutes',
  'route_duration_minutes',
  'total_estimated_duration',
  'estimated_total_time',
]

function clockValue(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function parseRouteStopDetails(body: Record<string, unknown>): CollectionRouteStopDetail[] {
  if (!Array.isArray(body.route)) return []
  return sortRouteRows(body.route)
    .map((row, index) => ({
      orderId: String(row.order_id ?? row.orderId ?? '').trim(),
      sequence: Number(row.sequence) || index + 1,
      arrivalTime: clockValue(row.arrival_time),
      collectionStart: clockValue(row.collection_start),
      collectionEnd: clockValue(row.collection_end),
    }))
    .filter((stop) => Boolean(stop.orderId))
}

function extractEstimatedFinishTime(
  body: Record<string, unknown>,
  routeStops: CollectionRouteStopDetail[],
): string | null {
  if (body.summary && typeof body.summary === 'object') {
    const finish = (body.summary as Record<string, unknown>).estimated_finish_time
    if (typeof finish === 'string' && finish.trim()) return finish.trim()
  }
  const last = routeStops[routeStops.length - 1]
  return last?.collectionEnd ?? null
}

function isMonotonicRouteTimes(routeStops: CollectionRouteStopDetail[], startTime: string): boolean {
  const startMin = parseClockTime(startTime)
  if (startMin == null) return false
  let cursor = startMin
  for (const stop of routeStops) {
    const arrival = stop.arrivalTime ? parseClockTime(stop.arrivalTime) : null
    if (arrival == null) return false
    if (arrival < cursor) return false
    const end = stop.collectionEnd ? parseClockTime(stop.collectionEnd) : arrival
    if (end != null && end < arrival) return false
    cursor = end ?? arrival
  }
  return true
}

function extractEstimatedMinutes(
  body: Record<string, unknown>,
  startTime: string,
  routeStops: CollectionRouteStopDetail[],
): number | null {
  const startMin = parseClockTime(startTime)

  if (routeStops.length > 0 && startMin != null && isMonotonicRouteTimes(routeStops, startTime)) {
    const last = routeStops[routeStops.length - 1]
    const finishClock = last.collectionEnd ?? extractEstimatedFinishTime(body, routeStops)
    if (finishClock) {
      const finishMin = parseClockTime(finishClock)
      if (finishMin != null && finishMin >= startMin) return finishMin - startMin
    }
  }

  const finish = extractEstimatedFinishTime(body, routeStops)
  if (finish && startMin != null) {
    const finishMin = parseClockTime(finish)
    if (finishMin != null && finishMin >= startMin) return finishMin - startMin
  }

  for (const key of ESTIMATED_TIME_KEYS) {
    const parsed = parseMinutesValue(body[key])
    if (parsed != null) return parsed
  }

  if (body.route_summary && typeof body.route_summary === 'object') {
    for (const key of ESTIMATED_TIME_KEYS) {
      const parsed = parseMinutesValue((body.route_summary as Record<string, unknown>)[key])
      if (parsed != null) return parsed
    }
  } else if (typeof body.route_summary === 'string') {
    const parsed = parseMinutesValue(body.route_summary)
    if (parsed != null) return parsed
  }

  const routeArrays = [body.route, body.stops, body.visits, body.ordered_stops, body.orders].filter(Array.isArray)
  for (const arr of routeArrays) {
    let maxCumulative = 0
    for (const row of arr as unknown[]) {
      if (!row || typeof row !== 'object') continue
      const item = row as Record<string, unknown>
      for (const key of ['cumulative_minutes', 'cumulative_time_minutes', 'eta_minutes', 'arrival_minutes']) {
        const cumulative = parseMinutesValue(item[key])
        if (cumulative != null) maxCumulative = Math.max(maxCumulative, cumulative)
      }
    }
    if (maxCumulative > 0) return maxCumulative
  }

  return null
}

function formatRouteSummary(body: Record<string, unknown>, stopCount: number): string {
  if (body.summary && typeof body.summary === 'object') {
    const summary = body.summary as Record<string, unknown>
    const totalOrders = summary.total_orders ?? stopCount
    const finish = summary.estimated_finish_time
    if (finish) return `${totalOrders} stop(s) · estimated finish ${finish}`
    return `${totalOrders} stop(s) optimized route.`
  }

  return String(
    body.summary ?? body.explanation ?? body.notes ?? (
      typeof body.route_summary === 'string' ? body.route_summary : ''
    ) ?? '',
  ).trim()
}

function normalizeCollectionRouteResult(
  raw: unknown,
  stops: CollectionRouteStop[],
  startTime: string,
): CollectionRouteResult {
  if (!raw || typeof raw !== 'object') {
    throw new Error('AI route response was empty or invalid.')
  }

  const body = unwrapRouteBody(raw)
  const byId = buildStopLookup(stops)
  let orderedStops: string[] = []

  if (Array.isArray(body.orderedStops)) {
    orderedStops = body.orderedStops.map((line) => String(line).trim()).filter(Boolean)
  } else {
    const orderedIds = orderIdsFromRouteBody(body)
    if (orderedIds.length > 0) {
      orderedStops = orderedIds
        .map((id) => findStop(byId, id))
        .filter((stop): stop is CollectionRouteStop => Boolean(stop))
        .map(stopLine)
    }
  }

  const seen = new Set<string>()
  orderedStops = orderedStops.filter((line) => {
    const id = line.split(':')[0]?.trim()
    if (!id) return false
    const key = id.toLowerCase()
    if (!byId.has(key) || seen.has(key)) return false
    seen.add(key)
    return true
  })

  for (const stop of stops) {
    if (!seen.has(stop.orderId.toLowerCase())) orderedStops.push(stopLine(stop))
  }

  const routeStops = parseRouteStopDetails(body)
  const summary = formatRouteSummary(body, stops.length)
  const estimatedFinishTime = extractEstimatedFinishTime(body, routeStops)
  const estimatedMinutes = extractEstimatedMinutes(body, startTime, routeStops)

  return {
    orderedStops,
    summary: summary || `Optimized collection route for ${stops.length} stop(s).`,
    estimatedFinishTime,
    estimatedMinutes,
    routeStops,
  }
}

export async function planCollectionRouteWithAi(params: PlanCollectionRouteParams): Promise<CollectionRouteResult> {
  const message = buildRoutePlanMessage(params)

  const res = await apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({
      ai_config_id: params.ai_config_id ?? COLLECTION_ROUTE_AI_CONFIG_ID,
      prompt_id: params.prompt_id ?? COLLECTION_ROUTE_PROMPT_ID,
      message,
      stream: false,
    }),
  })
  if (!res.ok) throw new Error(await readApiErrorBody(res))

  const data = (await res.json()) as { reply?: string }
  const reply = String(data.reply ?? '').trim()
  if (!reply) throw new Error('No text returned from AI.')

  return normalizeCollectionRouteResult(
    extractJsonObject(reply),
    params.stops,
    params.startTime,
  )
}

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
