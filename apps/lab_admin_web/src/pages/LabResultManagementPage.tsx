import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { PageHeader } from '../components/common/PageHeader'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'
import {
  aiReviewErrorNeedsConfigFix,
  friendlyAiReviewErrorMessage,
  messageFromError,
  useErrorToast,
} from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { isApiMode } from '../services/apiBase'
import { getAiConfigId, getLabResultValidationPromptId, isLabResultReviewConfigured } from '../config/aiEnv'
import { reviewLabResultBatchWithAi, reviewLabResultWithAi } from '../services/aiConversationService'
import {
  fetchOrderById,
  fetchOrders,
  updateOrderStatus,
  uploadOrderTestResult,
  uploadOrderTestResultsBulk,
  separateOrderTestResultPdfs,
  saveOrderTestAiReview,
  type ApiOrderDetailItem,
  type ApiOrderDetail,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import '../components/common/ui.css'

const ADMIN_CONTENT_BOTTOM_PADDING = 40

function clampAdminScrollToElementBottom(
  scrollRoot: HTMLElement,
  boundaryElement: HTMLElement,
  bottomPadding = ADMIN_CONTENT_BOTTOM_PADDING,
) {
  const rootRect = scrollRoot.getBoundingClientRect()
  const boundaryRect = boundaryElement.getBoundingClientRect()
  const boundaryBottom = boundaryRect.bottom - rootRect.top + scrollRoot.scrollTop
  const maxScrollTop = Math.max(0, boundaryBottom + bottomPadding - scrollRoot.clientHeight)
  if (scrollRoot.scrollTop > maxScrollTop) {
    scrollRoot.scrollTop = maxScrollTop
  }
}

type AiReviewEntry = {
  reply: string
  reviewedAt: string
}

type AiReviewVerdict = 'pass' | 'fail' | 'neutral'

type AlertDetail = {
  Status: string
  Summary: string
}

type ParsedAiReview = {
  verdict: AiReviewVerdict | null
  label: string | null
  detail: string | null
  isCompact: boolean
  profileAlert?: AlertDetail | null
  testResultAlert?: AlertDetail | null
}

const AI_REVIEW_VERDICT_PATTERNS: { verdict: AiReviewVerdict; re: RegExp; label: string }[] = [
  { verdict: 'fail', re: /^incorrect\b/i, label: 'Incorrect' },
  { verdict: 'fail', re: /^(fail|failed|invalid|rejected?)\b/i, label: 'Failed' },
  { verdict: 'pass', re: /^correct\b/i, label: 'Correct' },
  { verdict: 'pass', re: /^(pass|passed|valid|approved?)\b/i, label: 'Passed' },
]

function extractJsonObject(text: string): any {
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
    try {
      return JSON.parse(trimmed.slice(start, end + 1))
    } catch {
      /* continue */
    }
  }
  return null
}

function parseAiReviewFromObject(jsonObj: Record<string, unknown>): ParsedAiReview | null {
  const profile = jsonObj.ProfileAlert as AlertDetail | undefined
  const testResult = jsonObj.TestResultAlert as AlertDetail | undefined

  if (!profile && !testResult) return null

  let verdict: AiReviewVerdict = 'pass'
  const statusP = profile?.Status?.toUpperCase() || ''
  const statusT = testResult?.Status?.toUpperCase() || ''

  if (
    statusP.includes('ERROR') ||
    statusP.includes('FAIL') ||
    statusP.includes('INCORRECT') ||
    statusT.includes('ERROR') ||
    statusT.includes('FAIL') ||
    statusT.includes('INCORRECT')
  ) {
    verdict = 'fail'
  } else if (statusP.includes('WARN') || statusT.includes('WARN')) {
    verdict = 'neutral'
  }

  return {
    verdict,
    label: verdict === 'pass' ? 'Correct' : verdict === 'fail' ? 'Incorrect' : 'Warning',
    detail: null,
    isCompact: false,
    profileAlert: profile || null,
    testResultAlert: testResult || null,
  }
}

function parseAiReviewReply(reply: string): ParsedAiReview {
  const trimmed = reply.trim()
  if (!trimmed) {
    return { verdict: null, label: null, detail: null, isCompact: true }
  }

  const jsonObj = extractJsonObject(trimmed)
  if (jsonObj && typeof jsonObj === 'object') {
    const fromObj = parseAiReviewFromObject(jsonObj as Record<string, unknown>)
    if (fromObj) return fromObj
  }

  for (const pattern of AI_REVIEW_VERDICT_PATTERNS) {
    if (!pattern.re.test(trimmed)) continue
    const rest = trimmed.replace(pattern.re, '').trim().replace(/^[:\-—]\s*/, '')
    return {
      verdict: pattern.verdict,
      label: pattern.label,
      detail: rest || null,
      isCompact: !rest,
    }
  }

  return { verdict: null, label: null, detail: trimmed, isCompact: false }
}

function testDisplayName(item: ApiOrderDetailItem): string {
  return item.test_name?.trim() || item.test_code?.trim() || 'Test'
}

function testAiReviewVerdict(
  item: ApiOrderDetailItem,
  aiReviewByTestId: Record<string, AiReviewEntry>,
): AiReviewVerdict | null {
  const entry = aiReviewByTestId[item.test_id]
  if (entry) return parseAiReviewReply(entry.reply).verdict
  const stored = item.ai_verdict?.trim().toLowerCase()
  if (stored === 'pass' || stored === 'fail' || stored === 'neutral') return stored
  return null
}

type AiReviewReleaseBlockers = {
  missingReview: string[]
  failed: string[]
  warnings: string[]
  errors: string[]
}

function collectAiReviewReleaseBlockers(
  items: ApiOrderDetailItem[],
  aiReviewByTestId: Record<string, AiReviewEntry>,
  aiReviewErrorByTestId: Record<string, string>,
): AiReviewReleaseBlockers {
  const missingReview: string[] = []
  const failed: string[] = []
  const warnings: string[] = []
  const errors: string[] = []
  for (const it of items) {
    const name = testDisplayName(it)
    if (aiReviewErrorByTestId[it.test_id]) {
      errors.push(name)
      continue
    }
    const verdict = testAiReviewVerdict(it, aiReviewByTestId)
    if (verdict === null) missingReview.push(name)
    else if (verdict === 'fail') failed.push(name)
    else if (verdict !== 'pass') warnings.push(name)
  }
  return { missingReview, failed, warnings, errors }
}

function aiReviewReleaseBlockerMessage(
  blockers: AiReviewReleaseBlockers,
  aiReviewConfigured: boolean,
): string | null {
  if (!aiReviewConfigured) {
    return 'Configure AI review before releasing results to patients.'
  }
  if (blockers.errors.length > 0) {
    return `AI review failed for: ${blockers.errors.join(', ')}. Re-run review after fixing issues.`
  }
  if (blockers.missingReview.length > 0) {
    return `Run AI review for all tests before releasing. Pending: ${blockers.missingReview.join(', ')}.`
  }
  if (blockers.failed.length > 0) {
    return `One or more tests failed AI review (${blockers.failed.join(', ')}). Fix results and re-run review before releasing.`
  }
  if (blockers.warnings.length > 0) {
    return `Resolve AI review warnings before releasing (${blockers.warnings.join(', ')}).`
  }
  return null
}

function parseAiReviewRepliesForTests(
  reply: string,
  testIds: string[],
): Map<string, { reply: string; parsed: ParsedAiReview }> {
  const result = new Map<string, { reply: string; parsed: ParsedAiReview }>()
  const idByLower = new Map(testIds.map((id) => [id.toLowerCase(), id]))
  const jsonObj = extractJsonObject(reply)

  if (jsonObj && typeof jsonObj === 'object' && Array.isArray((jsonObj as { tests?: unknown }).tests)) {
    for (const entry of (jsonObj as { tests: unknown[] }).tests) {
      if (!entry || typeof entry !== 'object') continue
      const row = entry as Record<string, unknown>
      const rawId = String(row.test_id ?? '').trim()
      const testId = idByLower.get(rawId.toLowerCase())
      if (!testId) continue
      const entryReply = JSON.stringify(entry)
      result.set(testId, {
        reply: entryReply,
        parsed: parseAiReviewFromObject(row) ?? parseAiReviewReply(entryReply),
      })
    }
  }

  const fallback = parseAiReviewReply(reply)
  for (const testId of testIds) {
    if (!result.has(testId)) {
      result.set(testId, { reply, parsed: fallback })
    }
  }
  return result
}

function itemPdfDisplaySolo(item: ApiOrderDetailItem): boolean {
  const raw = item.result_pdf_display_solo
  return raw === true || raw === 1
}

function groupItemsBySharedPdf(items: ApiOrderDetailItem[]): ApiOrderDetailItem[][] {
  const buckets = new Map<string, ApiOrderDetailItem[]>()
  for (const it of items) {
    const key = pdfGroupBucketKey(it) ?? `solo:${it.test_id}`
    const list = buckets.get(key) ?? []
    list.push(it)
    buckets.set(key, list)
  }
  return [...buckets.values()]
}

function resolveSharedGroupAiDisplay(
  testIds: string[],
  aiReviewByTestId: Record<string, AiReviewEntry>,
  aiReviewLoadingTestIds: string[],
  aiReviewErrorByTestId: Record<string, string>,
): {
  entry: AiReviewEntry | undefined
  loading: boolean
  error: string | null
  verdict: AiReviewVerdict | null
} {
  const loading = testIds.some((id) => aiReviewLoadingTestIds.includes(id))
  const error = testIds.map((id) => aiReviewErrorByTestId[id]).find(Boolean) ?? null
  const entries = testIds
    .map((id) => aiReviewByTestId[id])
    .filter((entry): entry is AiReviewEntry => Boolean(entry))
  const entry =
    entries.length === 0
      ? undefined
      : entries.reduce((best, current) =>
          current.reply.length >= best.reply.length ? current : best,
        )
  const verdict = entry ? parseAiReviewReply(entry.reply).verdict : null
  return { entry, loading, error, verdict }
}

function formatAiReviewedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function formatMaybeIsoWhen(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return '—'
  return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function testResultFileUrl(item: ApiOrderDetailItem): string | null {
  const u = item.result_file_url?.trim()
  if (u) return u
  const d = item.download_url?.trim()
  return d || null
}

function testResultDownloadUrl(item: ApiOrderDetailItem): string | null {
  const d = item.download_url?.trim()
  if (d) return d
  return testResultFileUrl(item)
}

function testResultStorageKey(item: ApiOrderDetailItem): string | null {
  const url = testResultFileUrl(item)
  if (!url) return null
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

function pdfGroupBucketKey(item: ApiOrderDetailItem): string | null {
  if (itemPdfDisplaySolo(item)) return `solo:${item.test_id}`
  const groupId = item.result_pdf_group_id?.trim()
  if (groupId) return `group:${groupId}`
  const storageKey = testResultStorageKey(item)
  if (!storageKey) return null
  return storageKey
}

function labResultStatusBadgeClass(status: ApiOrderStatus): string {
  const map: Record<ApiOrderStatus, string> = {
    pending: 'badge badge--warn',
    scheduled: 'badge badge--neutral',
    collecting: 'badge badge--neutral',
    running: 'badge badge--neutral',
    completed: 'badge badge--success',
    delivered: 'badge badge--success',
  }
  return map[status] ?? 'badge badge--neutral'
}

const LAB_RESULT_STATUS_OPTIONS: { value: '' | ApiOrderStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'collecting', label: 'Collecting' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'delivered', label: 'Delivered' },
]

const LAB_RESULT_RELEVANT_STATUSES: ApiOrderStatus[] = ['collecting', 'running', 'completed', 'delivered']

function itemHasUploadedPdf(item: ApiOrderDetailItem): boolean {
  return Boolean(testResultFileUrl(item))
}

type SharedPdfGroupMeta = {
  groupKey: string
  label: string
  memberCount: number
  memberIndex: number
  memberNames: string[]
  memberTestIds: string[]
}

type LabResultTestRow =
  | { kind: 'single'; item: ApiOrderDetailItem }
  | {
      kind: 'shared'
      groupKey: string
      label: string
      items: ApiOrderDetailItem[]
      memberTestIds: string[]
      memberNames: string[]
    }

type SharedPdfRowStatus = 'awaiting' | 'uploaded' | 'reviewing' | 'reviewed' | 'error'

function buildLabResultTestRows(items: ApiOrderDetailItem[]): LabResultTestRow[] {
  const buckets = new Map<string, ApiOrderDetailItem[]>()
  for (const it of items) {
    const key = pdfGroupBucketKey(it)
    if (!key) continue
    const list = buckets.get(key) ?? []
    list.push(it)
    buckets.set(key, list)
  }

  const emittedShared = new Set<string>()
  const rows: LabResultTestRow[] = []
  let groupIndex = 0

  for (const it of items) {
    const bucketKey = pdfGroupBucketKey(it)
    if (!bucketKey) {
      rows.push({ kind: 'single', item: it })
      continue
    }
    const bucket = buckets.get(bucketKey) ?? [it]
    if (bucket.length > 1) {
      if (emittedShared.has(bucketKey)) continue
      emittedShared.add(bucketKey)
      const label = `Report ${String.fromCharCode(65 + groupIndex)}`
      groupIndex += 1
      rows.push({
        kind: 'shared',
        groupKey: bucketKey,
        label,
        items: bucket,
        memberTestIds: bucket.map((row) => row.test_id),
        memberNames: bucket.map(
          (row) => row.test_name?.trim() || row.test_code?.trim() || 'Test',
        ),
      })
      continue
    }
    rows.push({ kind: 'single', item: it })
  }
  return rows
}

function resolveSharedPdfRowStatus(
  testIds: string[],
  itemsById: Map<string, ApiOrderDetailItem>,
  aiReviewByTestId: Record<string, AiReviewEntry>,
  aiReviewLoadingTestIds: string[],
  aiReviewErrorByTestId: Record<string, string>,
): SharedPdfRowStatus {
  const members = testIds.map((id) => itemsById.get(id)).filter((it): it is ApiOrderDetailItem => Boolean(it))
  if (members.length === 0) return 'awaiting'
  if (members.some((it) => !itemHasUploadedPdf(it))) return 'awaiting'
  if (testIds.some((id) => aiReviewLoadingTestIds.includes(id))) return 'reviewing'
  if (testIds.some((id) => aiReviewErrorByTestId[id])) return 'error'
  if (testIds.every((id) => aiReviewByTestId[id])) return 'reviewed'
  return 'uploaded'
}

function sharedPdfStatusBadge(
  status: SharedPdfRowStatus,
  groupMeta: SharedPdfGroupMeta | undefined,
): { className: string; label: string } {
  const isShared = Boolean(groupMeta && groupMeta.memberCount > 1)
  const sharedSuffix = isShared ? ` · ${groupMeta!.memberCount} tests` : ''
  const sharedClass = 'badge badge--shared-pdf lab-result-test-card__status-badge--shared'

  switch (status) {
    case 'reviewing':
      return {
        className: isShared ? sharedClass : 'badge badge--warn',
        label: isShared ? `Reviewing shared PDF${sharedSuffix}` : 'Reviewing…',
      }
    case 'reviewed':
      return {
        className: isShared ? sharedClass : 'badge badge--success',
        label: isShared ? `AI reviewed (shared)${sharedSuffix}` : 'AI reviewed',
      }
    case 'error':
      return {
        className: 'badge badge--warn',
        label: isShared ? `Review issue (shared)${sharedSuffix}` : 'Review issue',
      }
    case 'uploaded':
      return {
        className: isShared ? sharedClass : 'badge badge--success',
        label: isShared ? `Shared PDF${sharedSuffix}` : 'PDF uploaded',
      }
    default:
      return { className: 'badge badge--neutral', label: 'Awaiting PDF' }
  }
}

function canUploadResultPdfs(status: ApiOrderStatus): boolean {
  return status === 'completed' || status === 'delivered'
}

export function LabResultManagementPage() {
  const hasApi = isApiMode()
  const { account } = useAuth()
  const { showSuccess, showError } = useToast()
  const [orders, setOrders] = useState<ApiOrderListRow[]>([])
  const [listLoading, setListLoading] = useState(hasApi)
  const [listError, setListError] = useState<string | null>(null)

  useErrorToast(listError)

  const [orderId, setOrderId] = useState('')
  const [detail, setDetail] = useState<ApiOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useErrorToast(detailError)

  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadTargetTestIds, setUploadTargetTestIds] = useState<string[]>([])
  const [uploadingTestIds, setUploadingTestIds] = useState<string[]>([])
  const [bulkPdfSelectedIds, setBulkPdfSelectedIds] = useState<string[]>([])
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const resultEntryRef = useRef<HTMLDivElement>(null)
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | ApiOrderStatus>('')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const aiConfigId = getAiConfigId()
  const promptId = getLabResultValidationPromptId()
  const aiReviewConfigured = isLabResultReviewConfigured()
  const [aiReviewByTestId, setAiReviewByTestId] = useState<Record<string, AiReviewEntry>>({})
  const [aiReviewLoadingTestIds, setAiReviewLoadingTestIds] = useState<string[]>([])
  const [aiReviewErrorByTestId, setAiReviewErrorByTestId] = useState<Record<string, string>>({})
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [releaseSubmitting, setReleaseSubmitting] = useState(false)
  const [releaseConfirmOpen, setReleaseConfirmOpen] = useState(false)
  const [pdfAction, setPdfAction] = useState<{ testId: string; mode: 'view' | 'download' } | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setPatientName(patientInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [patientInput])

  const orderFetchParams = useMemo((): FetchOrdersParams | undefined => {
    const p: FetchOrdersParams = {}
    if (patientName) p.patient_name = patientName
    if (statusFilter) p.status = statusFilter
    return Object.keys(p).length ? p : undefined
  }, [patientName, statusFilter])

  const ordersListQuery = useMemo(
    (): FetchOrdersParams => ({
      ...(orderFetchParams ?? {}),
      page: ordersPage,
      limit: ordersPageSize,
    }),
    [orderFetchParams, ordersPage, ordersPageSize],
  )

  useEffect(() => {
    queueMicrotask(() => setOrdersPage(1))
  }, [patientName, statusFilter])

  useEffect(() => {
    setOrderId('')
  }, [ordersListQuery])

  useEffect(() => {
    if (!hasApi) {
      setOrders([])
      setListLoading(false)
      return
    }
    let cancelled = false
    setListLoading(true)
    setListError(null)
    void (async () => {
      try {
        const list = await fetchOrders(ordersListQuery)
        const visible =
          statusFilter === ''
            ? list.filter((o) => LAB_RESULT_RELEVANT_STATUSES.includes(o.status))
            : list
        if (!cancelled) {
          setOrders(visible)
          if (visible.length === 0 && ordersPage > 1) {
            setOrdersPage((p) => Math.max(1, p - 1))
          }
          setOrderId((prev) => (prev && visible.some((o) => o.id === prev) ? prev : ''))
        }
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : 'Failed to load orders')
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, ordersListQuery, refreshTick])

  useEffect(() => {
    if (!hasApi || !orderId) {
      setDetail(null)
      setAiReviewByTestId({})
      setAiReviewErrorByTestId({})
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    void (async () => {
      try {
        const d = await fetchOrderById(orderId)
        if (!cancelled) {
          if (!d) {
            setDetail(null)
            setDetailError('Order not found.')
          } else {
            setDetail(d)
            setDetailError(null)
            const preMap: Record<string, AiReviewEntry> = {}
            for (const item of d.items) {
              if (item.ai_verdict && item.ai_raw_response) {
                preMap[item.test_id] = {
                  reply: item.ai_raw_response,
                  reviewedAt: d.updated_at || d.created_at,
                }
              }
            }
            setAiReviewByTestId(preMap)
            setAiReviewErrorByTestId({})
          }
        }
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : 'Failed to load order')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, orderId])

  useEffect(() => {
    if (!detail || detailLoading) return

    const entry = resultEntryRef.current
    const scrollRoot = entry?.closest('.admin-content')
    if (!(entry instanceof HTMLElement) || !(scrollRoot instanceof HTMLElement)) return

    const clamp = () => clampAdminScrollToElementBottom(scrollRoot, entry)

    clamp()
    const raf = window.requestAnimationFrame(clamp)

    scrollRoot.addEventListener('scroll', clamp, { passive: true })

    const observer = new ResizeObserver(() => {
      clamp()
    })
    observer.observe(entry)
    if (scrollRoot.firstElementChild instanceof HTMLElement) {
      observer.observe(scrollRoot.firstElementChild)
    }

    return () => {
      window.cancelAnimationFrame(raf)
      scrollRoot.removeEventListener('scroll', clamp)
      observer.disconnect()
    }
  }, [detail, detailLoading, aiReviewLoadingTestIds])

  const bulkSelectedReviewMeta = useMemo(() => {
    if (!detail) {
      return { count: 0, allHavePdf: false, canRun: false }
    }
    const items = bulkPdfSelectedIds
      .map((id) => detail.items.find((it) => it.test_id === id))
      .filter((it): it is ApiOrderDetailItem => Boolean(it))
    const allHavePdf = items.length > 0 && items.every((it) => Boolean(testResultFileUrl(it)))
    const canRun =
      items.length > 0 &&
      allHavePdf &&
      aiReviewConfigured &&
      !uploadBusy &&
      aiReviewLoadingTestIds.length === 0
    return { count: items.length, allHavePdf, canRun }
  }, [
    detail,
    bulkPdfSelectedIds,
    aiReviewConfigured,
    uploadBusy,
    aiReviewLoadingTestIds.length,
  ])

  const uploadedItems = useMemo(
    () => (detail?.items ?? []).filter((it) => itemHasUploadedPdf(it)),
    [detail],
  )

  const testsMissingPdf = useMemo(
    () => (detail?.items ?? []).filter((it) => !itemHasUploadedPdf(it)),
    [detail],
  )

  const allTestsHavePdf = Boolean(
    detail && detail.items.length > 0 && testsMissingPdf.length === 0,
  )

  const aiReviewReleaseBlockers = useMemo(
    () =>
      collectAiReviewReleaseBlockers(
        detail?.items ?? [],
        aiReviewByTestId,
        aiReviewErrorByTestId,
      ),
    [detail?.items, aiReviewByTestId, aiReviewErrorByTestId],
  )

  const hasIncorrectAiReview = aiReviewReleaseBlockers.failed.length > 0

  const allTestsPassedAiReview = useMemo(
    () =>
      (detail?.items.length ?? 0) > 0 &&
      aiReviewReleaseBlockers.missingReview.length === 0 &&
      aiReviewReleaseBlockers.failed.length === 0 &&
      aiReviewReleaseBlockers.warnings.length === 0 &&
      aiReviewReleaseBlockers.errors.length === 0,
    [detail?.items.length, aiReviewReleaseBlockers],
  )

  const canReleaseToPatient = Boolean(
    detail?.status === 'completed' &&
      allTestsHavePdf &&
      aiReviewConfigured &&
      allTestsPassedAiReview &&
      !releaseSubmitting &&
      !uploadBusy &&
      aiReviewLoadingTestIds.length === 0,
  )

  const releaseDisabledReason = useMemo(() => {
    if (!detail || detail.status !== 'completed') return null
    if (testsMissingPdf.length > 0) {
      const names = testsMissingPdf.map((it) => testDisplayName(it)).join(', ')
      return `Upload a PDF for every test before releasing. Missing: ${names}.`
    }
    const aiBlock = aiReviewReleaseBlockerMessage(aiReviewReleaseBlockers, aiReviewConfigured)
    if (aiBlock) return aiBlock
    if (uploadBusy) return 'Wait for PDF upload to finish.'
    if (aiReviewLoadingTestIds.length > 0) return 'Wait for AI review to finish.'
    return null
  }, [
    detail,
    testsMissingPdf,
    aiReviewReleaseBlockers,
    aiReviewConfigured,
    uploadBusy,
    aiReviewLoadingTestIds.length,
  ])

  const isReleased = detail?.status === 'delivered'

  const canUploadPdfs = detail ? canUploadResultPdfs(detail.status) && !isReleased : false

  const showBulkPdfUpload = Boolean(canUploadPdfs && detail && detail.items.length > 1 && !isReleased)

  const labResultTestRows = useMemo(
    () => buildLabResultTestRows(detail?.items ?? []),
    [detail?.items],
  )

  const detailItemsById = useMemo(() => {
    const map = new Map<string, ApiOrderDetailItem>()
    for (const it of detail?.items ?? []) map.set(it.test_id, it)
    return map
  }, [detail?.items])

  function resolveTestResultDownloadUrl(testId: string): string | null {
    const item = detailItemsById.get(testId)
    return item ? testResultDownloadUrl(item) : null
  }

  function resolveTestResultPdfUrl(testId: string): string | null {
    const item = detailItemsById.get(testId)
    return item ? testResultFileUrl(item) : null
  }

  function openPdfUrl(url: string, target: '_blank' | '_self' = '_blank') {
    const a = document.createElement('a')
    a.href = url
    a.target = target
    a.rel = 'noopener noreferrer'
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  async function viewTestResultPdf(testId: string) {
    setPdfAction({ testId, mode: 'view' })
    try {
      const directUrl = resolveTestResultPdfUrl(testId)
      if (!directUrl) throw new Error('No PDF available for this test.')
      openPdfUrl(directUrl, '_blank')
    } catch (err) {
      showError(messageFromError(err, 'Could not open PDF.'))
    } finally {
      setPdfAction(null)
    }
  }

  async function downloadTestResultPdf(testId: string, _fileLabel: string) {
    setPdfAction({ testId, mode: 'download' })
    try {
      const directUrl = resolveTestResultDownloadUrl(testId)
      if (!directUrl) throw new Error('No PDF available for this test.')
      openPdfUrl(directUrl, '_self')
    } catch (err) {
      showError(messageFromError(err, 'Could not download PDF.'))
    } finally {
      setPdfAction(null)
    }
  }

  function renderPdfActionButtons(testId: string, fileLabel: string) {
    const busy = pdfAction?.testId === testId
    const viewing = busy && pdfAction?.mode === 'view'
    const downloading = busy && pdfAction?.mode === 'download'
    return (
      <>
        <button
          type="button"
          className="btn btn-secondary btn-sm lab-result-test-card__action-btn"
          disabled={busy || !hasApi}
          onClick={() => void viewTestResultPdf(testId)}
        >
          <span className="material-symbols-outlined" aria-hidden>
            visibility
          </span>
          {viewing ? 'Opening…' : 'View PDF'}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm lab-result-test-card__action-btn"
          disabled={busy || !hasApi}
          onClick={() => void downloadTestResultPdf(testId, fileLabel)}
        >
          <span className="material-symbols-outlined" aria-hidden>
            download
          </span>
          {downloading ? 'Downloading…' : 'Download PDF'}
        </button>
      </>
    )
  }

  function renderPdfAccessButtons(testId: string, fileLabel: string) {
    return (
      <div className="lab-result-test-card__actions lab-result-test-card__actions--readonly">
        {renderPdfActionButtons(testId, fileLabel)}
      </div>
    )
  }

  useEffect(() => {
    setBulkPdfSelectedIds([])
  }, [detail?.id])

  async function refreshOrderDetail(id: string) {
    const next = await fetchOrderById(id)
    if (next) setDetail(next)
    setRefreshTick((t) => t + 1)
    return next
  }

  async function advanceOrderStatus(next: ApiOrderStatus, note: string) {
    if (!detail) return
    const staffId = account?.id
    if (!staffId) {
      showError('Sign in with a staff account to update order status.')
      return
    }
    setStatusSubmitting(true)
    try {
      await updateOrderStatus(detail.id, { status: next, staff_id: staffId, note })
      await refreshOrderDetail(detail.id)
      showSuccess(`Order status updated to ${next}.`)
    } catch (err) {
      showError(messageFromError(err, 'Status update failed'))
    } finally {
      setStatusSubmitting(false)
    }
  }

  function selectOrderForResults(id: string) {
    setOrderId(id)
  }

  function orderTestsSummary(o: ApiOrderListRow): string {
    const n = o.items?.length ?? 0
    if (n === 0) return '—'
    const names = (o.items ?? [])
      .map((it) => it.test_name?.trim() || it.test_code?.trim() || it.test_id)
      .slice(0, 2)
    const more = n > 2 ? ` +${n - 2}` : ''
    return `${n} test${n === 1 ? '' : 's'}${names.length ? ` (${names.join(', ')}${more})` : ''}`
  }

  function openPdfPicker(testIds: string | string[]) {
    const ids = Array.isArray(testIds) ? testIds : [testIds]
    if (ids.length === 0) {
      showError('Select at least one test.')
      return
    }
    setUploadTargetTestIds(ids)
    pdfInputRef.current?.click()
  }

  function toggleBulkPdfSelect(testId: string) {
    setBulkPdfSelectedIds((prev) =>
      prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId],
    )
  }

  function toggleBulkPdfGroupSelect(testIds: string[]) {
    if (testIds.length === 0) return
    setBulkPdfSelectedIds((prev) => {
      const allSelected = testIds.every((id) => prev.includes(id))
      if (allSelected) return prev.filter((id) => !testIds.includes(id))
      return [...new Set([...prev, ...testIds])]
    })
  }

  function clearBulkPdfSelection() {
    setBulkPdfSelectedIds([])
  }

  async function separateSharedPdfGroup(testIds: string[]) {
    if (!detail || testIds.length < 2) return
    try {
      await separateOrderTestResultPdfs(detail.id, testIds)
      await refreshOrderDetail(detail.id)
      setBulkPdfSelectedIds((prev) => prev.filter((id) => !testIds.includes(id)))
      showSuccess(
        'Tests split into separate rows. Use Replace PDF on each test to assign different reports.',
      )
    } catch (err) {
      showError(messageFromError(err, 'Failed to separate PDF rows'))
    }
  }

  const onPdfSelected: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    const targets = uploadTargetTestIds
    e.target.value = ''
    setUploadTargetTestIds([])
    if (!file || !detail || targets.length === 0) return
    if (!canUploadResultPdfs(detail.status)) {
      showError('Mark the order completed before uploading result PDFs.')
      return
    }
    setUploadBusy(true)
    setUploadingTestIds(targets)
    try {
      if (targets.length > 1) {
        await uploadOrderTestResultsBulk(detail.id, targets, file)
      } else {
        await uploadOrderTestResult(detail.id, targets[0], file)
      }
      const next = await refreshOrderDetail(detail.id)
      const uploaded = targets
      setAiReviewByTestId((prev) => {
        const nextMap = { ...prev }
        for (const testId of uploaded) delete nextMap[testId]
        return nextMap
      })
      setBulkPdfSelectedIds((prev) => prev.filter((id) => !uploaded.includes(id)))
      const allPdfsNow =
        next && next.items.length > 0 && next.items.every((item) => testResultFileUrl(item))
      const n = uploaded.length
      showSuccess(
        allPdfsNow
          ? n > 1
            ? `PDF applied to ${n} tests. All tests have PDFs — review with AI, then use Release to patient.`
            : 'Result uploaded. All tests have PDFs — review with AI, then use Release to patient.'
          : n > 1
            ? `Same PDF applied to ${n} tests.`
            : 'Result file uploaded.',
      )
    } catch (err) {
      showError(messageFromError(err, 'Upload failed'))
    } finally {
      setUploadBusy(false)
      setUploadingTestIds([])
    }
  }

  async function reviewTestsBatch(items: ApiOrderDetailItem[]): Promise<boolean> {
    if (!detail || items.length === 0) return false
    const testIds = items.map((it) => it.test_id)
    const url = testResultFileUrl(items[0])
    if (!url) {
      setAiReviewErrorByTestId((prev) => {
        const next = { ...prev }
        for (const testId of testIds) next[testId] = 'Upload a result PDF for this test first.'
        return next
      })
      return false
    }

    setAiReviewByTestId((prev) => {
      const next = { ...prev }
      for (const testId of testIds) delete next[testId]
      return next
    })
    setAiReviewErrorByTestId((prev) => {
      const next = { ...prev }
      for (const testId of testIds) delete next[testId]
      return next
    })

    try {
      const reply = await reviewLabResultBatchWithAi({
        ai_config_id: aiConfigId,
        prompt_id: promptId || undefined,
        orderId: detail.id,
        patientName: detail.patient_name,
        downloadUrl: url,
        tests: items.map((it) => ({
          testId: it.test_id,
          testName: it.test_name?.trim() || it.test_id,
          testCode: it.test_code?.trim() || undefined,
        })),
      })

      const perTest = parseAiReviewRepliesForTests(reply, testIds)
      const reviewedAt = new Date().toISOString()
      const sharedEntry: AiReviewEntry = { reply, reviewedAt }
      for (const testId of testIds) {
        const entry = perTest.get(testId) ?? { reply, parsed: parseAiReviewReply(reply) }
        const verdict = entry.parsed.verdict || 'pass'
        await saveOrderTestAiReview(detail.id, testId, {
          ai_verdict: verdict,
          ai_raw_response: reply,
        })
        setAiReviewByTestId((prev) => ({
          ...prev,
          [testId]: sharedEntry,
        }))
      }
      return true
    } catch (err) {
      const msg = friendlyAiReviewErrorMessage(err)
      setAiReviewErrorByTestId((prev) => {
        const next = { ...prev }
        for (const testId of testIds) next[testId] = msg
        return next
      })
      return false
    }
  }

  async function reviewOneTest(testId: string): Promise<boolean> {
    if (!detail) return false
    const it = detail.items.find((i) => i.test_id === testId)
    const url = it ? testResultFileUrl(it) : null
    if (!it || !url) {
      setAiReviewErrorByTestId((prev) => ({
        ...prev,
        [testId]: 'Upload a result PDF for this test first.',
      }))
      return false
    }

    setAiReviewByTestId((prev) => {
      const next = { ...prev }
      delete next[testId]
      return next
    })
    setAiReviewErrorByTestId((prev) => {
      const next = { ...prev }
      delete next[testId]
      return next
    })

    try {
      const reply = await reviewLabResultWithAi({
        ai_config_id: aiConfigId,
        prompt_id: promptId || undefined,
        orderId: detail.id,
        patientName: detail.patient_name,
        testId: it.test_id,
        testName: it.test_name?.trim() || it.test_id,
        testCode: it.test_code?.trim() || undefined,
        downloadUrl: url,
      })

      const verdict = parseAiReviewReply(reply).verdict || 'pass'
      await saveOrderTestAiReview(detail.id, testId, {
        ai_verdict: verdict,
        ai_raw_response: reply,
      })

      setAiReviewByTestId((prev) => ({
        ...prev,
        [testId]: { reply, reviewedAt: new Date().toISOString() },
      }))
      return true
    } catch (err) {
      const msg = friendlyAiReviewErrorMessage(err)
      setAiReviewErrorByTestId((prev) => ({ ...prev, [testId]: msg }))
      return false
    }
  }

  async function runAiReviewForTest(testId: string) {
    if (!detail) return
    if (!aiReviewConfigured) {
      showError('Set VITE_AI_CONFIG_ID and VITE_LAB_RESULT_VALIDATION_PROMPT_ID in .env before running review.')
      return
    }
    setAiReviewLoadingTestIds([testId])
    try {
      const ok = await reviewOneTest(testId)
      if (ok) showSuccess('AI review complete.')
    } finally {
      setAiReviewLoadingTestIds([])
    }
  }

  async function runAiReviewForSelectedTests(explicitTestIds?: string[]) {
    if (!detail) return
    if (!aiReviewConfigured) {
      showError('Set VITE_AI_CONFIG_ID and VITE_LAB_RESULT_VALIDATION_PROMPT_ID in .env before running review.')
      return
    }
    const selected = (explicitTestIds ?? bulkPdfSelectedIds).filter((id) =>
      detail.items.some((it) => it.test_id === id),
    )
    if (selected.length === 0) {
      showError('Select at least one test.')
      return
    }
    const items = selected
      .map((id) => detail.items.find((it) => it.test_id === id))
      .filter((it): it is ApiOrderDetailItem => Boolean(it))
    if (!items.every((it) => testResultFileUrl(it))) {
      showError('All selected tests need a PDF before AI review.')
      return
    }

    setAiReviewLoadingTestIds(selected)
    let okCount = 0
    try {
      const groups = groupItemsBySharedPdf(items)
      for (const group of groups) {
        if (group.length > 1) {
          if (await reviewTestsBatch(group)) okCount += group.length
        } else if (await reviewOneTest(group[0].test_id)) {
          okCount += 1
        }
      }
      if (okCount === selected.length) {
        showSuccess(
          okCount > 1 ? `AI review complete for ${okCount} tests.` : 'AI review complete.',
        )
      } else if (okCount > 0) {
        showError(`AI review finished for ${okCount} of ${selected.length} tests. Check failed rows below.`)
      } else {
        showError('AI review failed for all selected tests.')
      }
    } finally {
      setAiReviewLoadingTestIds([])
    }
  }

  async function releaseToPatient() {
    if (!detail) return
    const staffId = account?.id
    if (!staffId) {
      showError('Sign in with a staff account to release results.')
      return
    }
    if (detail.status === 'delivered') {
      showSuccess('Results already released.')
      return
    }
    if (detail.status !== 'completed') {
      showError('Mark the order completed before releasing results to the patient.')
      return
    }
    if (!allTestsHavePdf) {
      const names = testsMissingPdf.map((it) => testDisplayName(it)).join(', ')
      showError(
        names
          ? `Upload result PDFs for all tests before release. Missing: ${names}.`
          : 'Upload result PDFs for all tests before release.',
      )
      return
    }
    if (!aiReviewConfigured) {
      showError('Configure AI review before releasing results to patients.')
      return
    }
    if (!allTestsPassedAiReview) {
      showError(
        aiReviewReleaseBlockerMessage(aiReviewReleaseBlockers, aiReviewConfigured) ??
          'Complete AI review for all tests before releasing.',
      )
      return
    }
    if (hasIncorrectAiReview) {
      showError('Cannot release: one or more tests were marked incorrect by AI review. Fix results and re-run review.')
      return
    }
    setReleaseConfirmOpen(true)
  }

  async function confirmReleaseToPatient() {
    if (!detail || releaseSubmitting) return
    const staffId = account?.id
    if (!staffId) return
    setReleaseConfirmOpen(false)
    setReleaseSubmitting(true)
    try {
      await updateOrderStatus(detail.id, {
        status: 'delivered',
        staff_id: staffId,
        note: 'Results released to patient after lab review',
      })
      await refreshOrderDetail(detail.id)
      showSuccess('Results released to patient.')
    } catch (err) {
      showError(messageFromError(err, 'Release failed'))
    } finally {
      setReleaseSubmitting(false)
    }
  }

  function renderAiReviewBody(
    entry: AiReviewEntry | null | undefined,
    loading: boolean,
    errorMessage: string | null = null,
  ) {
    if (loading) {
      return (
        <div className="lab-result-entry__ai-loading" role="status" aria-live="polite">
          <LoadingSpinner label="Running AI review" layout="inline" />
          <div className="lab-result-entry__ai-loading-copy">
            <p className="lab-result-entry__ai-loading-title">Analyzing result PDF</p>
            <p className="lab-result-entry__ai-loading-hint">This usually takes a few seconds. Previous review is hidden until the new run finishes.</p>
          </div>
        </div>
      )
    }
    if (errorMessage) {
      return (
        <div className="lab-result-entry__ai-fail" role="alert">
          <p className="lab-result-entry__ai-fail-title">Review failed</p>
          <p className="lab-result-entry__ai-fail-message">{errorMessage}</p>
          {aiReviewErrorNeedsConfigFix(errorMessage) ? (
            <p className="lab-result-entry__ai-fail-link">
              Check VITE_AI_CONFIG_ID and your provider API key in .env.
            </p>
          ) : null}
        </div>
      )
    }
    if (!entry) {
      return (
        <p className="lab-result-entry__ai-placeholder">
          Run <strong>AI review</strong> to analyze the uploaded PDF before release.
        </p>
      )
    }

    const parsed = parseAiReviewReply(entry.reply)
    const reviewedLabel = `Reviewed ${formatAiReviewedAt(entry.reviewedAt)}`

    if (parsed.profileAlert || parsed.testResultAlert) {
      const getStatusBadge = (status?: string) => {
        const s = status?.toUpperCase() || ''
        if (s.includes('ERROR') || s.includes('FAIL') || s.includes('INCORRECT')) {
          return <span className="badge badge--danger" style={{ backgroundColor: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5', borderWidth: '1px', borderStyle: 'solid', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>
        }
        if (s.includes('WARN')) {
          return <span className="badge badge--warn" style={{ backgroundColor: '#fef3c7', color: '#d97706', borderColor: '#fcd34d', borderWidth: '1px', borderStyle: 'solid', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>
        }
        return <span className="badge badge--success" style={{ backgroundColor: '#dcfce7', color: '#15803d', borderColor: '#86efac', borderWidth: '1px', borderStyle: 'solid', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>
      }

      const getCardBorderColor = (status?: string) => {
        const s = status?.toUpperCase() || ''
        if (s.includes('ERROR') || s.includes('FAIL') || s.includes('INCORRECT')) return '#fecaca'
        if (s.includes('WARN')) return '#fde68a'
        return '#bbf7d0'
      }

      const getCardBgColor = (status?: string) => {
        const s = status?.toUpperCase() || ''
        if (s.includes('ERROR') || s.includes('FAIL') || s.includes('INCORRECT')) return '#fff5f5'
        if (s.includes('WARN')) return '#fffbeb'
        return '#f9fdfa'
      }

      return (
        <div className="stack" style={{ gap: '0.75rem', padding: '1rem', backgroundColor: 'var(--card-muted-bg, #f8fafc)', borderRadius: '8px', border: '1px solid #e2e8f0', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary, #1e293b)' }}>AI Analysis Results</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>{reviewedLabel}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
            {parsed.profileAlert && (
              <div style={{
                padding: '0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: getCardBorderColor(parsed.profileAlert.Status),
                backgroundColor: getCardBgColor(parsed.profileAlert.Status),
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary, #0f172a)' }}>Profile Alignment</strong>
                  {getStatusBadge(parsed.profileAlert.Status)}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #334155)', lineHeight: 1.45 }}>
                  {parsed.profileAlert.Summary}
                </p>
              </div>
            )}

            {parsed.testResultAlert && (
              <div style={{
                padding: '0.85rem',
                borderRadius: '6px',
                border: '1px solid',
                borderColor: getCardBorderColor(parsed.testResultAlert.Status),
                backgroundColor: getCardBgColor(parsed.testResultAlert.Status),
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '0.8rem', color: 'var(--text-primary, #0f172a)' }}>Medical Verification</strong>
                  {getStatusBadge(parsed.testResultAlert.Status)}
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted, #334155)', lineHeight: 1.45 }}>
                  {parsed.testResultAlert.Summary}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (parsed.verdict && parsed.label) {
      return (
        <div
          className={`lab-result-entry__ai-verdict lab-result-entry__ai-verdict--${parsed.verdict}${
            parsed.isCompact ? ' lab-result-entry__ai-verdict--compact' : ''
          }`}
        >
          <div className="lab-result-entry__ai-verdict-head">
            <span className="lab-result-entry__ai-verdict-badge">{parsed.label}</span>
            <span className="lab-result-entry__ai-verdict-meta">{reviewedLabel}</span>
          </div>
          {parsed.detail ? (
            <p className="lab-result-entry__ai-verdict-detail">{parsed.detail}</p>
          ) : null}
        </div>
      )
    }

    return (
      <div className="lab-result-entry__ai-result">
        <p className="lab-result-entry__ai-result-text">{entry.reply}</p>
        <p className="lab-result-entry__ai-result-meta">{reviewedLabel}</p>
      </div>
    )
  }

  return (
    <div className="stack">
      <PageHeader
        title="Lab result management"
        description="Advance each order through lab processing, upload result PDFs when complete, run AI review, then release to the patient."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load orders.
          </p>
        </div>
      ) : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label="Filter orders">
          <ListFilterSearchField
            id="lab-result-patient"
            label="Patient"
            value={patientInput}
            onChange={(e) => setPatientInput(e.target.value)}
            disabled={!hasApi || listLoading}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="lab-result-status">
              Status
            </label>
            <select
              id="lab-result-status"
              className="list-filters-bar__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || '') as '' | ApiOrderStatus)}
              disabled={!hasApi || listLoading}
            >
              {LAB_RESULT_STATUS_OPTIONS.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={() => {
              setPatientInput('')
              setPatientName('')
              setStatusFilter('')
              setOrdersPage(1)
            }}
            disabled={!hasApi || listLoading}
          >
            Clear filters
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={!hasApi || listLoading}
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Select order</h3>
        <p className="lab-result-page-hint">
          Select one order in the table, then upload PDFs and run AI review in the result panel below.
        </p>
        <div className="table-wrap">
          <table className="data-table data-table--catalog">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Status</th>
                <th scope="col">Tests</th>
                <th scope="col">Collector</th>
                <th scope="col">Collect time</th>
                <th scope="col">Final (MMK)</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={7} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading orders" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="data-table__state">
                    {patientName || statusFilter
                      ? 'No orders match these filters.'
                      : 'No orders returned from the server.'}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className={orderId === o.id ? 'data-table__row--selected' : undefined}
                    onClick={() => selectOrderForResults(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        selectOrderForResults(o.id)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-selected={orderId === o.id}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="lab-result-order-patient">
                      <label
                        className="lab-result-order-pick"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <input
                          type="radio"
                          name="lab-result-order"
                          className="data-table__check lab-result-order-pick__input"
                          checked={orderId === o.id}
                          onChange={() => selectOrderForResults(o.id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`Select order for ${o.patient_name}`}
                        />
                        <span className="lab-result-order-pick__name">{o.patient_name}</span>
                      </label>
                    </td>
                    <td>{o.status}</td>
                    <td title={(o.items ?? []).map((it) => it.test_name ?? it.test_id).join(', ')}>
                      {orderTestsSummary(o)}
                    </td>
                    <td>{o.schedule?.collecting_person?.trim() || '—'}</td>
                    <td>{formatMaybeIsoWhen(o.schedule?.collection_time)}</td>
                    <td className="col-num">{o.final_price_mmk.toLocaleString()}</td>
                    <td>
                      {new Date(o.created_at).toLocaleString(undefined, {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!listLoading && hasApi && orders.length > 0 ? (
          <TablePagination
            mode="server"
            page={ordersPage}
            pageSize={ordersPageSize}
            itemsOnPage={orders.length}
            onPageChange={setOrdersPage}
            onPageSizeChange={(n) => {
              setOrdersPageSize(n)
              setOrdersPage(1)
            }}
          />
        ) : null}
      </div>

      <input
        ref={pdfInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="lab-result-pdf-input"
        aria-hidden
        tabIndex={-1}
        onChange={onPdfSelected}
      />

      {detailLoading ? (
        <div className="card">
          <div className="card-body-loading">
            <LoadingSpinner label="Loading order detail" />
          </div>
        </div>
      ) : null}

      {!detailLoading && !detail && !orderId ? (
        <div className="card lab-result-entry-empty">
          <p className="lab-result-entry-empty__text">
            Select an order in the table to upload result PDFs and run AI review.
          </p>
        </div>
      ) : null}

      {detail && !detailLoading ? (
        <div ref={resultEntryRef} className="card lab-result-entry">
          <header className="lab-result-entry__header">
            <div className="lab-result-entry__identity">
              <p className="lab-result-entry__eyebrow">Result entry</p>
              <div className="lab-result-entry__title-row">
                <h3 className="lab-result-entry__title">{detail.patient_name}</h3>
                <span className={labResultStatusBadgeClass(detail.status)}>{detail.status}</span>
              </div>
            </div>
            <dl className="lab-result-entry__meta">
              <div>
                <dt>Order ID</dt>
                <dd>
                  <code className="lab-result-entry__code">{detail.id}</code>
                </dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{detail.final_price_mmk.toLocaleString()} MMK</dd>
              </div>
              <div>
                <dt>Tests</dt>
                <dd>{detail.items.length}</dd>
              </div>
            </dl>
            <div className="lab-result-entry__workflow" aria-label="Lab processing steps">
              {detail.status === 'collecting' ? (
                <>
                  <p className="lab-result-entry__workflow-text">
                    Sample collection is in progress. Start lab processing when the sample arrives at the lab.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={statusSubmitting || !hasApi}
                    onClick={() => void advanceOrderStatus('running', 'Sample received — lab processing started')}
                  >
                    {statusSubmitting ? 'Updating…' : 'Start lab processing'}
                  </button>
                </>
              ) : detail.status === 'running' ? (
                <>
                  <p className="lab-result-entry__workflow-text">
                    Lab processing is underway. Mark complete when tests are finished, then upload result PDFs.
                  </p>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={statusSubmitting || !hasApi}
                    onClick={() => void advanceOrderStatus('completed', 'Lab run finished — ready for result upload')}
                  >
                    {statusSubmitting ? 'Updating…' : 'Mark lab complete'}
                  </button>
                </>
              ) : detail.status === 'completed' ? (
                <p className="lab-result-entry__workflow-text">
                  Lab run complete. Upload result PDFs, run AI review, then use{' '}
                  <strong>Release to patient</strong> when you are ready to deliver.
                  {hasIncorrectAiReview
                    ? ' One or more tests failed AI review — fix results before releasing.'
                    : allTestsHavePdf
                      ? allTestsPassedAiReview
                        ? ' All tests have PDFs and passed AI review — you can release to the patient.'
                        : aiReviewReleaseBlockers.missingReview.length > 0
                          ? ' All tests have PDFs — run AI review on every test before releasing.'
                          : ' All tests have PDFs — resolve AI review issues before releasing.'
                      : ` ${testsMissingPdf.length} test${testsMissingPdf.length === 1 ? '' : 's'} still need a PDF before you can release.`}
                </p>
              ) : detail.status === 'delivered' ? (
                <p className="lab-result-entry__workflow-text">
                  Results released to the patient. You can replace PDFs or re-run AI review if needed.
                </p>
              ) : null}
            </div>
          </header>

          {!canUploadPdfs && detail.status !== 'delivered' ? (
            <p className="lab-result-entry__warn" role="status">
              Result PDF upload unlocks after you mark the order <strong>completed</strong>.
            </p>
          ) : null}

          <section className="lab-result-entry__section" aria-labelledby="lab-result-tests-heading">
            <div className="lab-result-entry__section-head">
              <h4 id="lab-result-tests-heading" className="lab-result-entry__section-title">
                Tests
              </h4>
              <span className="lab-result-entry__section-hint">
                {uploadedItems.length} of {detail.items.length} with PDF
              </span>
            </div>

            {detail.items.length === 0 ? (
              <p className="lab-result-entry__empty">No tests on this order yet.</p>
            ) : (
              <>
                {showBulkPdfUpload ? (
                  <div className="lab-result-bulk-pdf" role="region" aria-label="Bulk test actions">
                    <div className="lab-result-bulk-pdf__inner">
                      <div className="lab-result-bulk-pdf__copy">
                        <p className="lab-result-bulk-pdf__title">
                          <span className="material-symbols-outlined lab-result-bulk-pdf__title-icon" aria-hidden>
                            checklist
                          </span>
                          Bulk actions for selected tests
                        </p>
                        <p className="lab-result-bulk-pdf__hint">
                          Select tests to upload one shared PDF, or run AI review on each selected test.
                        </p>
                      </div>
                      <div className="lab-result-bulk-pdf__actions">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={
                            uploadBusy ||
                            aiReviewLoadingTestIds.length > 0 ||
                            bulkPdfSelectedIds.length === 0
                          }
                          onClick={clearBulkPdfSelection}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={uploadBusy || bulkPdfSelectedIds.length === 0}
                          onClick={() => openPdfPicker(bulkPdfSelectedIds)}
                        >
                          {uploadBusy && uploadingTestIds.length > 1
                            ? `Uploading to ${uploadingTestIds.length}…`
                            : bulkPdfSelectedIds.length === 0
                              ? 'Upload to selected'
                              : `Upload to ${bulkPdfSelectedIds.length} selected`}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!bulkSelectedReviewMeta.canRun}
                          title={
                            bulkSelectedReviewMeta.count > 0 && !bulkSelectedReviewMeta.allHavePdf
                              ? 'All selected tests need a PDF'
                              : undefined
                          }
                          onClick={() => void runAiReviewForSelectedTests()}
                        >
                          {aiReviewLoadingTestIds.length > 1
                            ? `Reviewing ${aiReviewLoadingTestIds.length}…`
                            : bulkPdfSelectedIds.length === 0
                              ? 'AI review selected'
                              : `AI review ${bulkPdfSelectedIds.length} selected`}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : null}
                <ul className="lab-result-test-list">
                {labResultTestRows.map((row, idx) => {
                  if (row.kind === 'shared') {
                    const { items, memberTestIds, memberNames, label } = row
                    const hasFile = items.every((it) => itemHasUploadedPdf(it))
                    const groupMeta: SharedPdfGroupMeta = {
                      groupKey: row.groupKey,
                      label,
                      memberCount: items.length,
                      memberIndex: 0,
                      memberNames,
                      memberTestIds,
                    }
                    const isReviewing = memberTestIds.some((id) => aiReviewLoadingTestIds.includes(id))
                    const bulkSelected = memberTestIds.every((id) => bulkPdfSelectedIds.includes(id))
                    const bulkPartial =
                      !bulkSelected && memberTestIds.some((id) => bulkPdfSelectedIds.includes(id))
                    const showPdfControls = !isReleased && (canUploadPdfs || hasFile)
                    const rowStatus = resolveSharedPdfRowStatus(
                      memberTestIds,
                      detailItemsById,
                      aiReviewByTestId,
                      aiReviewLoadingTestIds,
                      aiReviewErrorByTestId,
                    )
                    const statusBadge = sharedPdfStatusBadge(rowStatus, groupMeta)
                    const isGroupUploadBusy =
                      uploadBusy && memberTestIds.some((id) => uploadingTestIds.includes(id))
                    const groupTone = `lab-result-test-card--shared-tone-${(label.charCodeAt(label.length - 1) - 64) % 4}`
                    const showAiPanels = memberTestIds.some(
                      (id) =>
                        aiReviewLoadingTestIds.includes(id) ||
                        aiReviewByTestId[id] ||
                        aiReviewErrorByTestId[id],
                    )
                    const groupAi = resolveSharedGroupAiDisplay(
                      memberTestIds,
                      aiReviewByTestId,
                      aiReviewLoadingTestIds,
                      aiReviewErrorByTestId,
                    )
                    const groupAiSectionClass = [
                      'lab-result-test-card__ai',
                      'lab-result-test-card__ai--shared-combined',
                      groupAi.loading ? 'lab-result-test-card__ai--loading' : '',
                      groupAi.verdict ? `lab-result-test-card__ai--${groupAi.verdict}` : '',
                      groupAi.error ? 'lab-result-test-card__ai--error' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')

                    return (
                      <li
                        key={`shared-${row.groupKey}-${idx}`}
                        className={[
                          'lab-result-test-card',
                          'lab-result-test-card--shared-pdf',
                          'lab-result-test-card--shared-bundle',
                          'lab-result-test-card--shared-only',
                          groupTone,
                          bulkSelected && showBulkPdfUpload ? 'lab-result-test-card--bulk-selected' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      >
                        <div className="lab-result-test-card__bundle">
                          <div className="lab-result-test-card__bundle-main">
                            {showBulkPdfUpload && showPdfControls ? (
                              <label className="lab-result-test-card__pick">
                                <input
                                  type="checkbox"
                                  className="lab-result-test-card__pick-input"
                                  checked={bulkSelected}
                                  ref={(el) => {
                                    if (el) el.indeterminate = bulkPartial
                                  }}
                                  disabled={uploadBusy}
                                  aria-label={`Include ${memberNames.join(', ')} in bulk actions`}
                                  onChange={() => toggleBulkPdfGroupSelect(memberTestIds)}
                                />
                              </label>
                            ) : null}
                            <div className="lab-result-test-card__bundle-icon" aria-hidden>
                              <span className="material-symbols-outlined">picture_as_pdf</span>
                            </div>
                            <div className="lab-result-test-card__bundle-copy">
                              <div className="lab-result-test-card__bundle-title-row">
                                <h5 className="lab-result-test-card__bundle-title">Combined report</h5>
                                <span className="lab-result-test-card__group-chip">{label}</span>
                              </div>
                              <p className="lab-result-test-card__bundle-sub">
                                {memberNames.length} tests share one PDF
                              </p>
                            </div>
                            {showPdfControls ? (
                              <div className="lab-result-test-card__status lab-result-test-card__status--bundle">
                                <span className={statusBadge.className}>{statusBadge.label}</span>
                              </div>
                            ) : null}
                          </div>
                          <div className="lab-result-test-card__chip-list" aria-label="Tests in this report">
                            {items.map((it) => {
                              const name = it.test_name?.trim() || it.test_id
                              const code = it.test_code?.trim() || '—'
                              return (
                                <span key={it.test_id} className="lab-result-test-card__chip">
                                  <span className="lab-result-test-card__chip-name">{name}</span>
                                  <span className="lab-result-test-card__chip-meta">
                                    {code} · Qty {it.quantity}
                                  </span>
                                </span>
                              )
                            })}
                          </div>
                          {showPdfControls ? (
                            <div
                              className={`lab-result-test-card__toolbar${
                                showBulkPdfUpload ? ' lab-result-test-card__toolbar--separate-only' : ''
                              }`}
                            >
                              <button
                                type="button"
                                className="lab-result-test-card__unlink-btn"
                                disabled={uploadBusy || isReviewing || aiReviewLoadingTestIds.length > 0}
                                title="Split into separate rows so each test can have its own PDF"
                                onClick={() => separateSharedPdfGroup(memberTestIds)}
                              >
                                <span className="material-symbols-outlined" aria-hidden>
                                  call_split
                                </span>
                                Separate PDFs
                              </button>
                              {!showBulkPdfUpload ? (
                                <div className="lab-result-test-card__toolbar-actions">
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm lab-result-test-card__action-btn"
                                    disabled={uploadBusy || !canUploadPdfs}
                                    onClick={() => openPdfPicker(memberTestIds)}
                                  >
                                    <span className="material-symbols-outlined" aria-hidden>
                                      upload_file
                                    </span>
                                    {isGroupUploadBusy ? 'Applying…' : 'Replace PDF'}
                                  </button>
                                  {hasFile ? (
                                    <button
                                      type="button"
                                      className="btn btn-primary btn-sm lab-result-test-card__action-btn lab-result-test-card__action-btn--ai"
                                      disabled={
                                        !aiReviewConfigured ||
                                        isReviewing ||
                                        uploadBusy ||
                                        aiReviewLoadingTestIds.length > 0
                                      }
                                      onClick={() => void runAiReviewForSelectedTests(memberTestIds)}
                                    >
                                      <span className="material-symbols-outlined" aria-hidden>
                                        auto_awesome
                                      </span>
                                      {isReviewing
                                        ? 'Reviewing…'
                                        : rowStatus === 'reviewed'
                                          ? 'Re-run AI review'
                                          : `AI review (${items.length})`}
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                          {hasFile ? renderPdfAccessButtons(items[0].test_id, label) : null}
                        </div>
                        {showAiPanels ? (
                          <div className="lab-result-test-card__shared-ai">
                            <div className={groupAiSectionClass}>
                              <p className="lab-result-test-card__ai-test-label">
                                Combined analysis · {memberNames.join(' · ')}
                              </p>
                              {renderAiReviewBody(groupAi.entry, groupAi.loading, groupAi.error)}
                            </div>
                          </div>
                        ) : null}
                      </li>
                    )
                  }

                  const it = row.item
                  const fileUrl = testResultFileUrl(it)
                  const hasFile = Boolean(fileUrl)
                  const isReviewing = aiReviewLoadingTestIds.includes(it.test_id)
                  const reviewed = Boolean(aiReviewByTestId[it.test_id]) && !isReviewing
                  const aiEntry = aiReviewByTestId[it.test_id]
                  const aiVerdict = aiEntry ? parseAiReviewReply(aiEntry.reply).verdict : null
                  const testName = it.test_name?.trim() || it.test_id
                  const testCode = it.test_code?.trim() || '—'
                  const aiSectionClass = [
                    'lab-result-test-card__ai',
                    isReviewing ? 'lab-result-test-card__ai--loading' : '',
                    aiVerdict ? `lab-result-test-card__ai--${aiVerdict}` : '',
                    aiReviewErrorByTestId[it.test_id] ? 'lab-result-test-card__ai--error' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')
                  const showPdfControls = !isReleased && (canUploadPdfs || hasFile)
                  const bulkSelected = bulkPdfSelectedIds.includes(it.test_id)
                  const rowStatus: SharedPdfRowStatus = !hasFile
                    ? 'awaiting'
                    : isReviewing
                      ? 'reviewing'
                      : aiReviewErrorByTestId[it.test_id]
                        ? 'error'
                        : reviewed
                          ? 'reviewed'
                          : 'uploaded'
                  const statusBadge = sharedPdfStatusBadge(rowStatus, undefined)
                  const isSingleUploadBusy =
                    uploadBusy && uploadingTestIds.length === 1 && uploadingTestIds[0] === it.test_id

                  return (
                    <li
                      key={`${it.test_id}-${idx}`}
                      className={[
                        'lab-result-test-card',
                        'lab-result-test-card--single',
                        bulkSelected && showBulkPdfUpload ? 'lab-result-test-card--bulk-selected' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <div
                        className={`lab-result-test-card__body${
                          showPdfControls
                            ? showBulkPdfUpload
                              ? ' lab-result-test-card__body--selectable'
                              : ''
                            : hasFile
                              ? ' lab-result-test-card__body--readonly'
                              : ' lab-result-test-card__body--info-only'
                        }`}
                      >
                        {showBulkPdfUpload && showPdfControls ? (
                          <label className="lab-result-test-card__pick">
                            <input
                              type="checkbox"
                              className="lab-result-test-card__pick-input"
                              checked={bulkSelected}
                              disabled={uploadBusy}
                              aria-label={`Include ${testName} in bulk actions`}
                              onChange={() => toggleBulkPdfSelect(it.test_id)}
                            />
                          </label>
                        ) : null}
                        <div className="lab-result-test-card__info lab-result-test-card__info--single">
                          <span className="lab-result-test-card__test-icon" aria-hidden>
                            <span className="material-symbols-outlined">science</span>
                          </span>
                          <div className="lab-result-test-card__info-text">
                            <span className="lab-result-test-card__name">{testName}</span>
                            <span className="lab-result-test-card__sub">
                              {testCode} · Qty {it.quantity}
                            </span>
                          </div>
                        </div>
                        {showPdfControls ? (
                          <div className="lab-result-test-card__status">
                            <span className={statusBadge.className}>{statusBadge.label}</span>
                          </div>
                        ) : null}
                        {showPdfControls ? (
                          <div className="lab-result-test-card__actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm lab-result-test-card__action-btn"
                              disabled={uploadBusy || !canUploadPdfs}
                              onClick={() => openPdfPicker(it.test_id)}
                            >
                              <span className="material-symbols-outlined" aria-hidden>
                                upload_file
                              </span>
                              {isSingleUploadBusy
                                ? 'Uploading…'
                                : hasFile
                                  ? 'Replace PDF'
                                  : showBulkPdfUpload
                                    ? 'Upload only this test'
                                    : 'Upload PDF'}
                            </button>
                            {hasFile ? (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm lab-result-test-card__action-btn lab-result-test-card__action-btn--ai"
                                disabled={
                                  !aiReviewConfigured ||
                                  isReviewing ||
                                  uploadBusy ||
                                  aiReviewLoadingTestIds.length > 0
                                }
                                onClick={() => void runAiReviewForTest(it.test_id)}
                              >
                                <span className="material-symbols-outlined" aria-hidden>
                                  auto_awesome
                                </span>
                                {isReviewing
                                  ? 'Reviewing…'
                                  : reviewed
                                    ? 'Re-run AI review'
                                    : 'AI review'}
                              </button>
                            ) : null}
                            {hasFile ? renderPdfActionButtons(it.test_id, testName) : null}
                          </div>
                        ) : hasFile ? (
                          renderPdfAccessButtons(it.test_id, testName)
                        ) : null}
                      </div>
                      {hasFile &&
                      (isReviewing ||
                        aiReviewByTestId[it.test_id] ||
                        aiReviewErrorByTestId[it.test_id]) ? (
                        <div className={aiSectionClass}>
                          {renderAiReviewBody(
                            aiReviewByTestId[it.test_id],
                            isReviewing,
                            aiReviewErrorByTestId[it.test_id] ?? null,
                          )}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
              </>
            )}
          </section>

          {!aiReviewConfigured ? (
            <p className="lab-result-entry__warn" role="status">
              AI review is not configured — set <code>VITE_AI_CONFIG_ID</code> and{' '}
              <code>VITE_LAB_RESULT_VALIDATION_PROMPT_ID</code> in <code>.env</code>, then restart the dev
              server.
            </p>
          ) : null}

          <footer className="lab-result-entry__footer">
            <p className="lab-result-entry__footer-text">
              {detail.status === 'delivered'
                ? 'This order has been released to the patient.'
                : detail.status !== 'completed'
                  ? 'Complete the lab run before uploading results or releasing.'
                  : uploadedItems.length === 0
                    ? 'Upload result PDFs for all tests to continue.'
                    : !allTestsHavePdf
                      ? `${uploadedItems.length} of ${detail.items.length} PDFs uploaded — upload all tests before releasing.`
                      : !aiReviewConfigured
                      ? 'Configure AI review, then run review on every test before releasing.'
                      : hasIncorrectAiReview
                        ? 'One or more tests failed AI review. Fix results and re-run review before releasing.'
                        : aiReviewReleaseBlockers.missingReview.length > 0
                          ? 'All tests have PDFs. Run AI review on every test before releasing to the patient.'
                          : aiReviewReleaseBlockers.warnings.length > 0 ||
                              aiReviewReleaseBlockers.errors.length > 0
                            ? 'Resolve AI review warnings or errors before releasing to the patient.'
                            : allTestsPassedAiReview
                              ? 'All tests have PDFs and passed AI review. You can release to the patient.'
                              : 'Complete AI review for all tests before releasing.'}
            </p>
            {detail.status === 'completed' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void releaseToPatient()}
                disabled={!canReleaseToPatient}
                title={releaseDisabledReason ?? undefined}
                aria-disabled={!canReleaseToPatient}
              >
                {releaseSubmitting ? 'Releasing…' : 'Release to patient'}
              </button>
            ) : detail.status === 'delivered' ? (
              <span className="badge badge--success">Released</span>
            ) : null}
          </footer>
        </div>
      ) : null}

      <ConfirmDialog
        open={releaseConfirmOpen}
        title="Release results to patient?"
        message={
          detail
            ? `Are you sure you want to release lab results for ${detail.patient_name.trim() || 'this patient'}? ${
                detail.items.length === 1
                  ? 'The patient will be able to view and download the test PDF in the app.'
                  : `All ${detail.items.length} test PDFs will become available for the patient to view and download in the app.`
              } This cannot be undone from this screen.`
            : 'Are you sure you want to release these results to the patient?'
        }
        confirmLabel={releaseSubmitting ? 'Releasing…' : 'Release to patient'}
        cancelLabel="Cancel"
        onConfirm={() => void confirmReleaseToPatient()}
        onCancel={() => !releaseSubmitting && setReleaseConfirmOpen(false)}
      />
    </div>
  )
}
