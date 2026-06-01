import { useEffect, useMemo, useRef, useState, type ChangeEventHandler } from 'react'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
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

const ORDER_STATUS_OPTIONS: { value: '' | ApiOrderStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'collecting', label: 'Collecting' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'delivered', label: 'Delivered' },
]

export function LabResultManagementPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError, showInfo } = useToast()
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
  const [aiReviewTestId, setAiReviewTestId] = useState<string | null>(null)
  const [aiReviewLoadingTestId, setAiReviewLoadingTestId] = useState<string | null>(null)
  const [aiReviewErrorByTestId, setAiReviewErrorByTestId] = useState<Record<string, string>>({})
  const [releaseReviewOpen, setReleaseReviewOpen] = useState(false)
  const [releaseReviewTestId, setReleaseReviewTestId] = useState<string | null>(null)

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
        if (!cancelled) {
          setOrders(list)
          if (list.length === 0 && ordersPage > 1) {
            setOrdersPage((p) => Math.max(1, p - 1))
          }
          setOrderId((prev) => (prev && list.some((o) => o.id === prev) ? prev : ''))
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
      setAiReviewTestId(null)
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
            const firstWithFile = d.items.find((it) => testResultFileUrl(it))
            setAiReviewTestId(firstWithFile?.test_id ?? null)
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

  const activeAiReview = useMemo(() => {
    if (!aiReviewTestId) return null
    return aiReviewByTestId[aiReviewTestId] ?? null
  }, [aiReviewByTestId, aiReviewTestId])

  const selectedAiConfig = useMemo(
    () => aiConfigs.find((c) => c.id === aiConfigId),
    [aiConfigs, aiConfigId],
  )

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

  const allOrdersOnPageSelected =
    orders.length > 0 && orders.every((o) => selectedOrderIds.has(o.id))
  const someOrdersOnPageSelected = orders.some((o) => selectedOrderIds.has(o.id))

  const selectedOrders = useMemo(
    () => orders.filter((o) => selectedOrderIds.has(o.id)),
    [orders, selectedOrderIds],
  )

  useEffect(() => {
    const el = selectAllPageRef.current
    if (el) el.indeterminate = someOrdersOnPageSelected && !allOrdersOnPageSelected
  }, [someOrdersOnPageSelected, allOrdersOnPageSelected])

  function focusOrderForResults(id: string) {
    setOrderId(id)
    setSelectedOrderIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  function toggleOrderSelection(id: string) {
    setSelectedOrderIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        setOrderId((active) => {
          if (active !== id) return active
          const remaining = [...next]
          return remaining[0] ?? ''
        })
      } else {
        next.add(id)
        setOrderId(id)
      }
      return next
    })
  }

  function toggleSelectAllOrdersOnPage() {
    if (allOrdersOnPageSelected) {
      setSelectedOrderIds(new Set())
      setOrderId('')
      return
    }
    const ids = orders.map((o) => o.id)
    setSelectedOrderIds(new Set(ids))
    setOrderId(ids[0] ?? '')
  }

  function clearOrderSelection() {
    setSelectedOrderIds(new Set())
    setOrderId('')
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
    setUploadBusy(true)
    try {
      await uploadOrderTestResult(detail.id, testId, file)
      const next = await fetchOrderById(detail.id)
      setDetail(next)
      setAiReviewTestId(testId)
      setAiReviewByTestId((prev) => {
        const nextMap = { ...prev }
        delete nextMap[testId]
        return nextMap
      })
      showSuccess('Result file uploaded. Run AI review when ready.')
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
    setAiReviewTestId(testId)
    setReleaseReviewTestId(testId)
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
    if (detail.status !== 'completed') {
      showError('Set the order status to completed in Order management when the lab run is finished.')
      return
    }
    if (uploadedItems.length === 0) {
      showError('Upload a result PDF for at least one test before release.')
      return
    }
    const first = uploadedItems[0]?.test_id ?? null
    setReleaseReviewTestId(first)
    setAiReviewTestId(first)
    setReleaseReviewOpen(true)
  }

  function confirmRelease() {
    if (!detail) return
    const notReviewed = uploadedItems.filter((it) => !aiReviewByTestId[it.test_id])
    if (notReviewed.length > 0) {
      const ok = window.confirm(
        `${notReviewed.length} uploaded test(s) have not been reviewed with AI yet. Release anyway?`,
      )
      if (!ok) return
    }
    setReleaseReviewOpen(false)
    showInfo(
      'Results are on the server and ready for your patient release process. Confirm handoff with operations if needed.',
    )
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
        description="Open an order, upload result PDFs, run AI review on each file, then confirm release when the order is completed."
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
              {ORDER_STATUS_OPTIONS.map((o) => (
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
          Check orders in the table, then upload PDFs and run AI review in the result panel below.
        </p>
        {selectedOrderIds.size > 0 ? (
          <div className="lab-result-selection-bar" role="status">
            <span className="lab-result-selection-bar__count">
              {selectedOrderIds.size} selected
            </span>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={clearOrderSelection}
            >
              Clear
            </button>
          </div>
        ) : null}
        <div className="table-wrap">
          <table className="data-table data-table--catalog">
            <thead>
              <tr>
                <th scope="col" className="col-check">
                  <input
                    ref={selectAllPageRef}
                    type="checkbox"
                    className="data-table__check"
                    checked={allOrdersOnPageSelected && orders.length > 0}
                    disabled={listLoading || orders.length === 0}
                    onChange={toggleSelectAllOrdersOnPage}
                    aria-label="Select all orders on this page"
                  />
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
                    className={
                      orderId === o.id
                        ? 'data-table__row--selected'
                        : selectedOrderIds.has(o.id)
                          ? 'data-table__row--checked'
                          : undefined
                    }
                    onClick={() => focusOrderForResults(o.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        focusOrderForResults(o.id)
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-selected={orderId === o.id}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="col-check" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="data-table__check"
                        checked={selectedOrderIds.has(o.id)}
                        onChange={() => toggleOrderSelection(o.id)}
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
            {selectedOrders.length > 1 ? (
              <div className="lab-result-entry__switcher-wrap">
                <p className="lab-result-entry__switcher-label">
                  {(() => {
                    const i = selectedOrders.findIndex((o) => o.id === orderId)
                    const n = i >= 0 ? i + 1 : 1
                    return `Viewing order ${n} of ${selectedOrders.length}`
                  })()}
                </p>
                <LabResultOrderSwitcher
                  orders={selectedOrders}
                  activeId={orderId}
                  onSelect={setOrderId}
                />
              </div>
            ) : null}
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
          </header>

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
                  const isActive = aiReviewTestId === it.test_id
                  const reviewing = aiReviewLoadingTestId === it.test_id
                  const testName = it.test_name?.trim() || it.test_id
                  const testCode = it.test_code?.trim() || '—'

                  return (
                    <li
                      key={`${it.test_id}-${idx}`}
                      className={
                        isActive
                          ? 'lab-result-test-card lab-result-test-card--active'
                          : 'lab-result-test-card'
                      }
                    >
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
                            disabled={uploadBusy}
                            onClick={() => openPdfPicker(it.test_id)}
                          >
                            {uploadBusy && uploadTestId === it.test_id
                              ? 'Uploading…'
                              : hasFile
                                ? 'Replace PDF'
                                : 'Upload PDF'}
                          </button>
                          {hasFile ? (
                            <button
                              type="button"
                              className={`btn btn-sm${isActive ? ' btn-primary' : ' btn-secondary'}`}
                              disabled={!aiConfigId || reviewing}
                              onClick={() => {
                                setAiReviewTestId(it.test_id)
                                if (!aiReviewByTestId[it.test_id]) void runAiReviewForTest(it.test_id)
                              }}
                            >
                              {reviewing ? 'Reviewing…' : reviewed ? 'Re-run AI' : 'AI review'}
                            </button>
                          ) : null}
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

          {aiReviewTestId && uploadedItems.some((it) => it.test_id === aiReviewTestId) ? (
            <section className="lab-result-entry__ai" aria-labelledby="lab-result-ai-heading">
              <div className="lab-result-entry__ai-head">
                <div>
                  <h4 id="lab-result-ai-heading" className="lab-result-entry__section-title">
                    AI review
                  </h4>
                  <p className="lab-result-entry__ai-sub">
                    {(() => {
                      const it = detail.items.find((i) => i.test_id === aiReviewTestId)
                      const name = it?.test_name?.trim() || aiReviewTestId
                      const code = it?.test_code?.trim()
                      return code ? `${name} (${code})` : name
                    })()}
                    {selectedAiConfig ? (
                      <>
                        {' '}
                        · <span className="lab-result-entry__ai-model">{selectedAiConfig.type}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={!aiConfigId || aiReviewLoadingTestId === aiReviewTestId}
                  onClick={() => void runAiReviewForTest(aiReviewTestId)}
                >
                  {aiReviewLoadingTestId === aiReviewTestId ? 'Reviewing…' : 'Run again'}
                </button>
              </div>
              <div className="lab-result-entry__ai-body">
                {renderAiReviewBody(
                  activeAiReview,
                  aiReviewLoadingTestId === aiReviewTestId,
                  aiReviewTestId ? aiReviewErrorByTestId[aiReviewTestId] ?? null : null,
                )}
              </div>
            </section>
          ) : uploadedItems.length > 0 ? (
            <p className="lab-result-entry__hint">
              Select <strong>AI review</strong> on a test with an uploaded PDF to preview analysis here.
            </p>
          ) : null}

          <footer className="lab-result-entry__footer">
            <p className="lab-result-entry__footer-text">
              {uploadedItems.length === 0
                ? 'Upload at least one result PDF to continue.'
                : `${uploadedItems.length} PDF${uploadedItems.length === 1 ? '' : 's'} ready for release review.`}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openReleaseReview}
              disabled={uploadedItems.length === 0}
            >
              Confirm release
            </button>
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
                            setAiReviewTestId(it.test_id)
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
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
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
                <button type="button" className="btn btn-secondary" onClick={() => setReleaseReviewOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={confirmRelease}>
                  Confirm release
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
