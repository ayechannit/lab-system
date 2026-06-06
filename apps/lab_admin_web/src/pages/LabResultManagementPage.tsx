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
import { fetchAiConfigs, type AiConfigRow } from '../services/aiConfigService'
import { reviewLabResultWithAi } from '../services/aiConversationService'
import { fetchPrompts, type PromptRow } from '../services/promptService'
import {
  fetchOrderById,
  fetchOrders,
  updateOrderStatus,
  uploadOrderTestResult,
  type ApiOrderDetailItem,
  type ApiOrderDetail,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import '../components/common/ui.css'

type AiReviewEntry = {
  reply: string
  reviewedAt: string
}

function testResultFileUrl(item: ApiOrderDetailItem): string | null {
  const d = item.download_url?.trim()
  if (d) return d
  const u = item.result_file_url?.trim()
  return u || null
}

function pickDefaultLabReviewPrompt(prompts: PromptRow[]): string {
  const match = prompts.find((p) => /lab|result|review/i.test(p.name))
  return match?.id ?? ''
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

function LabResultOrderSwitcher({
  orders,
  activeId,
  onSelect,
}: {
  orders: ApiOrderListRow[]
  activeId: string
  onSelect: (id: string) => void
}) {
  if (orders.length <= 1) return null
  return (
    <div className="lab-result-segmented" role="tablist" aria-label="Switch selected order">
      {orders.map((o) => (
        <button
          key={o.id}
          type="button"
          role="tab"
          aria-selected={activeId === o.id}
          className={
            activeId === o.id
              ? 'lab-result-segmented__btn lab-result-segmented__btn--active'
              : 'lab-result-segmented__btn'
          }
          onClick={() => onSelect(o.id)}
        >
          {o.patient_name}
        </button>
      ))}
    </div>
  )
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
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(() => new Set())
  const selectAllPageRef = useRef<HTMLInputElement>(null)
  const [detail, setDetail] = useState<ApiOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  useErrorToast(detailError)

  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadTestId, setUploadTestId] = useState<string | null>(null)
  const pdfInputRef = useRef<HTMLInputElement>(null)
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | ApiOrderStatus>('')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const [aiConfigs, setAiConfigs] = useState<AiConfigRow[]>([])
  const [aiConfigId, setAiConfigId] = useState('')
  const [promptId, setPromptId] = useState('')
  const [aiReviewByTestId, setAiReviewByTestId] = useState<Record<string, AiReviewEntry>>({})
  const [aiReviewLoadingTestId, setAiReviewLoadingTestId] = useState<string | null>(null)
  const [aiReviewErrorByTestId, setAiReviewErrorByTestId] = useState<Record<string, string>>({})
  const [releaseReviewOpen, setReleaseReviewOpen] = useState(false)
  const [releaseReviewTestId, setReleaseReviewTestId] = useState<string | null>(null)
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
    setSelectedOrderIds(new Set())
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
    if (!hasApi) {
      setAiConfigs([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const [configs, promptRows] = await Promise.all([fetchAiConfigs(), fetchPrompts()])
        if (cancelled) return
        setAiConfigs(configs)
        const preferred = configs.find((c) => c.type === 'gemini') ?? configs[0]
        setAiConfigId((prev) => (prev && configs.some((c) => c.id === prev) ? prev : preferred?.id ?? ''))
        setPromptId((prev) => {
          if (prev && promptRows.some((p) => p.id === prev)) return prev
          return pickDefaultLabReviewPrompt(promptRows)
        })
      } catch {
        /* AI settings optional until user runs review */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick])

  useEffect(() => {
    if (!hasApi || !orderId) {
      setDetail(null)
      setAiReviewByTestId({})
      setAiReviewErrorByTestId({})
      setReleaseReviewOpen(false)
      setReleaseReviewTestId(null)
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
            setAiReviewByTestId({})
            setAiReviewErrorByTestId({})
            setReleaseReviewOpen(false)
            setReleaseReviewTestId(null)
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

  const releaseReviewItem = useMemo(() => {
    if (!detail || !releaseReviewTestId) return null
    const it = detail.items.find((i) => i.test_id === releaseReviewTestId)
    if (!it || !testResultFileUrl(it)) return null
    return it
  }, [detail, releaseReviewTestId])

  const uploadedItems = useMemo(
    () => (detail?.items ?? []).filter((it) => testResultFileUrl(it)),
    [detail],
  )

  const allTestsHavePdf = Boolean(
    detail && detail.items.length > 0 && uploadedItems.length === detail.items.length,
  )

  const canUploadPdfs = detail ? canUploadResultPdfs(detail.status) : false

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

  function openPdfPicker(testId: string) {
    setUploadTestId(testId)
    pdfInputRef.current?.click()
  }

  const onPdfSelected: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    const testId = uploadTestId
    e.target.value = ''
    setUploadTestId(null)
    if (!file || !detail || !testId) return
    if (!canUploadResultPdfs(detail.status)) {
      showError('Mark the order completed before uploading result PDFs.')
      return
    }
    setUploadBusy(true)
    try {
      await uploadOrderTestResult(detail.id, testId, file)
      const next = await refreshOrderDetail(detail.id)
      setAiReviewByTestId((prev) => {
        const nextMap = { ...prev }
        delete nextMap[testId]
        return nextMap
      })
      if (next?.status === 'delivered') {
        showSuccess('Result uploaded. All tests have PDFs — order marked delivered.')
      } else {
        showSuccess('Result file uploaded.')
      }
    } catch (err) {
      showError(messageFromError(err, 'Upload failed'))
    } finally {
      setUploadBusy(false)
    }
  }

  async function runAiReviewForTest(testId: string) {
    if (!detail) return
    if (!aiConfigId) {
      showError('Add an AI configuration under AI configuration before running review.')
      return
    }
    const it = detail.items.find((i) => i.test_id === testId)
    const url = it ? testResultFileUrl(it) : null
    if (!it || !url) {
      showError('Upload a result PDF for this test first.')
      return
    }
    setAiReviewLoadingTestId(testId)
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

  function openReleaseReview() {
    if (!detail) return
    if (detail.status === 'delivered') {
      showError('This order is already marked delivered.')
      return
    }
    if (detail.status !== 'completed') {
      showError('Mark the order completed before releasing results to the patient.')
      return
    }
    if (uploadedItems.length === 0) {
      showError('Upload a result PDF for at least one test before release.')
      return
    }
    const first = uploadedItems[0]?.test_id ?? null
    setReleaseReviewTestId(first)
    setReleaseReviewOpen(true)
  }

  async function confirmRelease() {
    if (!detail) return
    const staffId = account?.id
    if (!staffId) {
      showError('Sign in with a staff account to release results.')
      return
    }
    if (detail.status === 'delivered') {
      setReleaseReviewOpen(false)
      showSuccess('Results already released.')
      return
    }
    if (detail.status !== 'completed') {
      showError('Mark the order completed before release.')
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
      setReleaseReviewOpen(false)
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
        <div className="lab-result-entry__ai-loading">
          <LoadingSpinner label="Running AI review" />
        </div>
      )
    }
    if (errorMessage) {
      return (
        <div className="lab-result-entry__ai-fail" role="alert">
          <p className="lab-result-entry__ai-fail-title">Review failed</p>
          <p className="lab-result-entry__ai-fail-message">{errorMessage}</p>
          {aiReviewErrorNeedsConfigFix(errorMessage) ? (
            <a href="/ai-config" className="lab-result-entry__ai-fail-link">
              Open AI configuration
            </a>
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
    return (
      <div className="lab-result-entry__ai-success">
        <p className="lab-result-entry__ai-success-text">{entry.reply}</p>
        <p className="lab-result-entry__ai-success-meta">
          Reviewed {new Date(entry.reviewedAt).toLocaleString()}
        </p>
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
        <div className="card lab-result-entry">
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
                  Lab run complete. Upload result PDFs, run AI review, then release to the patient.
                  {allTestsHavePdf
                    ? ' All tests have PDFs — releasing the last file also marks the order delivered automatically.'
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
              <ul className="lab-result-test-list">
                {detail.items.map((it, idx) => {
                  const fileUrl = testResultFileUrl(it)
                  const hasFile = Boolean(fileUrl)
                  const reviewed = Boolean(aiReviewByTestId[it.test_id])
                  const testName = it.test_name?.trim() || it.test_id
                  const testCode = it.test_code?.trim() || '—'

                  return (
                    <li key={`${it.test_id}-${idx}`} className="lab-result-test-card">
                      <div className="lab-result-test-card__body">
                        <div className="lab-result-test-card__info">
                          <span className="lab-result-test-card__name">{testName}</span>
                          <span className="lab-result-test-card__sub">
                            {testCode} · Qty {it.quantity}
                          </span>
                        </div>
                        <div className="lab-result-test-card__status">
                          {hasFile ? (
                            reviewed ? (
                              <span className="badge badge--success">AI reviewed</span>
                            ) : (
                              <span className="badge badge--success">PDF uploaded</span>
                            )
                          ) : (
                            <span className="badge badge--neutral">Awaiting PDF</span>
                          )}
                        </div>
                        <div className="lab-result-test-card__actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            disabled={uploadBusy || !canUploadPdfs}
                            onClick={() => openPdfPicker(it.test_id)}
                          >
                            {uploadBusy && uploadTestId === it.test_id
                              ? 'Uploading…'
                              : hasFile
                                ? 'Replace PDF'
                                : 'Upload PDF'}
                          </button>
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {!aiConfigId ? (
            <p className="lab-result-entry__warn" role="status">
              No AI model configured — add one under{' '}
              <a href="/ai-config" className="link">
                AI configuration
              </a>{' '}
              before running review.
            </p>
          ) : null}

          <footer className="lab-result-entry__footer">
            <p className="lab-result-entry__footer-text">
              {detail.status === 'delivered'
                ? 'This order has been released to the patient.'
                : detail.status !== 'completed'
                  ? 'Complete the lab run before uploading results or releasing.'
                  : uploadedItems.length === 0
                    ? 'Upload at least one result PDF to continue.'
                    : allTestsHavePdf
                      ? 'All tests have PDFs. Use Release to patient to run AI review and deliver.'
                      : `${uploadedItems.length} PDF${uploadedItems.length === 1 ? '' : 's'} uploaded — use Release to patient when ready.`}
            </p>
            {detail.status === 'completed' ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={openReleaseReview}
                disabled={uploadedItems.length === 0 || releaseSubmitting}
              >
                Release to patient
              </button>
            ) : detail.status === 'delivered' ? (
              <span className="badge badge--success">Released</span>
            ) : null}
          </footer>
        </div>
      ) : null}

      {releaseReviewOpen && detail ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lab-result-release-title"
          onMouseDown={(e) => e.target === e.currentTarget && setReleaseReviewOpen(false)}
        >
          <div
            className="modal-card modal-card--lab-result-release"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2 id="lab-result-release-title" className="modal-title">
                Review results before release
              </h2>
              <button
                type="button"
                className="btn btn-ghost modal-close"
                onClick={() => setReleaseReviewOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="lab-result-release-modal__body">
              <p style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', color: 'var(--muted)' }}>
                Review each uploaded result with AI for <strong>{detail.patient_name}</strong> before you confirm
                release.
              </p>
              <div className="lab-result-release-split">
                <ul className="lab-result-release-list">
                  {detail.items.map((it, idx) => {
                    const url = testResultFileUrl(it)
                    const selected = releaseReviewTestId === it.test_id
                    const reviewed = Boolean(aiReviewByTestId[it.test_id])
                    return (
                      <li key={`${it.test_id}-${idx}`}>
                        <button
                          type="button"
                          className={`lab-result-release-list__btn${selected ? ' lab-result-release-list__btn--active' : ''}`}
                          disabled={!url}
                          onClick={() => {
                            if (!url) return
                            setReleaseReviewTestId(it.test_id)
                          }}
                        >
                          <span className="lab-result-release-list__name">
                            {it.test_name?.trim() || it.test_id}
                          </span>
                          <span className="lab-result-release-list__meta">
                            {url ? (
                              reviewed ? (
                                <span className="badge badge--success">AI reviewed</span>
                              ) : (
                                <span className="badge badge--success">Uploaded</span>
                              )
                            ) : (
                              <span className="badge badge--warn">Missing file</span>
                            )}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
                <div className="lab-result-release-preview lab-result-ai-panel">
                  {releaseReviewItem && releaseReviewTestId ? (
                    <>
                      <div className="lab-result-ai-panel__head">
                        <span className="lab-result-release-preview__title">
                          {releaseReviewItem.test_name?.trim() || releaseReviewItem.test_id}
                        </span>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={!aiConfigId || aiReviewLoadingTestId === releaseReviewTestId}
                          onClick={() => void runAiReviewForTest(releaseReviewTestId)}
                        >
                          {aiReviewLoadingTestId === releaseReviewTestId ? 'Reviewing…' : 'Run AI review'}
                        </button>
                      </div>
                      {renderAiReviewBody(
                        aiReviewByTestId[releaseReviewTestId],
                        aiReviewLoadingTestId === releaseReviewTestId,
                        aiReviewErrorByTestId[releaseReviewTestId] ?? null,
                      )}
                    </>
                  ) : (
                    <div className="lab-result-release-preview__empty">
                      Select a test with an uploaded file to see its AI review here.
                    </div>
                  )}
                </div>
              </div>
              {detail.items.some((it) => !testResultFileUrl(it)) ? (
                <p style={{ marginTop: '0.85rem', fontSize: '0.85rem', color: '#9a6700' }} role="status">
                  Some tests have no result file yet. You can still release if that is intentional.
                </p>
              ) : null}
              <div className="row-actions" style={{ marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReleaseReviewOpen(false)} disabled={releaseSubmitting}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={releaseSubmitting}
                  onClick={() => void confirmRelease()}
                >
                  {releaseSubmitting ? 'Releasing…' : 'Release to patient'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
