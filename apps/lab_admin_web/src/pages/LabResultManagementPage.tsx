import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
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
import { reviewLabResultWithAi } from '../services/aiConversationService'
import {
  fetchOrderById,
  fetchOrders,
  updateOrderStatus,
  uploadOrderTestResult,
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

function parseAiReviewReply(reply: string): ParsedAiReview {
  const trimmed = reply.trim()
  if (!trimmed) {
    return { verdict: null, label: null, detail: null, isCompact: true }
  }

  // Attempt to parse structured JSON
  const jsonObj = extractJsonObject(trimmed)
  if (jsonObj && typeof jsonObj === 'object') {
    const profile = jsonObj.ProfileAlert as AlertDetail | undefined
    const testResult = jsonObj.TestResultAlert as AlertDetail | undefined

    if (profile || testResult) {
      let verdict: AiReviewVerdict = 'pass'
      const statusP = profile?.Status?.toUpperCase() || ''
      const statusT = testResult?.Status?.toUpperCase() || ''

      if (statusP.includes('ERROR') || statusP.includes('FAIL') || statusP.includes('INCORRECT') ||
          statusT.includes('ERROR') || statusT.includes('FAIL') || statusT.includes('INCORRECT')) {
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
        testResultAlert: testResult || null
      }
    }
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

function formatAiReviewedAt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })
}

function testResultFileUrl(item: ApiOrderDetailItem): string | null {
  const d = item.download_url?.trim()
  if (d) return d
  const u = item.result_file_url?.trim()
  return u || null
}

function testResultStorageKey(item: ApiOrderDetailItem): string | null {
  const u = item.result_file_url?.trim()
  return u || null
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
  const [aiReviewLoadingTestId, setAiReviewLoadingTestId] = useState<string | null>(null)
  const [aiReviewErrorByTestId, setAiReviewErrorByTestId] = useState<Record<string, string>>({})
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [releaseSubmitting, setReleaseSubmitting] = useState(false)

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
  }, [detail, detailLoading, aiReviewLoadingTestId])

  const uploadedItems = useMemo(
    () => (detail?.items ?? []).filter((it) => testResultFileUrl(it)),
    [detail],
  )

  const allTestsHavePdf = Boolean(
    detail && detail.items.length > 0 && uploadedItems.length === detail.items.length,
  )

  const hasIncorrectAiReview = useMemo(() => {
    if (!detail) return false
    return detail.items.some((it) => {
      const entry = aiReviewByTestId[it.test_id]
      if (!entry) return false
      return parseAiReviewReply(entry.reply).verdict === 'fail'
    })
  }, [detail, aiReviewByTestId])

  const canUploadPdfs = detail ? canUploadResultPdfs(detail.status) : false

  const showBulkPdfUpload = Boolean(canUploadPdfs && detail && detail.items.length > 1)

  const sharedPdfTestIds = useMemo(() => {
    const groups = new Map<string, string[]>()
    for (const it of detail?.items ?? []) {
      const key = testResultStorageKey(it)
      if (!key) continue
      const list = groups.get(key) ?? []
      list.push(it.test_id)
      groups.set(key, list)
    }
    const shared = new Set<string>()
    for (const ids of groups.values()) {
      if (ids.length > 1) ids.forEach((id) => shared.add(id))
    }
    return shared
  }, [detail?.items])

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

  function selectBulkPdfAwaiting() {
    if (!detail) return
    setBulkPdfSelectedIds(
      detail.items.filter((it) => !testResultStorageKey(it)).map((it) => it.test_id),
    )
  }

  function selectBulkPdfAll() {
    if (!detail) return
    setBulkPdfSelectedIds(detail.items.map((it) => it.test_id))
  }

  function clearBulkPdfSelection() {
    setBulkPdfSelectedIds([])
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
      const uploaded: string[] = []
      for (const testId of targets) {
        await uploadOrderTestResult(detail.id, testId, file)
        uploaded.push(testId)
      }
      const next = await refreshOrderDetail(detail.id)
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

  async function runAiReviewForTest(testId: string) {
    if (!detail) return
    if (!aiReviewConfigured) {
      showError('Set VITE_AI_CONFIG_ID and VITE_LAB_RESULT_VALIDATION_PROMPT_ID in .env before running review.')
      return
    }
    const it = detail.items.find((i) => i.test_id === testId)
    const url = it ? testResultFileUrl(it) : null
    if (!it || !url) {
      showError('Upload a result PDF for this test first.')
      return
    }
    setAiReviewLoadingTestId(testId)
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
      showSuccess('AI review complete.')
    } catch (err) {
      const msg = friendlyAiReviewErrorMessage(err)
      setAiReviewErrorByTestId((prev) => ({ ...prev, [testId]: msg }))
    } finally {
      setAiReviewLoadingTestId(null)
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
      showError('Upload result PDFs for all tests before release.')
      return
    }
    if (hasIncorrectAiReview) {
      showError('Cannot release: one or more tests were marked incorrect by AI review. Fix results and re-run review.')
      return
    }
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
                <th scope="col" className="col-check">
                  <span className="visually-hidden">Select</span>
                </th>
                <th scope="col">Patient</th>
                <th scope="col">Status</th>
                <th scope="col">Tests</th>
                <th scope="col">Final (MMK)</th>
                <th scope="col">Created</th>
              </tr>
            </thead>
            <tbody>
              {listLoading ? (
                <tr>
                  <td colSpan={6} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading orders" />
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="data-table__state">
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
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="radio"
                        name="lab-result-order"
                        className="data-table__check"
                        checked={orderId === o.id}
                        onChange={() => selectOrderForResults(o.id)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select order for ${o.patient_name}`}
                      />
                    </td>
                    <td>{o.patient_name}</td>
                    <td>{o.status}</td>
                    <td title={(o.items ?? []).map((it) => it.test_name ?? it.test_id).join(', ')}>
                      {orderTestsSummary(o)}
                    </td>
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
                      ? ' All tests have PDFs — you can release when review is done.'
                      : null}
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
                  <div className="lab-result-bulk-pdf" role="region" aria-label="Shared PDF upload">
                    <div className="lab-result-bulk-pdf__copy">
                      <p className="lab-result-bulk-pdf__title">One PDF for multiple tests</p>
                      <p className="lab-result-bulk-pdf__hint">
                        Check the tests that share the same report, upload once, then use each row below for any
                        different PDF.
                      </p>
                    </div>
                    <div className="lab-result-bulk-pdf__toolbar">
                      <div className="lab-result-bulk-pdf__quick">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={uploadBusy}
                          onClick={selectBulkPdfAwaiting}
                        >
                          Awaiting PDF
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={uploadBusy}
                          onClick={selectBulkPdfAll}
                        >
                          All tests
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={uploadBusy || bulkPdfSelectedIds.length === 0}
                          onClick={clearBulkPdfSelection}
                        >
                          Clear
                        </button>
                      </div>
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
                    </div>
                  </div>
                ) : null}
                <ul className="lab-result-test-list">
                {detail.items.map((it, idx) => {
                  const fileUrl = testResultFileUrl(it)
                  const hasFile = Boolean(fileUrl)
                  const isReviewing = aiReviewLoadingTestId === it.test_id
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
                  const showPdfControls = canUploadPdfs || hasFile
                  const bulkSelected = bulkPdfSelectedIds.includes(it.test_id)
                  const isSharedPdf = sharedPdfTestIds.has(it.test_id)
                  const isSingleUploadBusy = uploadBusy && uploadingTestIds.length === 1 && uploadingTestIds[0] === it.test_id
                  const isBulkUploadBusy =
                    uploadBusy && uploadingTestIds.includes(it.test_id) && uploadingTestIds.length > 1

                  return (
                    <li
                      key={`${it.test_id}-${idx}`}
                      className={`lab-result-test-card${bulkSelected && showBulkPdfUpload ? ' lab-result-test-card--bulk-selected' : ''}`}
                    >
                      <div
                        className={`lab-result-test-card__body${
                          showPdfControls
                            ? showBulkPdfUpload
                              ? ' lab-result-test-card__body--selectable'
                              : ''
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
                              aria-label={`Include ${testName} in shared PDF upload`}
                              onChange={() => toggleBulkPdfSelect(it.test_id)}
                            />
                          </label>
                        ) : null}
                        <div className="lab-result-test-card__info">
                          <span className="lab-result-test-card__name">{testName}</span>
                          <span className="lab-result-test-card__sub">
                            {testCode} · Qty {it.quantity}
                            {isSharedPdf ? (
                              <span className="lab-result-test-card__shared-tag"> · Shared PDF</span>
                            ) : null}
                          </span>
                        </div>
                        {showPdfControls ? (
                          <div className="lab-result-test-card__status">
                            {hasFile ? (
                              isReviewing ? (
                                <span className="badge badge--warn">Reviewing…</span>
                              ) : reviewed ? (
                                <span className="badge badge--success">AI reviewed</span>
                              ) : (
                                <span className="badge badge--success">PDF uploaded</span>
                              )
                            ) : (
                              <span className="badge badge--neutral">Awaiting PDF</span>
                            )}
                          </div>
                        ) : null}
                        {showPdfControls ? (
                          <div className="lab-result-test-card__actions">
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={uploadBusy || !canUploadPdfs}
                              onClick={() => openPdfPicker(it.test_id)}
                            >
                              {isSingleUploadBusy
                                ? 'Uploading…'
                                : isBulkUploadBusy
                                  ? 'Applying…'
                                  : hasFile
                                    ? 'Replace PDF'
                                    : showBulkPdfUpload
                                      ? 'Upload only this test'
                                      : 'Upload PDF'}
                            </button>
                            {hasFile ? (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={
                                  !aiReviewConfigured ||
                                  isReviewing ||
                                  uploadBusy
                                }
                                onClick={() => void runAiReviewForTest(it.test_id)}
                              >
                                {isReviewing
                                  ? 'Reviewing…'
                                  : reviewed
                                    ? 'Re-run AI review'
                                    : 'AI review'}
                              </button>
                            ) : null}
                          </div>
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
                    : hasIncorrectAiReview
                      ? 'One or more tests failed AI review. Fix results and re-run review before releasing.'
                      : allTestsHavePdf
                        ? 'All tests have PDFs. Release to patient when review is complete.'
                        : `${uploadedItems.length} of ${detail.items.length} PDFs uploaded — upload all tests before releasing.`}
            </p>
            {detail.status === 'completed' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void releaseToPatient()}
                disabled={!allTestsHavePdf || hasIncorrectAiReview || releaseSubmitting}
              >
                {releaseSubmitting ? 'Releasing…' : 'Release to patient'}
              </button>
            ) : detail.status === 'delivered' ? (
              <span className="badge badge--success">Released</span>
            ) : null}
          </footer>
        </div>
      ) : null}
    </div>
  )
}
