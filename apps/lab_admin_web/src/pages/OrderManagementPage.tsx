import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { ApiConfigBanner } from '../components/common/ApiConfigBanner'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { formatCoordPair, hasUsableCoords, LocationMapPicker } from '../components/users/LocationMapPicker'
import type { EndUserRole, LabTestCatalogRow, UserListRow } from '../model/types'
import { getApiBaseUrl, isApiMode } from '../services/apiBase'
import { fetchAllDiscounts, type TestDiscountListRow } from '../services/discountService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import {
  createPayment,
  fetchPaymentsByOrderId,
  PAYMENT_METHOD_OPTIONS,
  type ApiPaymentMethod,
  type ApiPaymentOrderSummary,
  type ApiPaymentStatus,
} from '../services/paymentService'
import {
  addOrderItems,
  createOrder,
  deleteOrder,
  fetchOrderById,
  fetchOrders,
  type ApiOrderDetail,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
  syncPendingOrder,
  updateOrder,
} from '../services/orderService'
import { useAddressGeocode } from '../hooks/useAddressGeocode'
import { fetchUserList } from '../services/userService'
import {
  calculateServiceFee,
  type CalculateServiceFeeResult,
} from '../services/serviceGeofenceService'
import { fetchActiveMaterialFees, type MaterialFeeRow } from '../services/materialFeeService'
import '../components/common/ui.css'
import i18n from '../i18n'
import { formatReportDeliveryMethod } from '../utils/orderDisplay'
import {
  orderPriorityLabel,
  orderStatusLabel,
  paymentDisplayKeyLabel,
  type PaymentDisplayKey,
} from '../utils/orderLabels'
import { roleLabel } from '../utils/roleLabels'

const ORDER_STATUS_OPTIONS: ApiOrderStatus[] = [
  'pending',
  'scheduled',
  'collecting',
  'running',
  'completed',
  'delivered',
]

function statusBadgeClass(status: ApiOrderStatus): string {
  const map: Record<ApiOrderStatus, string> = {
    pending: 'badge badge--warn',
    scheduled: 'badge badge--neutral',
    collecting: 'badge badge--neutral',
    running: 'badge badge--neutral',
    completed: 'badge badge--success',
    delivered: 'badge badge--success',
  }
  return map[status]
}

function priorityBadgeClass(priority: 'urgent' | 'elective'): string {
  return priority === 'urgent' ? 'badge badge--danger' : 'badge badge--neutral'
}

function normalizePaymentStatusForDisplay(
  status: ApiPaymentStatus | 'unpaid',
): ApiPaymentStatus | 'unpaid' {
  return status === 'verified' ? 'received' : status
}

function paymentBadgeClass(status: ApiPaymentStatus | 'unpaid', fullyPaid = false): string {
  const displayStatus = normalizePaymentStatusForDisplay(status)
  if (fullyPaid && displayStatus === 'received') return 'badge badge--success'
  const map: Record<ApiPaymentStatus | 'unpaid', string> = {
    unpaid: 'badge badge--danger',
    pending: 'badge badge--warn',
    received: 'badge badge--neutral',
    verified: 'badge badge--neutral',
    failed: 'badge badge--danger',
  }
  return map[displayStatus]
}

function orderPaymentAmounts(
  payData: ApiPaymentOrderSummary | undefined,
  finalPriceMmk: number,
): { total: number; paid: number; balance: number; percentPaid: number } {
  if (payData) {
    const total = payData.summary.total_price
    const paid = payData.summary.total_paid
    const balance = Math.max(0, payData.summary.balance)
    const percentPaid = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
    return { total, paid, balance, percentPaid }
  }
  const total = finalPriceMmk
  const balance = Math.max(0, finalPriceMmk)
  return { total, paid: 0, balance, percentPaid: 0 }
}


function PaymentModalSummary({ amounts }: { amounts: ReturnType<typeof orderPaymentAmounts> }) {
  const { t } = useTranslation()
  const due = amounts.balance > 0 ? amounts.balance : 0
  const fullyPaid = amounts.total > 0 && due <= 0
  const pct = amounts.percentPaid

  return (
    <div className="payment-sheet" role="group" aria-label={t('orders.paymentModal.summaryAria')}>
      <div
        className="payment-sheet__progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={t('orders.table.percentPaid', { pct })}
      >
        <div
          className={[
            'payment-sheet__progress-fill',
            fullyPaid ? 'payment-sheet__progress-fill--complete' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="payment-sheet__meta">
        <span>{t('orders.table.percentCollected', { pct })}</span>
        {fullyPaid ? <span className="payment-sheet__status">{t('orders.paymentModal.paidInFull')}</span> : null}
      </div>

      <div
        className={[
          'payment-sheet__hero',
          due > 0 ? 'payment-sheet__hero--due' : fullyPaid ? 'payment-sheet__hero--clear' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <span className="payment-sheet__hero-label">
          {due > 0 ? t('orders.paymentModal.amountDue') : t('orders.paymentModal.balanceRemaining')}
        </span>
        <span className="payment-sheet__hero-value">
          {due.toLocaleString()}
          <span>{t('orders.currency')}</span>
        </span>
      </div>

      <dl className="payment-sheet__breakdown">
        <div>
          <dt>{t('orders.paymentModal.orderTotal')}</dt>
          <dd>
            {amounts.total.toLocaleString()} {t('orders.currency')}
          </dd>
        </div>
        <div>
          <dt>{t('orders.paymentModal.alreadyPaid')}</dt>
          <dd>
            {amounts.paid.toLocaleString()} {t('orders.currency')}
          </dd>
        </div>
      </dl>
    </div>
  )
}

type OrderPaymentListDisplay = {
  labelKey: PaymentDisplayKey
  status: ApiPaymentStatus | 'unpaid'
  /** Order fully paid — used for green badge on `received` */
  fullyPaid?: boolean
}

/** Label + badge for the order list payment column. */
function orderPaymentListDisplay(
  data: ApiPaymentOrderSummary | undefined,
  finalPriceMmk: number,
): OrderPaymentListDisplay {
  if (!data) return { labelKey: 'unpaid', status: 'unpaid' }
  const { balance, total_price, total_paid } = data.summary
  const history = data.history
  const total = total_price > 0 ? total_price : finalPriceMmk
  const fullyPaid = total > 0 && balance <= 0 && total_paid > 0

  if (history.length === 0) {
    return balance <= 0 && total <= 0
      ? { labelKey: 'unpaid', status: 'unpaid' }
      : { labelKey: 'unpaid', status: 'unpaid' }
  }

  const failedOnly = history.every((p) => p.status === 'failed')
  if (failedOnly) return { labelKey: 'failed', status: 'failed' }

  if (fullyPaid) {
    return { labelKey: 'received', status: 'received', fullyPaid: true }
  }

  if (balance > 0) {
    const pending = history.find((p) => p.status === 'pending')
    if (pending) return { labelKey: 'pending', status: 'pending' }
    if (total_paid > 0) {
      return { labelKey: 'partialReceived', status: 'received', fullyPaid: false }
    }
    return { labelKey: 'unpaid', status: 'unpaid' }
  }

  const latest = history[history.length - 1]
  const status = normalizePaymentStatusForDisplay(latest.status)
  return { labelKey: status as PaymentDisplayKey, status }
}

function paymentSummaryForOrder(
  orderId: string,
  paymentMap: Map<string, ApiPaymentOrderSummary>,
  detail?: ApiOrderDetail | null,
  listRow?: Pick<ApiOrderListRow, 'final_price_mmk'>,
): ApiPaymentOrderSummary | undefined {
  const fromMap = paymentMap.get(orderId)
  if (fromMap) return fromMap
  if (detail?.id === orderId && detail.payments) {
    return {
      summary: {
        total_price: detail.final_price_mmk,
        total_paid: detail.total_paid_mmk ?? 0,
        balance:
          detail.balance_mmk ?? detail.final_price_mmk - (detail.total_paid_mmk ?? 0),
      },
      history: detail.payments,
    }
  }
  if (listRow) {
    return {
      summary: { total_price: listRow.final_price_mmk, total_paid: 0, balance: listRow.final_price_mmk },
      history: [],
    }
  }
  return undefined
}

function fmtDateTime(raw: string | undefined): string {
  if (!raw) return i18n.t('common.none')
  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) return raw
  return d.toLocaleString()
}

/** Role for discounts: prefer value from order detail (join), else admin user list. */
function resolveOrderingUserRole(
  order: Pick<ApiOrderDetail, 'user_id' | 'ordering_user_role'>,
  userMap: Map<string, UserListRow>,
): EndUserRole | undefined {
  const uid = order.user_id
  if (!uid) return undefined
  const r = order.ordering_user_role?.trim()
  if (r === 'clinic' || r === 'doctor' || r === 'patient') return r
  return userMap.get(uid)?.role
}

function renderOrderingUser(
  userId: string | undefined,
  orderingUserName: string | null | undefined,
  userMap: Map<string, UserListRow>,
) {
  if (!userId) {
    return <span className="order-detail-value">{i18n.t('common.none')}</span>
  }
  const fromOrder = orderingUserName?.trim()
  const fromList = userMap.get(userId)?.name?.trim()
  const name = fromOrder || fromList || ''
  if (!name) {
    return <span className="order-detail-value order-detail-value--id">{userId}</span>
  }
  return (
    <div className="order-detail-ordering-user">
      <span className="order-detail-value">{name}</span>
      <span className="order-detail-ordering-user__id" title={userId}>
        {userId}
      </span>
    </div>
  )
}

/** SQL `bit` and JSON may arrive as 0/1; treat any truthy as assigned. */
function testsAssignedFlag(v: boolean | number | null | undefined): boolean {
  return v === true || v === 1
}

function prescriptionLooksPdf(url: string): boolean {
  const base = url.split('?')[0].toLowerCase()
  return base.endsWith('.pdf') || base.includes('.pdf')
}

function prescriptionLooksImage(url: string): boolean {
  return /\.(png|jpe?g|gif|webp|bmp)$/i.test(url.split('?')[0])
}

/** Same-origin path for dev embeds so PDF iframes load via Vite `/uploads` → API proxy. */
function prescriptionEmbedSrc(downloadUrl: string): string {
  if (!import.meta.env.DEV) return downloadUrl
  const api = getApiBaseUrl()
  if (!api) return downloadUrl
  try {
    const file = new URL(downloadUrl)
    const base = new URL(api)
    if (file.origin === base.origin && file.pathname.startsWith('/uploads/')) {
      return `${file.pathname}${file.search}${file.hash}`
    }
  } catch {
    /* ignore */
  }
  return downloadUrl
}

/** Prefer signed download URL for preview; fall back to stored path/URL. */
function orderPrescriptionAttachmentUrl(order: {
  prescription_download_url?: string | null
  prescription_url?: string | null
}): string | null {
  const d = order.prescription_download_url?.trim()
  if (d) return d
  const u = order.prescription_url?.trim()
  return u || null
}

function PrescriptionPreviewBlock({ url, compact }: { url: string; compact?: boolean }) {
  const { t } = useTranslation()
  const u = url.trim()
  if (!u) return null
  return (
    <div
      className="order-detail-section order-detail-section--prescription"
      style={compact ? { marginBottom: '0.65rem' } : undefined}
    >
      <h3 className="order-detail-section__title">{t('orders.prescription.title')}</h3>
      {prescriptionLooksImage(u) ? (
        <div className="order-prescription-preview order-prescription-preview--image-only">
          <img
            className="order-prescription-preview__img"
            src={prescriptionEmbedSrc(u)}
            alt={t('orders.prescription.alt')}
          />
          <div className="order-prescription-preview__foot">
            <a className="btn btn-secondary" href={u} target="_blank" rel="noopener noreferrer">
              {t('orders.prescription.openInNewTab')}
            </a>
          </div>
        </div>
      ) : prescriptionLooksPdf(u) ? (
        <div className="order-prescription-pdf-card">
          <p className="order-prescription-pdf-card__text">{t('orders.prescription.pdfHint')}</p>
          <a className="btn btn-primary" href={u} target="_blank" rel="noopener noreferrer">
            {t('orders.prescription.viewPdf')}
          </a>
        </div>
      ) : (
        <a className="btn btn-secondary" href={u} target="_blank" rel="noopener noreferrer">
          {t('orders.prescription.openInNewTab')}
        </a>
      )}
    </div>
  )
}

/** Embedded PDF / image preview while assigning tests (right column uses default tall panel). */
function PrescriptionPanelEmbed({ url }: { url: string }) {
  const { t } = useTranslation()
  const u = url.trim()
  if (!u) return null
  const src = prescriptionEmbedSrc(u)
  return (
    <div className="assign-tests-prescription-panel">
      <div className="assign-tests-prescription-panel__header">{t('orders.prescription.preview')}</div>
      <div className="assign-tests-prescription-panel__body">
        {prescriptionLooksImage(u) ? (
          <img src={src} alt={t('orders.prescription.alt')} />
        ) : prescriptionLooksPdf(u) ? (
          <iframe title={t('orders.prescription.pdfTitle')} src={src} />
        ) : (
          <div style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            <p style={{ margin: '0 0 0.65rem' }}>{t('orders.prescription.pdfHint')}</p>
            <a className="btn btn-secondary" href={u} target="_blank" rel="noopener noreferrer">
              {t('orders.prescription.openInNewTab')}
            </a>
          </div>
        )}
      </div>
      <div className="assign-tests-prescription-panel__foot">
        <a className="btn btn-ghost" href={u} target="_blank" rel="noopener noreferrer">
          {t('orders.prescription.openInNewTab')}
        </a>
      </div>
    </div>
  )
}

function coordsForOrderApi(lat: number | '', lng: number | ''): { latitude: number | null; longitude: number | null } {
  const la = typeof lat === 'number' ? lat : Number.parseFloat(String(lat))
  const ln = typeof lng === 'number' ? lng : Number.parseFloat(String(lng))
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return { latitude: null, longitude: null }
  if (la === 0 && ln === 0) return { latitude: null, longitude: null }
  return { latitude: la, longitude: ln }
}

/** Max options in test dropdowns per filter (keeps UI fast for large catalogs). */
const ORDER_TEST_PICKER_LIMIT = 100

/** Tests matching `query`, excluding `excludeIds`, capped at `limit`; `totalMatches` is before cap. */
function filterTestsForOrderDropdown(
  allTests: LabTestCatalogRow[],
  query: string,
  excludeIds: ReadonlySet<string>,
  limit: number,
): { rows: LabTestCatalogRow[]; totalMatches: number } {
  const q = query.trim().toLowerCase()
  const matched = allTests.filter((t) => !excludeIds.has(t.id)).filter((t) => {
    if (!q) return true
    return (
      t.test_name.toLowerCase().includes(q) ||
      t.test_code.toLowerCase().includes(q) ||
      (t.description?.toLowerCase().includes(q) ?? false)
    )
  })
  return { rows: matched.slice(0, limit), totalMatches: matched.length }
}

/** Active test discount for an end-user role; prefers a specific role row over `all`. */
function activeDiscountPercentForOrder(
  discounts: TestDiscountListRow[],
  testId: string,
  userRole: EndUserRole | undefined,
): number {
  if (!testId || !userRole) return 0
  const active = discounts.filter((d) => d.test_id === testId && !d.is_deleted && d.is_active)
  const roleRow = active.find((d) => d.role === userRole)
  if (roleRow) return Math.max(0, Math.min(100, roleRow.discount_percent))
  const allRow = active.find((d) => d.role === 'all')
  if (allRow) return Math.max(0, Math.min(100, allRow.discount_percent))
  return 0
}

type OrderTestCheckboxPickerProps = {
  disabled: boolean
  open: boolean
  onOpenChange: (next: boolean) => void
  rows: LabTestCatalogRow[]
  totalMatches: number
  selectedIds: string[]
  onToggle: (testId: string) => void
  userRole: EndUserRole | undefined
  testDiscounts: TestDiscountListRow[]
  triggerId: string
  listId: string
  filterValue: string
  onFilterChange: (value: string) => void
  filterInputId: string
}

/** Select-style trigger that opens a panel with search + checkboxes (native `<select>` cannot). */
function OrderTestCheckboxPicker({
  disabled,
  open,
  onOpenChange,
  rows,
  totalMatches,
  selectedIds,
  onToggle,
  userRole,
  testDiscounts,
  triggerId,
  listId,
  filterValue,
  onFilterChange,
  filterInputId,
}: OrderTestCheckboxPickerProps) {
  const { t } = useTranslation()
  const wrapRef = useRef<HTMLDivElement>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const n = selectedIds.length
  const summary = n === 0 ? t('orders.testPicker.chooseTests') : t('orders.testPicker.selected', { count: n })

  useEffect(() => {
    if (!open || disabled) return
    const id = requestAnimationFrame(() => {
      filterInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, disabled])

  useEffect(() => {
    if (!open) return
    function onDocPointerDown(e: PointerEvent) {
      const target = e.target
      if (!(target instanceof Node)) return
      if (!wrapRef.current?.contains(target)) onOpenChange(false)
    }
    document.addEventListener('pointerdown', onDocPointerDown, true)
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  return (
    <div
      ref={wrapRef}
      className={`field order-test-multiselect${open && !disabled ? ' order-test-multiselect--open' : ''}`}
      style={{ marginBottom: 0 }}
    >
      <label htmlFor={triggerId}>{t('orders.testPicker.label')}</label>
      <div className="order-test-multiselect__anchor">
        <button
          type="button"
          id={triggerId}
          className={`order-test-multiselect-trigger${n === 0 ? ' order-test-multiselect-trigger--placeholder' : ''}`}
          disabled={disabled}
          aria-expanded={open}
          aria-controls={listId}
          aria-haspopup="listbox"
          onClick={() => {
            if (!disabled) onOpenChange(!open)
          }}
        >
          {summary}
        </button>
        {open && !disabled ? (
          <div id={listId} className="order-test-multiselect-panel" role="listbox" aria-multiselectable="true">
          <div className="order-test-multiselect-panel__search">
            <label htmlFor={filterInputId} className="order-test-multiselect-panel__search-label">
              {t('orders.testPicker.searchLabel')}
            </label>
            <input
              ref={filterInputRef}
              id={filterInputId}
              type="text"
              className="order-test-multiselect-panel__search-input"
              placeholder={t('orders.testPicker.searchPlaceholder')}
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          {totalMatches > ORDER_TEST_PICKER_LIMIT ? (
            <p className="order-test-multiselect-panel__hint">
              {t('orders.testPicker.showingMatches', {
                shown: ORDER_TEST_PICKER_LIMIT,
                total: totalMatches,
              })}
            </p>
          ) : null}
          {rows.length === 0 ? (
            <p style={{ margin: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              {t('orders.testPicker.noMatches')}
            </p>
          ) : (
            rows.map((testRow) => {
              const pct = activeDiscountPercentForOrder(testDiscounts, testRow.id, userRole)
              const unit = testRow.base_price_mmk
              const lineFinal =
                Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
              const checked = selectedSet.has(testRow.id)
              return (
                <label key={testRow.id} className="order-test-multiselect-row">
                  <input
                    type="checkbox"
                    className="order-test-multiselect-row__check"
                    checked={checked}
                    onChange={() => onToggle(testRow.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="order-test-multiselect-row__body">
                    <span className="order-test-multiselect-row__title">
                      <span className="order-test-multiselect-row__name">{testRow.test_name}</span>
                      <span className="order-test-multiselect-row__code">{testRow.test_code}</span>
                    </span>
                    <span className="order-test-multiselect-row__foot">
                      <span className="order-test-multiselect-row__discount">
                        {pct > 0
                          ? t('orders.testPicker.percentOff', { pct })
                          : t('orders.testPicker.noDiscount')}
                      </span>
                      <span className="order-test-multiselect-row__price">
                        {lineFinal.toLocaleString()} MMK
                      </span>
                    </span>
                  </span>
                </label>
              )
            })
          )}
          <div className="order-test-multiselect-panel__footer">
            <button
              type="button"
              className="btn btn-secondary btn-sm order-test-multiselect-panel__done"
              onClick={() => onOpenChange(false)}
            >
              {t('orders.testPicker.done')}
            </button>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  )
}

export function OrderManagementPage() {
  const { t } = useTranslation()
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<ApiOrderListRow[]>([])
  const [users, setUsers] = useState<UserListRow[]>([])
  const [tests, setTests] = useState<LabTestCatalogRow[]>([])
  const [testDiscounts, setTestDiscounts] = useState<TestDiscountListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useErrorToast(loadError)

  const [orderFilterStatus, setOrderFilterStatus] = useState<'' | ApiOrderStatus>('')
  const [orderFilterPriority, setOrderFilterPriority] = useState<'' | 'urgent' | 'elective'>('')
  const [orderFilterPatientInput, setOrderFilterPatientInput] = useState('')
  const [orderFilterPatient, setOrderFilterPatient] = useState('')
  const [orderFilterTests, setOrderFilterTests] = useState<'' | 'assigned' | 'missing'>('')

  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<ApiOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiOrderListRow | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createUserId, setCreateUserId] = useState('')
  const [createPriority, setCreatePriority] = useState<'urgent' | 'elective'>('elective')
  const [createPatientName, setCreatePatientName] = useState('')
  const [createPatientAge, setCreatePatientAge] = useState<number | ''>('')
  const [createPatientPhone, setCreatePatientPhone] = useState('')
  const [createAddress, setCreateAddress] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createSelectedTestIds, setCreateSelectedTestIds] = useState<string[]>([])
  const [createTestSearch, setCreateTestSearch] = useState('')
  const [createTestPickerOpen, setCreateTestPickerOpen] = useState(false)
  const [createLatitude, setCreateLatitude] = useState<number | ''>('')
  const [createLongitude, setCreateLongitude] = useState<number | ''>('')
  const [createServiceFee, setCreateServiceFee] = useState<CalculateServiceFeeResult | null>(null)
  const [createServiceFeeLoading, setCreateServiceFeeLoading] = useState(false)
  const [createServiceFeeError, setCreateServiceFeeError] = useState<string | null>(null)
  const [createServiceFeeOutOfCoverage, setCreateServiceFeeOutOfCoverage] = useState(false)
  const [createMaterialFee, setCreateMaterialFee] = useState<MaterialFeeRow | null>(null)
  const [createMaterialFeeLoading, setCreateMaterialFeeLoading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editOrderId, setEditOrderId] = useState<string | null>(null)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editPriority, setEditPriority] = useState<'urgent' | 'elective'>('elective')
  const [editPatientName, setEditPatientName] = useState('')
  const [editPatientAge, setEditPatientAge] = useState<number | ''>('')
  const [editPatientPhone, setEditPatientPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLatitude, setEditLatitude] = useState<number | ''>('')
  const [editLongitude, setEditLongitude] = useState<number | ''>('')
  const [editOrderDetail, setEditOrderDetail] = useState<ApiOrderDetail | null>(null)
  const [editSelectedTestIds, setEditSelectedTestIds] = useState<string[]>([])
  const [editTestSearch, setEditTestSearch] = useState('')
  const [editTestPickerOpen, setEditTestPickerOpen] = useState(false)

  const onCreateGeocodeCoords = useCallback((lat: number, lng: number) => {
    setCreateLatitude(lat)
    setCreateLongitude(lng)
  }, [])

  const createGeocodeHint = useAddressGeocode({
    enabled: createOpen,
    address: createAddress,
    onCoords: onCreateGeocodeCoords,
  })

  const onEditGeocodeCoords = useCallback((lat: number, lng: number) => {
    setEditLatitude(lat)
    setEditLongitude(lng)
  }, [])

  const editGeocodeHint = useAddressGeocode({
    enabled: editOpen,
    address: editAddress,
    onCoords: onEditGeocodeCoords,
  })

  useEffect(() => {
    if (!createOpen) {
      setCreateServiceFee(null)
      setCreateServiceFeeError(null)
      setCreateServiceFeeOutOfCoverage(false)
      setCreateServiceFeeLoading(false)
      return
    }
    if (!hasUsableCoords(createLatitude, createLongitude)) {
      setCreateServiceFee(null)
      setCreateServiceFeeError(null)
      setCreateServiceFeeOutOfCoverage(false)
      setCreateServiceFeeLoading(false)
      return
    }
    const { latitude: lat, longitude: lng } = coordsForOrderApi(createLatitude, createLongitude)
    if (lat == null || lng == null) return
    let cancelled = false
    setCreateServiceFeeLoading(true)
    calculateServiceFee(lat, lng)
      .then((result) => {
        if (cancelled) return
        setCreateServiceFee(result)
        setCreateServiceFeeError(null)
        setCreateServiceFeeOutOfCoverage(false)
      })
      .catch((err) => {
        if (cancelled) return
        setCreateServiceFee(null)
        setCreateServiceFeeError(err instanceof Error ? err.message : t('orders.create.serviceFeeFailed'))
        setCreateServiceFeeOutOfCoverage(
          Boolean(err && typeof err === 'object' && 'isOutOfCoverage' in err && (err as { isOutOfCoverage?: boolean }).isOutOfCoverage),
        )
      })
      .finally(() => {
        if (!cancelled) setCreateServiceFeeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [createOpen, createLatitude, createLongitude, t])

  useEffect(() => {
    if (!createOpen) {
      setCreateMaterialFee(null)
      setCreateMaterialFeeLoading(false)
      return
    }
    let cancelled = false
    setCreateMaterialFeeLoading(true)
    fetchActiveMaterialFees()
      .then((fees) => {
        if (cancelled) return
        const fee = fees.find((f) => f.amount_mmk > 0) ?? null
        setCreateMaterialFee(fee)
      })
      .catch(() => {
        if (cancelled) return
        setCreateMaterialFee(null)
      })
      .finally(() => {
        if (!cancelled) setCreateMaterialFeeLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [createOpen])

  const [assignOpen, setAssignOpen] = useState(false)
  /** Order loaded for the assign-tests modal (from detail or from row “Add test”). */
  const [assignOrderDetail, setAssignOrderDetail] = useState<ApiOrderDetail | null>(null)
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null)
  const [assignSelectedIds, setAssignSelectedIds] = useState<string[]>([])
  const [assignTestSearch, setAssignTestSearch] = useState('')
  const [assignTestPickerOpen, setAssignTestPickerOpen] = useState(false)
  const [assignSubmitting, setAssignSubmitting] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)

  const [paymentByOrderId, setPaymentByOrderId] = useState<Map<string, ApiPaymentOrderSummary>>(new Map())
  const [paymentsLoading, setPaymentsLoading] = useState(false)

  const [paymentUpdateOpen, setPaymentUpdateOpen] = useState(false)
  const [paymentUpdateOrder, setPaymentUpdateOrder] = useState<ApiOrderListRow | null>(null)
  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState<number | ''>('')
  const [paymentUpdateMethod, setPaymentUpdateMethod] = useState<ApiPaymentMethod>('cash')
  const [paymentUpdateReference, setPaymentUpdateReference] = useState('')
  const [paymentUpdateSubmitting, setPaymentUpdateSubmitting] = useState(false)
  const [paymentUpdateError, setPaymentUpdateError] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => setOrderFilterPatient(orderFilterPatientInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [orderFilterPatientInput])

  const orderFetchParams = useMemo((): FetchOrdersParams | undefined => {
    const p: FetchOrdersParams = {}
    if (orderFilterStatus) p.status = orderFilterStatus
    if (orderFilterPriority) p.priority = orderFilterPriority
    if (orderFilterPatient) p.patient_name = orderFilterPatient
    if (orderFilterTests === 'assigned') p.is_tests_assigned = true
    if (orderFilterTests === 'missing') p.is_tests_assigned = false
    return Object.keys(p).length ? p : undefined
  }, [orderFilterStatus, orderFilterPriority, orderFilterPatient, orderFilterTests])

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
  }, [orderFilterStatus, orderFilterPriority, orderFilterPatient, orderFilterTests])

  useEffect(() => {
    if (!hasApi) {
      setRows([])
      setUsers([])
      setTests([])
      setTestDiscounts([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [ordersRes, usersRes, testsRes, discountsRes] = await Promise.all([
          fetchOrders(ordersListQuery),
          fetchUserList(),
          fetchLabTestsList(),
          fetchAllDiscounts(),
        ])
        if (cancelled) return
        setRows(ordersRes)
        if (ordersRes.length === 0 && ordersPage > 1) {
          setOrdersPage((p) => Math.max(1, p - 1))
        }
        setUsers(usersRes.filter((u) => !u.is_deleted))
        setTests(testsRes.filter((t) => t.is_active && !t.is_deleted))
        setTestDiscounts(discountsRes)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : t('orders.detail.loadFailed'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, refreshTick, ordersListQuery, ordersPage])

  useEffect(() => {
    if (!hasApi || rows.length === 0) {
      setPaymentByOrderId(new Map())
      setPaymentsLoading(false)
      return
    }
    let cancelled = false
    setPaymentsLoading(true)
    void (async () => {
      const entries = await Promise.all(
        rows.map(async (o) => {
          try {
            const data = await fetchPaymentsByOrderId(o.id)
            return [o.id, data] as const
          } catch {
            return null
          }
        }),
      )
      if (cancelled) return
      const map = new Map<string, ApiPaymentOrderSummary>()
      for (const entry of entries) {
        if (entry) map.set(entry[0], entry[1])
      }
      setPaymentByOrderId(map)
      setPaymentsLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, rows])

  useEffect(() => {
    if (!createOpen) setCreateTestPickerOpen(false)
  }, [createOpen])

  useEffect(() => {
    if (!editOpen) {
      setEditTestPickerOpen(false)
      setEditOrderDetail(null)
      setEditSelectedTestIds([])
      setEditTestSearch('')
    }
  }, [editOpen])

  useEffect(() => {
    if (!assignOpen) {
      setAssignTestPickerOpen(false)
      setAssignOrderDetail(null)
      setAssignOrderId(null)
      setAssignSelectedIds([])
      setAssignTestSearch('')
      setAssignError(null)
    }
  }, [assignOpen])

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const testMap = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests])

  const createPickerPanel = useMemo(
    () => filterTestsForOrderDropdown(tests, createTestSearch, new Set(), ORDER_TEST_PICKER_LIMIT),
    [tests, createTestSearch],
  )

  const createOrderUser = useMemo(
    () => (createUserId ? userMap.get(createUserId) : undefined),
    [createUserId, userMap],
  )

  const createSelection = useMemo(() => {
    const role = createOrderUser?.role
    const lines: { testId: string; unit: number; pct: number; sub: number }[] = []
    for (const id of createSelectedTestIds) {
      const t = testMap.get(id)
      if (!t) continue
      const pct = activeDiscountPercentForOrder(testDiscounts, id, role)
      const unit = Math.round(t.base_price_mmk * 100) / 100
      const sub = Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
      lines.push({ testId: id, unit, pct, sub })
    }
    const originalSum = lines.reduce((s, l) => s + l.unit, 0)
    const finalSum = lines.reduce((s, l) => s + l.sub, 0)
    const blendedDisc = originalSum > 0 ? Math.round((1 - finalSum / originalSum) * 10000) / 100 : 0
    return { lines, originalSum, finalSum, blendedDisc }
  }, [createSelectedTestIds, testMap, testDiscounts, createOrderUser?.role])

  const createMaterialFeeMmk = createMaterialFee?.amount_mmk ?? 0

  const createEstimatedAmountDue = useMemo(() => {
    const testsTotal = createSelection.finalSum
    const serviceFee = createServiceFee?.service_fee_mmk ?? 0
    if (!createServiceFee) return Math.round((testsTotal + createMaterialFeeMmk) * 100) / 100
    return Math.round((testsTotal + serviceFee + createMaterialFeeMmk) * 100) / 100
  }, [createSelection.finalSum, createServiceFee, createMaterialFeeMmk])

  const createServiceFeeResolved =
    Boolean(createServiceFee) &&
    !createServiceFeeLoading &&
    !createServiceFeeError &&
    !createServiceFeeOutOfCoverage

  const createSubmitBlocked =
    !hasUsableCoords(createLatitude, createLongitude) ||
    createServiceFeeLoading ||
    createServiceFeeOutOfCoverage ||
    createServiceFeeError != null ||
    !createServiceFee

  const assignPickerPanel = useMemo(
    () => filterTestsForOrderDropdown(tests, assignTestSearch, new Set(), ORDER_TEST_PICKER_LIMIT),
    [tests, assignTestSearch],
  )

  const editPickerPanel = useMemo(
    () => filterTestsForOrderDropdown(tests, editTestSearch, new Set(), ORDER_TEST_PICKER_LIMIT),
    [tests, editTestSearch],
  )

  const editSelection = useMemo(() => {
    const role = editOrderDetail ? resolveOrderingUserRole(editOrderDetail, userMap) : undefined
    const lines: { testId: string; unit: number; pct: number; sub: number }[] = []
    for (const id of editSelectedTestIds) {
      const t = testMap.get(id)
      if (!t) continue
      const pct = activeDiscountPercentForOrder(testDiscounts, id, role)
      const unit = Math.round(t.base_price_mmk * 100) / 100
      const sub = Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
      lines.push({ testId: id, unit, pct, sub })
    }
    const originalSum = lines.reduce((s, l) => s + l.unit, 0)
    const finalSum = lines.reduce((s, l) => s + l.sub, 0)
    const blendedDisc = originalSum > 0 ? Math.round((1 - finalSum / originalSum) * 10000) / 100 : 0
    return { lines, originalSum, finalSum, blendedDisc }
  }, [editSelectedTestIds, testMap, testDiscounts, editOrderDetail, userMap])

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [rows],
  )

  function bumpOrderViews() {
    setRefreshTick((t) => t + 1)
  }

  async function refreshPaymentForOrder(orderId: string) {
    try {
      const data = await fetchPaymentsByOrderId(orderId)
      setPaymentByOrderId((prev) => new Map(prev).set(orderId, data))
    } catch {
      /* keep existing */
    }
  }

  function openPaymentUpdate(row: ApiOrderListRow) {
    const data = paymentSummaryForOrder(row.id, paymentByOrderId, detailOrder, row)
    setPaymentUpdateOrder(row)
    const balance = data?.summary.balance ?? row.final_price_mmk
    setPaymentUpdateAmount(balance > 0 ? Math.round(balance * 100) / 100 : '')
    setPaymentUpdateMethod('cash')
    setPaymentUpdateReference('')
    setPaymentUpdateError(null)
    setOpenMenuId(null)
    setPaymentUpdateOpen(true)
  }

  async function submitPaymentUpdate(e?: FormEvent) {
    e?.preventDefault()
    if (!paymentUpdateOrder) return
    setPaymentUpdateError(null)
    const amount =
      typeof paymentUpdateAmount === 'number'
        ? paymentUpdateAmount
        : Number.parseFloat(String(paymentUpdateAmount))
    if (!Number.isFinite(amount) || amount <= 0) {
      return setPaymentUpdateError(t('orders.paymentModal.amount'))
    }
    setPaymentUpdateSubmitting(true)
    try {
      await createPayment({
        order_id: paymentUpdateOrder.id,
        amount_mmk: amount,
        method: paymentUpdateMethod,
        status: 'received',
        reference_no: paymentUpdateReference.trim() || null,
      })
      showSuccess(t('orders.toasts.paymentRecorded'))
      setPaymentUpdateOpen(false)
      await refreshPaymentForOrder(paymentUpdateOrder.id)
      if (detailOrder?.id === paymentUpdateOrder.id) void refreshDetailOrder(paymentUpdateOrder.id)
    } catch (err) {
      setPaymentUpdateError(err instanceof Error ? err.message : t('orders.detail.loadFailed'))
    } finally {
      setPaymentUpdateSubmitting(false)
    }
  }

  function openCreateOrder() {
    const firstUser = users[0]
    const firstTest = tests[0]
    setCreateUserId(firstUser?.id ?? '')
    setCreatePriority('elective')
    setCreatePatientName('')
    setCreatePatientAge('')
    setCreatePatientPhone(firstUser?.phone ?? '')
    setCreateAddress('')
    setCreateDescription('')
    setCreateSelectedTestIds([])
    setCreateTestSearch('')
    setCreateTestPickerOpen(false)
    setCreateLatitude('')
    setCreateLongitude('')
    if (!firstUser && !firstTest) {
      setCreateError(t('orders.create.noUsersOrTests'))
    } else if (!firstUser) {
      setCreateError(t('orders.create.noUsersOnly'))
    } else if (!firstTest) {
      setCreateError(t('orders.create.noTestsAdded'))
    } else {
      setCreateError(null)
    }
    setCreateOpen(true)
  }

  function onCreateUserChange(userId: string) {
    setCreateUserId(userId)
    const u = userMap.get(userId)
    if (!u) return
    setCreatePatientPhone(u.phone)
  }

  function toggleCreateTest(testId: string) {
    setCreateSelectedTestIds((prev) => (prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]))
  }

  function removeCreateTest(testId: string) {
    setCreateSelectedTestIds((prev) => prev.filter((id) => id !== testId))
  }

  function toggleEditTest(testId: string) {
    setEditSelectedTestIds((prev) => (prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]))
  }

  function removeEditTest(testId: string) {
    setEditSelectedTestIds((prev) => prev.filter((id) => id !== testId))
  }

  async function submitCreateOrder(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateTestPickerOpen(false)
    if (!createUserId) return setCreateError(t('orders.create.orderingUser'))
    if (createSelection.lines.length === 0) return setCreateError(t('orders.create.testsOnOrder'))
    if (!createPatientName.trim()) return setCreateError(t('orders.create.patientName'))
    if (!createPatientPhone.trim()) return setCreateError(t('common.phone'))
    if (!createAddress.trim()) return setCreateError(t('common.address'))
    if (!hasUsableCoords(createLatitude, createLongitude)) {
      return setCreateError(t('orders.detail.address'))
    }
    if (createServiceFeeLoading) {
      return setCreateError(t('orders.create.serviceFeeChecking'))
    }
    if (createServiceFeeOutOfCoverage) {
      return setCreateError(createServiceFeeError ?? t('orders.create.serviceFeeRequired'))
    }
    if (createServiceFeeError) {
      return setCreateError(createServiceFeeError)
    }
    if (!createServiceFee) {
      return setCreateError(t('orders.create.serviceFeeRequired'))
    }
    const age = typeof createPatientAge === 'number' ? createPatientAge : Number.parseInt(String(createPatientAge), 10)
    if (!Number.isFinite(age) || age < 0) return setCreateError(t('orders.create.age'))
    const { lines, originalSum, finalSum, blendedDisc } = createSelection
    const items = lines.map((l) => ({
      test_id: l.testId,
      quantity: 1,
      unit_price_mmk: l.unit,
      subtotal_mmk: l.sub,
    }))
    const { latitude: latApi, longitude: lngApi } = coordsForOrderApi(createLatitude, createLongitude)
    setCreateSubmitting(true)
    try {
      await createOrder({
        user_id: createUserId,
        description: createDescription.trim() || null,
        priority: createPriority,
        patient_name: createPatientName.trim(),
        patient_age: age,
        patient_phone: createPatientPhone.trim(),
        address: createAddress.trim(),
        latitude: latApi,
        longitude: lngApi,
        status: 'pending',
        original_price_mmk: Math.round(originalSum * 100) / 100,
        discount_percent: blendedDisc,
        final_price_mmk: Math.round(finalSum * 100) / 100,
        material_fee_mmk: createMaterialFeeMmk > 0 ? createMaterialFeeMmk : undefined,
        items,
      })
      setCreateOpen(false)
      bumpOrderViews()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : t('orders.detail.loadFailed'))
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function openEditOrder(row: ApiOrderListRow) {
    setOpenMenuId(null)
    setEditError(null)
    setEditOrderId(row.id)
    setEditTestSearch('')
    setEditTestPickerOpen(false)
    try {
      const order = await fetchOrderById(row.id)
      if (!order) {
        showError(t('orders.detail.notFound'))
        setEditOrderId(null)
        return
      }
      setEditOrderDetail(order)
      setEditSelectedTestIds(order.items.map((it) => it.test_id))
      setEditPriority(order.priority)
      setEditPatientName(order.patient_name)
      setEditPatientAge(order.patient_age ?? '')
      setEditPatientPhone(order.patient_phone ?? '')
      setEditAddress(order.address ?? '')
      setEditDescription(order.description?.trim() ?? '')
      const lat = order.latitude != null ? Number(order.latitude) : null
      const lng = order.longitude != null ? Number(order.longitude) : null
      const hasCoords =
        lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng) && !(lat === 0 && lng === 0)
      setEditLatitude(hasCoords ? lat : '')
      setEditLongitude(hasCoords ? lng : '')
      setEditOpen(true)
    } catch (e) {
      showError(messageFromError(e, t('orders.detail.loadFailed')))
      setEditOrderId(null)
    }
  }

  async function submitEditOrder(e: FormEvent) {
    e.preventDefault()
    if (!editOrderId || !editOrderDetail) return
    setEditError(null)
    setEditTestPickerOpen(false)
    if (!editPatientName.trim()) return setEditError(t('orders.create.patientName'))
    if (!editPatientPhone.trim()) return setEditError(t('common.phone'))
    if (!editAddress.trim()) return setEditError(t('common.address'))
    if (!hasUsableCoords(editLatitude, editLongitude)) {
      return setEditError(t('orders.detail.address'))
    }
    const age =
      typeof editPatientAge === 'number' ? editPatientAge : Number.parseInt(String(editPatientAge), 10)
    if (!Number.isFinite(age) || age < 0) return setEditError(t('orders.create.age'))
    const testsEditable = canEditOrderTests(editOrderDetail.status)
    if (testsEditable && editSelection.lines.length === 0) {
      return setEditError(t('orders.create.testsOnOrder'))
    }
    const { latitude: latApi, longitude: lngApi } = coordsForOrderApi(editLatitude, editLongitude)
    setEditSubmitting(true)
    try {
      const basePayload = {
        description: editDescription.trim() || null,
        priority: editPriority,
        patient_name: editPatientName.trim(),
        patient_age: age,
        patient_phone: editPatientPhone.trim(),
        address: editAddress.trim(),
        latitude: latApi,
        longitude: lngApi,
      }

      if (testsEditable) {
        const { lines, originalSum, finalSum, blendedDisc } = editSelection
        await syncPendingOrder(editOrderId, {
          ...basePayload,
          items: lines.map((l) => ({
            test_id: l.testId,
            quantity: 1,
            unit_price_mmk: l.unit,
            subtotal_mmk: l.sub,
          })),
          original_price_mmk: Math.round(originalSum * 100) / 100,
          discount_percent: blendedDisc,
          final_price_mmk: Math.round(finalSum * 100) / 100,
        })
      } else {
        await updateOrder(editOrderId, basePayload)
      }
      setEditOpen(false)
      setEditOrderId(null)
      showSuccess(t('orders.toasts.orderUpdated'))
      bumpOrderViews()
      if (detailOrder?.id === editOrderId) void refreshDetailOrder(editOrderId)
    } catch (e) {
      setEditError(e instanceof Error ? e.message : t('orders.detail.loadFailed'))
    } finally {
      setEditSubmitting(false)
    }
  }

  async function openDetail(id: string) {
    setDetailOrder(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const order = await fetchOrderById(id)
      if (!order) {
        setDetailError(t('orders.detail.notFound'))
      } else {
        setDetailOrder(order)
        void refreshPaymentForOrder(id)
      }
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : t('orders.detail.loadFailed'))
    } finally {
      setDetailLoading(false)
    }
  }

  async function openAddTestsFromListRow(o: ApiOrderListRow) {
    setAssignSelectedIds([])
    setAssignTestSearch('')
    setAssignTestPickerOpen(false)
    setAssignError(null)
    setOpenMenuId(null)
    try {
      const order = await fetchOrderById(o.id)
      if (!order) {
        showError(t('orders.detail.notFound'))
        return
      }
      setAssignOrderDetail(order)
      setAssignOrderId(order.id)
      setAssignOpen(true)
    } catch (e) {
      showError(messageFromError(e, t('orders.detail.loadFailed')))
    }
  }

function canAddTestFromListRow(o: ApiOrderListRow): boolean {
  return o.status === 'pending' && !testsAssignedFlag(o.is_tests_assigned)
}

function canEditOrderTests(status: ApiOrderStatus): boolean {
  return status === 'pending'
}

  async function refreshDetailOrder(orderId?: string) {
    const id = orderId ?? detailOrder?.id
    if (!id) return
    try {
      const next = await fetchOrderById(id)
      if (next) setDetailOrder(next)
    } catch {
      /* keep existing */
    }
  }

  async function submitAssignTests(e: FormEvent) {
    e.preventDefault()
    setAssignError(null)
    setAssignTestPickerOpen(false)
    if (!assignOrderId || !assignOrderDetail || assignOrderDetail.id !== assignOrderId) {
      setAssignError(t('orders.detail.loadFailed'))
      return
    }
    if (assignSelectedIds.length === 0) {
      setAssignError(t('orders.create.testsOnOrder'))
      return
    }
    const role = resolveOrderingUserRole(assignOrderDetail, userMap)
    const items: { test_id: string; quantity: number; unit_price_mmk: number; subtotal_mmk: number }[] = []
    for (const testId of assignSelectedIds) {
      const t = testMap.get(testId)
      if (!t) continue
      const pct = activeDiscountPercentForOrder(testDiscounts, testId, role)
      const unit = Math.round(t.base_price_mmk * 100) / 100
      const sub = Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
      items.push({ test_id: testId, quantity: 1, unit_price_mmk: unit, subtotal_mmk: sub })
    }
    if (items.length === 0) {
      setAssignError(t('orders.create.noTestsAdded'))
      return
    }
    const originalSum = items.reduce((s, it) => s + it.unit_price_mmk * it.quantity, 0)
    const finalSum = items.reduce((s, it) => s + it.subtotal_mmk, 0)
    const blendedDisc =
      originalSum > 0 ? Math.round((1 - finalSum / originalSum) * 10000) / 100 : 0
    setAssignSubmitting(true)
    try {
      await addOrderItems(assignOrderId, {
        items,
        original_price_mmk: Math.round(originalSum * 100) / 100,
        discount_percent: blendedDisc,
        final_price_mmk: Math.round(finalSum * 100) / 100,
      })
      const next = await fetchOrderById(assignOrderId)
      if (next) {
        setDetailOrder((d) => (d?.id === assignOrderId ? next : d))
      }
      setAssignOpen(false)
      bumpOrderViews()
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : t('orders.detail.loadFailed'))
    } finally {
      setAssignSubmitting(false)
    }
  }

  function toggleAssignTest(testId: string) {
    setAssignSelectedIds((prev) => (prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]))
  }

  function removeAssignTest(testId: string) {
    setAssignSelectedIds((prev) => prev.filter((id) => id !== testId))
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const row = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteOrder(row.id)
      showSuccess(t('orders.toasts.orderDeleted'))
      bumpOrderViews()
    } catch (e) {
      showError(messageFromError(e, t('orders.toasts.deleteFailed')))
    }
  }

  function clearOrderFilters() {
    setOrderFilterStatus('')
    setOrderFilterPriority('')
    setOrderFilterPatientInput('')
    setOrderFilterPatient('')
    setOrderFilterTests('')
    setOrdersPage(1)
  }

  return (
    <div className="stack">
      <PageHeader title={t('pages.orders.title')} description={t('pages.orders.description')} />

      {!hasApi ? <ApiConfigBanner /> : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label={t('orders.filters.ariaLabel')}>
          <ListFilterSearchField
            id="order-filter-patient"
            label={t('common.patient')}
            value={orderFilterPatientInput}
            onChange={(e) => setOrderFilterPatientInput(e.target.value)}
            disabled={!hasApi || loading}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="order-filter-status">
              {t('common.status')}
            </label>
            <select
              id="order-filter-status"
              className="list-filters-bar__select"
              value={orderFilterStatus}
              onChange={(e) => setOrderFilterStatus(e.target.value as '' | ApiOrderStatus)}
              disabled={!hasApi || loading}
            >
              <option value="">{t('common.all')}</option>
              {ORDER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {orderStatusLabel(s)}
                </option>
              ))}
            </select>
          </div>
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="order-filter-priority">
              {t('common.priority')}
            </label>
            <select
              id="order-filter-priority"
              className="list-filters-bar__select"
              value={orderFilterPriority}
              onChange={(e) => setOrderFilterPriority(e.target.value as '' | 'urgent' | 'elective')}
              disabled={!hasApi || loading}
            >
              <option value="">{t('common.all')}</option>
              <option value="elective">{orderPriorityLabel('elective')}</option>
              <option value="urgent">{orderPriorityLabel('urgent')}</option>
            </select>
          </div>
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="order-filter-tests">
              {t('orders.filters.tests')}
            </label>
            <select
              id="order-filter-tests"
              className="list-filters-bar__select"
              value={orderFilterTests}
              onChange={(e) => setOrderFilterTests(e.target.value as '' | 'assigned' | 'missing')}
              disabled={!hasApi || loading}
            >
              <option value="">{t('common.all')}</option>
              <option value="assigned">{t('orders.filters.assigned')}</option>
              <option value="missing">{t('orders.filters.missing')}</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={clearOrderFilters}
            disabled={!hasApi || loading}
          >
            {t('filters.clearFilters')}
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={!hasApi || loading}
          >
            {loading ? t('common.refreshing') : t('common.refresh')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateOrder}
            disabled={!hasApi || loading}
          >
            {t('orders.actions.createOrder')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap table-wrap--sticky-actions">
          <table className="data-table data-table--catalog data-table--orders">
            <thead>
              <tr>
                <th scope="col">{t('common.patient')}</th>
                <th scope="col">{t('common.phone')}</th>
                <th scope="col">{t('common.priority')}</th>
                <th scope="col">{t('common.status')}</th>
                <th scope="col" className="order-col-pay-status">
                  {t('orders.table.payment')}
                </th>
                <th
                  scope="col"
                  className="col-num order-col-paid"
                  title={t('orders.table.paidTitle')}
                >
                  {t('orders.table.paid')}
                </th>
                <th scope="col" className="col-num order-col-due" title={t('orders.table.dueTitle')}>
                  {t('orders.table.due')}
                </th>
                <th scope="col" title={t('orders.table.rxTitle')}>
                  {t('orders.table.rx')}
                </th>
                <th scope="col">{t('orders.table.tests')}</th>
                <th scope="col" className="col-num">
                  {t('orders.table.original')}
                </th>
                <th scope="col" className="col-num">
                  {t('orders.table.final')}
                </th>
                <th scope="col" className="action-col">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label={t('common.loading')} />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">receipt_long</span>
                      </div>
                      <p className="data-table__empty-title">{t('orders.empty.title')}</p>
                      <p className="data-table__empty-text">{t('orders.empty.text')}</p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreateOrder}>
                          {t('orders.actions.createOrder')}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : (
                sorted.map((o) => (
                  <tr key={o.id}>
                    <td>{o.patient_name}</td>
                    <td className="data-table__cell--phone" title={o.patient_phone?.trim() || undefined}>
                      {o.patient_phone?.trim() ? (
                        <a className="data-table__phone-link" href={`tel:${o.patient_phone.replace(/\s+/g, '')}`}>
                          {o.patient_phone.trim()}
                        </a>
                      ) : (
                        t('common.none')
                      )}
                    </td>
                    <td>
                      <span className={priorityBadgeClass(o.priority)}>{orderPriorityLabel(o.priority)}</span>
                    </td>
                    <td>
                      <span className={statusBadgeClass(o.status)}>{orderStatusLabel(o.status)}</span>
                    </td>
                    <td className="order-col-pay-status">
                      {(() => {
                        const payData = paymentByOrderId.get(o.id)
                        const display = orderPaymentListDisplay(payData, o.final_price_mmk)
                        const amounts = orderPaymentAmounts(payData, o.final_price_mmk)
                        if (paymentsLoading && !payData) {
                          return <span className="order-pay-muted">…</span>
                        }
                        return (
                          <div className="order-pay-status">
                            <span className={paymentBadgeClass(display.status, display.fullyPaid)}>
                              {paymentDisplayKeyLabel(display.labelKey)}
                            </span>
                            {amounts.total > 0 ? (
                              <div
                                className="order-pay-progress"
                                role="progressbar"
                                aria-valuenow={amounts.percentPaid}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={t('orders.table.percentPaid', { pct: amounts.percentPaid })}
                              >
                                <div className="order-pay-progress__track">
                                  <div
                                    className={`order-pay-progress__fill${
                                      amounts.balance <= 0
                                        ? ' order-pay-progress__fill--complete'
                                        : display.labelKey === 'partialReceived'
                                          ? ' order-pay-progress__fill--partial'
                                          : ''
                                    }`}
                                    style={{ width: `${amounts.percentPaid}%` }}
                                  />
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="col-num order-col-paid">
                      {(() => {
                        const payData = paymentByOrderId.get(o.id)
                        if (paymentsLoading && !payData) return <span className="order-pay-muted">…</span>
                        const { paid } = orderPaymentAmounts(payData, o.final_price_mmk)
                        return paid.toLocaleString()
                      })()}
                    </td>
                    <td className="col-num order-col-due">
                      {(() => {
                        const payData = paymentByOrderId.get(o.id)
                        if (paymentsLoading && !payData) return <span className="order-pay-muted">…</span>
                        const { balance, total } = orderPaymentAmounts(payData, o.final_price_mmk)
                        if (total <= 0) return t('common.none')
                        if (balance <= 0) {
                          return <span className="order-due-zero">0</span>
                        }
                        return <span className="order-due-amount">{balance.toLocaleString()}</span>
                      })()}
                    </td>
                    <td>
                      {o.prescription_url ? (
                        <span className="badge badge--success" title={o.prescription_url}>
                          {t('common.yes')}
                        </span>
                      ) : (
                        <span className="badge badge--neutral">{t('common.no')}</span>
                      )}
                    </td>
                    <td>
                      {(() => {
                        const n = o.items?.length ?? 0
                        if (n > 0) {
                          const names = (o.items ?? [])
                            .map((it) => it.test_name?.trim() || it.test_id)
                            .slice(0, 2)
                          const more = n > 2 ? ` +${n - 2}` : ''
                          return (
                            <span title={(o.items ?? []).map((it) => it.test_name ?? it.test_id).join(', ')}>
                              {t('orders.table.testCount', { count: n })}
                              {names.length > 0 ? (
                                <span className="order-list-tests-hint">
                                  {' '}
                                  ({names.join(', ')}
                                  {more})
                                </span>
                              ) : null}
                            </span>
                          )
                        }
                        return testsAssignedFlag(o.is_tests_assigned) ? (
                          <span className="badge badge--success">{t('orders.filters.assigned')}</span>
                        ) : (
                          <span className="badge badge--warn">{t('orders.filters.missing')}</span>
                        )
                      })()}
                    </td>
                    <td className="col-num">{o.original_price_mmk.toLocaleString()}</td>
                    <td className="col-num">{o.final_price_mmk.toLocaleString()}</td>
                    <td className="action-cell">
                      <TableActionMenu
                        open={openMenuId === o.id}
                        onOpenChange={(next) => setOpenMenuId(next ? o.id : null)}
                        items={[
                          {
                            label: t('orders.actions.detail'),
                            onSelect: () => {
                              void openDetail(o.id)
                            },
                          },
                          {
                            label: t('orders.actions.updateOrder'),
                            onSelect: () => {
                              void openEditOrder(o)
                            },
                          },
                          {
                            label: t('orders.actions.addPayment'),
                            onSelect: () => {
                              openPaymentUpdate(o)
                            },
                          },
                          ...(canAddTestFromListRow(o)
                            ? [
                                {
                                  label: t('orders.actions.addTest'),
                                  onSelect: () => {
                                    void openAddTestsFromListRow(o)
                                  },
                                },
                              ]
                            : []),
                          {
                            label: t('common.delete'),
                            onSelect: () => setDeleteTarget(o),
                            danger: true,
                          },
                        ]}
                      />
                    </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && hasApi && sorted.length > 0 ? (
          <TablePagination
            mode="server"
            page={ordersPage}
            pageSize={ordersPageSize}
            itemsOnPage={sorted.length}
            onPageChange={setOrdersPage}
            onPageSizeChange={(n) => {
              setOrdersPageSize(n)
              setOrdersPage(1)
            }}
          />
        ) : null}
      </div>

      {createOpen ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => e.target === e.currentTarget && !createSubmitting && setCreateOpen(false)}
        >
          <div className="modal-card modal-card--order-create" onMouseDown={(e) => e.stopPropagation()}>
            <div className="order-create-modal__head">
              <div className="modal-head">
                <h2 className="modal-title">{t('orders.create.title')}</h2>
                <button
                  type="button"
                  className="btn btn-ghost modal-close"
                  onClick={() => !createSubmitting && setCreateOpen(false)}
                  aria-label={t('common.close')}
                  disabled={createSubmitting}
                >
                  ×
                </button>
              </div>
            </div>
            <form className="order-create-modal__form" onSubmit={(e) => void submitCreateOrder(e)}>
              <div className="order-create-modal__body">
                <div className="order-create-modal__stack">
              <div className="field">
                <label htmlFor="om-user">{t('orders.create.orderingUser')}</label>
                <select id="om-user" className="select-chevron-left" value={createUserId} onChange={(e) => onCreateUserChange(e.target.value)} disabled={createSubmitting}>
                  {users.length === 0 ? (
                    <option value="">{t('orders.create.noUsers')}</option>
                  ) : (
                    users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({roleLabel(u.role)})
                      </option>
                    ))
                  )}
                </select>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  {t('orders.create.discountHint')}
                </p>
              </div>
              <div className="field">
                <div id="om-tests-label" style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--heading)' }}>
                  {t('orders.create.testsOnOrder')}
                </div>
                {tests.length > ORDER_TEST_PICKER_LIMIT && !createTestSearch.trim() ? (
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#9a6700' }}>
                    {t('orders.create.catalogManyHint', { limit: ORDER_TEST_PICKER_LIMIT })}
                  </p>
                ) : null}
                <p style={{ margin: '0 0 0.45rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  {t('orders.create.testPickerHint')}
                </p>
                <OrderTestCheckboxPicker
                  disabled={createSubmitting || tests.length === 0}
                  open={createTestPickerOpen}
                  onOpenChange={setCreateTestPickerOpen}
                  rows={createPickerPanel.rows}
                  totalMatches={createPickerPanel.totalMatches}
                  selectedIds={createSelectedTestIds}
                  onToggle={toggleCreateTest}
                  userRole={createOrderUser?.role}
                  testDiscounts={testDiscounts}
                  triggerId="om-test-multiselect"
                  listId="om-test-multiselect-list"
                  filterValue={createTestSearch}
                  onFilterChange={setCreateTestSearch}
                  filterInputId="om-test-filter"
                />
                {createSelectedTestIds.length > 0 ? (
                  <div className="table-wrap" style={{ marginTop: '0.65rem' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('orders.testPicker.label')}</th>
                          <th>{t('orders.testPicker.discount')}</th>
                          <th>{t('orders.testPicker.finalMmk')}</th>
                          <th className="action-col"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {createSelectedTestIds.map((id) => {
                          const test = testMap.get(id)
                          if (!test) return null
                          const pct = activeDiscountPercentForOrder(testDiscounts, id, createOrderUser?.role)
                          const unit = Math.round(test.base_price_mmk * 100) / 100
                          const sub =
                            Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
                          return (
                            <tr key={id}>
                              <td>
                                {test.test_name}{' '}
                                <span style={{ color: 'var(--muted)' }}>({test.test_code})</span>
                              </td>
                              <td>{pct}%</td>
                              <td>{sub.toLocaleString()}</td>
                              <td className="action-cell">
                                <button
                                  type="button"
                                  className="btn btn-ghost"
                                  style={{ fontSize: '0.8rem' }}
                                  onClick={() => removeCreateTest(id)}
                                  disabled={createSubmitting}
                                >
                                  {t('common.delete')}
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ margin: '0.55rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                    {t('orders.create.noTestsAdded')}
                  </p>
                )}
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="om-name">{t('orders.create.patientName')}</label>
                  <input id="om-name" value={createPatientName} onChange={(e) => setCreatePatientName(e.target.value)} disabled={createSubmitting} />
                </div>
                <div className="field">
                  <label htmlFor="om-age">{t('orders.create.age')}</label>
                  <input id="om-age" type="number" min={0} value={createPatientAge === '' ? '' : createPatientAge} onChange={(e) => setCreatePatientAge(e.target.value === '' ? '' : Number(e.target.value))} disabled={createSubmitting} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="om-phone">{t('common.phone')}</label>
                  <input id="om-phone" value={createPatientPhone} onChange={(e) => setCreatePatientPhone(e.target.value)} disabled={createSubmitting} />
                </div>
                <div className="field">
                  <label htmlFor="om-pri">{t('common.priority')}</label>
                  <select id="om-pri" className="select-chevron-left" value={createPriority} onChange={(e) => setCreatePriority(e.target.value as 'urgent' | 'elective')} disabled={createSubmitting}>
                    <option value="elective">{orderPriorityLabel('elective')}</option>
                    <option value="urgent">{orderPriorityLabel('urgent')}</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="om-address">{t('common.address')}</label>
                <textarea id="om-address" value={createAddress} onChange={(e) => setCreateAddress(e.target.value)} disabled={createSubmitting} />
              </div>
              <div className="user-form-modal__location-card">
                <LocationMapPicker
                  latitude={createLatitude}
                  longitude={createLongitude}
                  mapHeight={220}
                  onPick={(lat, lng) => {
                    setCreateLatitude(lat)
                    setCreateLongitude(lng)
                  }}
                  onAddressFromMap={setCreateAddress}
                />
                <p className="user-form-modal__coords" aria-live="polite">
                  {formatCoordPair(createLatitude, createLongitude)}
                </p>
                {createGeocodeHint ? <p className="user-form-modal__geocode-hint">{createGeocodeHint}</p> : null}
              </div>
              <div className="field">
                <label htmlFor="om-desc">{t('orders.create.description')}</label>
                <textarea id="om-desc" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} disabled={createSubmitting} />
              </div>
              <section className="order-create-pricing" aria-labelledby="order-create-pricing-title">
                <h3 id="order-create-pricing-title" className="order-create-pricing__title">
                  <span className="material-symbols-outlined" aria-hidden>
                    receipt_long
                  </span>
                  {t('orders.create.pricingSummary')}
                </h3>
                <div className="order-create-pricing__lines">
                  <div className="order-create-pricing__line">
                    <div className="order-create-pricing__line-main">
                      <span className="order-create-pricing__label">{t('orders.create.testsSubtotal')}</span>
                      {createSelection.blendedDisc > 0 ? (
                        <span className="order-create-pricing__caption">
                          {t('orders.create.testsDiscountHint', {
                            original: createSelection.originalSum.toLocaleString(),
                            percent: createSelection.blendedDisc,
                          })}
                        </span>
                      ) : null}
                    </div>
                    <span className="order-create-pricing__value">
                      {createSelection.finalSum.toLocaleString()} {t('orders.currency')}
                    </span>
                  </div>
                  {createMaterialFeeLoading || createMaterialFee ? (
                    <div className="order-create-pricing__line">
                      <div className="order-create-pricing__line-main">
                        <span className="order-create-pricing__label">{t('orders.create.materialFeeShort')}</span>
                        {createMaterialFeeLoading ? (
                          <span className="order-create-pricing__caption order-create-pricing__caption--loading">
                            {t('orders.create.materialFeeLoading')}
                          </span>
                        ) : createMaterialFee?.name?.trim() ? (
                          <span className="order-create-pricing__caption">{createMaterialFee.name.trim()}</span>
                        ) : null}
                      </div>
                      <span className="order-create-pricing__value">
                        {createMaterialFeeLoading
                          ? '…'
                          : createMaterialFee
                            ? `${createMaterialFee.amount_mmk.toLocaleString()} ${t('orders.currency')}`
                            : '—'}
                      </span>
                    </div>
                  ) : null}
                  <div
                    className={`order-create-pricing__line${
                      createServiceFeeError ? ' order-create-pricing__line--error' : ''
                    }`}
                  >
                    <div className="order-create-pricing__line-main">
                      <span className="order-create-pricing__label">{t('orders.create.serviceFeeShort')}</span>
                      {createServiceFeeLoading ? (
                        <span className="order-create-pricing__caption order-create-pricing__caption--loading">
                          {t('orders.create.serviceFeeChecking')}
                        </span>
                      ) : createServiceFee?.zone_name ? (
                        <span className="order-create-pricing__caption">{createServiceFee.zone_name}</span>
                      ) : createServiceFeeError ? (
                        <span className="order-create-pricing__caption order-create-pricing__caption--error">
                          {createServiceFeeError}
                        </span>
                      ) : null}
                    </div>
                    <span className="order-create-pricing__value">
                      {createServiceFeeLoading
                        ? '…'
                        : createServiceFeeError
                          ? '—'
                          : createServiceFee
                            ? `${createServiceFee.service_fee_mmk.toLocaleString()} ${t('orders.currency')}`
                            : '—'}
                    </span>
                  </div>
                </div>
                {createServiceFeeResolved ? (
                  <div className="order-create-pricing__total">
                    <span className="order-create-pricing__total-label">{t('orders.create.amountDue')}</span>
                    <span className="order-create-pricing__total-value">
                      {createEstimatedAmountDue.toLocaleString()} {t('orders.currency')}
                    </span>
                  </div>
                ) : null}
              </section>
                </div>
              </div>
              <div className="order-create-modal__footer">
              {createError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {createError}
                </div>
              ) : null}
              <div className="order-create-modal__footer-actions">
                <div className="row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setCreateOpen(false)} disabled={createSubmitting}>
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    createSubmitting ||
                    users.length === 0 ||
                    tests.length === 0 ||
                    createSelection.lines.length === 0 ||
                    createSubmitBlocked
                  }
                >
                  {createSubmitting ? t('common.saving') : t('orders.create.submit')}
                </button>
                </div>
              </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {editOpen && editOrderId ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-order-title"
          onMouseDown={(e) => e.target === e.currentTarget && !editSubmitting && setEditOpen(false)}
        >
          <div className="modal-card modal-card--order-create" onMouseDown={(e) => e.stopPropagation()}>
            <div className="order-create-modal__head">
              <div className="modal-head">
                <h2 className="modal-title" id="edit-order-title">
                  {t('orders.edit.title')}
                </h2>
                <button
                  type="button"
                  className="btn btn-ghost modal-close"
                  onClick={() => !editSubmitting && setEditOpen(false)}
                  aria-label={t('common.close')}
                  disabled={editSubmitting}
                >
                  ×
                </button>
              </div>
            </div>
            <form className="order-create-modal__form" onSubmit={(e) => void submitEditOrder(e)}>
              <div className="order-create-modal__body">
                <div className="order-create-modal__stack">
                  {editOrderDetail && canEditOrderTests(editOrderDetail.status) ? (
                    <div className="field">
                      <div
                        id="om-edit-tests-label"
                        style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--heading)' }}
                      >
                        {t('orders.create.testsOnOrder')}
                      </div>
                      {tests.length > ORDER_TEST_PICKER_LIMIT && !editTestSearch.trim() ? (
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#9a6700' }}>
                          {t('orders.create.catalogManyHint', { limit: ORDER_TEST_PICKER_LIMIT })}
                        </p>
                      ) : null}
                      <p style={{ margin: '0 0 0.45rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {t('orders.edit.discountRoleHint', {
                          role:
                            (editOrderDetail.user_id
                              ? resolveOrderingUserRole(editOrderDetail, userMap) ??
                                userMap.get(editOrderDetail.user_id)?.role ??
                                t('common.none')
                              : t('common.none')) as string,
                        })}
                      </p>
                      <OrderTestCheckboxPicker
                        disabled={editSubmitting || tests.length === 0}
                        open={editTestPickerOpen}
                        onOpenChange={setEditTestPickerOpen}
                        rows={editPickerPanel.rows}
                        totalMatches={editPickerPanel.totalMatches}
                        selectedIds={editSelectedTestIds}
                        onToggle={toggleEditTest}
                        userRole={resolveOrderingUserRole(editOrderDetail, userMap)}
                        testDiscounts={testDiscounts}
                        triggerId="om-edit-test-multiselect"
                        listId="om-edit-test-multiselect-list"
                        filterValue={editTestSearch}
                        onFilterChange={setEditTestSearch}
                        filterInputId="om-edit-test-filter"
                      />
                      {editSelectedTestIds.length > 0 ? (
                        <div className="table-wrap" style={{ marginTop: '0.65rem' }}>
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t('orders.testPicker.label')}</th>
                                <th>{t('orders.testPicker.discount')}</th>
                                <th>{t('orders.testPicker.finalMmk')}</th>
                                <th className="action-col"> </th>
                              </tr>
                            </thead>
                            <tbody>
                              {editSelectedTestIds.map((id) => {
                                const test = testMap.get(id)
                                if (!test) return null
                                const pct = activeDiscountPercentForOrder(
                                  testDiscounts,
                                  id,
                                  resolveOrderingUserRole(editOrderDetail, userMap),
                                )
                                const unit = Math.round(test.base_price_mmk * 100) / 100
                                const sub =
                                  Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
                                return (
                                  <tr key={id}>
                                    <td>
                                      {test.test_name}{' '}
                                      <span style={{ color: 'var(--muted)' }}>({test.test_code})</span>
                                    </td>
                                    <td>{pct}%</td>
                                    <td>{sub.toLocaleString()}</td>
                                    <td className="action-cell">
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: '0.8rem' }}
                                        onClick={() => removeEditTest(id)}
                                        disabled={editSubmitting}
                                      >
                                        {t('common.delete')}
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p style={{ margin: '0.55rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>
                          {t('orders.create.noTestsAdded')}
                        </p>
                      )}
                      <div className="order-create-modal__grid-three" style={{ marginTop: '0.85rem' }}>
                        <div className="field">
                          <label>{t('orders.create.originalTotal')}</label>
                          <input
                            readOnly
                            disabled
                            value={editSelection.originalSum.toLocaleString()}
                            className="lab-test-modal__input-computed"
                          />
                        </div>
                        <div className="field">
                          <label>{t('orders.create.blendedDiscount')}</label>
                          <input
                            readOnly
                            disabled
                            value={String(editSelection.blendedDisc)}
                            className="lab-test-modal__input-computed"
                          />
                        </div>
                        <div className="field">
                          <label>{t('orders.create.finalTotal')}</label>
                          <input
                            readOnly
                            disabled
                            value={editSelection.finalSum.toLocaleString()}
                            className="lab-test-modal__input-computed"
                          />
                        </div>
                      </div>
                    </div>
                  ) : null}
                  <div className="grid-2">
                    <div className="field">
                      <label htmlFor="om-edit-name">{t('orders.create.patientName')}</label>
                      <input
                        id="om-edit-name"
                        value={editPatientName}
                        onChange={(e) => setEditPatientName(e.target.value)}
                        disabled={editSubmitting}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="om-edit-age">{t('orders.create.age')}</label>
                      <input
                        id="om-edit-age"
                        type="number"
                        min={0}
                        value={editPatientAge === '' ? '' : editPatientAge}
                        onChange={(e) =>
                          setEditPatientAge(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        disabled={editSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid-2">
                    <div className="field">
                      <label htmlFor="om-edit-phone">{t('common.phone')}</label>
                      <input
                        id="om-edit-phone"
                        value={editPatientPhone}
                        onChange={(e) => setEditPatientPhone(e.target.value)}
                        disabled={editSubmitting}
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="om-edit-pri">{t('common.priority')}</label>
                      <select
                        id="om-edit-pri"
                        className="select-chevron-left"
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as 'urgent' | 'elective')}
                        disabled={editSubmitting}
                      >
                        <option value="elective">{orderPriorityLabel('elective')}</option>
                        <option value="urgent">{orderPriorityLabel('urgent')}</option>
                      </select>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="om-edit-address">{t('common.address')}</label>
                    <textarea
                      id="om-edit-address"
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>
                  <div className="user-form-modal__location-card">
                    <LocationMapPicker
                      latitude={editLatitude}
                      longitude={editLongitude}
                      mapHeight={220}
                      onPick={(lat, lng) => {
                        setEditLatitude(lat)
                        setEditLongitude(lng)
                      }}
                      onAddressFromMap={setEditAddress}
                    />
                    <p className="user-form-modal__coords" aria-live="polite">
                      {formatCoordPair(editLatitude, editLongitude)}
                    </p>
                    {editGeocodeHint ? <p className="user-form-modal__geocode-hint">{editGeocodeHint}</p> : null}
                  </div>
                  <div className="field">
                    <label htmlFor="om-edit-desc">{t('orders.create.description')}</label>
                    <textarea
                      id="om-edit-desc"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      disabled={editSubmitting}
                    />
                  </div>
                </div>
              </div>
              <div className="order-create-modal__footer">
                {editError ? (
                  <div className="form-alert form-alert--error" role="alert">
                    {editError}
                  </div>
                ) : null}
                <div className="order-create-modal__footer-actions">
                  <div className="row-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditOpen(false)}
                      disabled={editSubmitting}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        editSubmitting ||
                        (editOrderDetail != null &&
                          canEditOrderTests(editOrderDetail.status) &&
                          editSelection.lines.length === 0)
                      }
                    >
                      {editSubmitting ? t('common.saving') : t('orders.edit.saveChanges')}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {paymentUpdateOpen && paymentUpdateOrder ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="payment-modal-title"
          onMouseDown={(e) =>
            e.target === e.currentTarget && !paymentUpdateSubmitting && setPaymentUpdateOpen(false)
          }
        >
          <div className="modal-card modal-card--payment" onMouseDown={(e) => e.stopPropagation()}>
            {(() => {
              const payData = paymentSummaryForOrder(
                paymentUpdateOrder.id,
                paymentByOrderId,
                detailOrder,
                paymentUpdateOrder,
              )
              const amounts = orderPaymentAmounts(payData, paymentUpdateOrder.final_price_mmk)
              const enterAmount =
                typeof paymentUpdateAmount === 'number'
                  ? paymentUpdateAmount
                  : Number.parseFloat(String(paymentUpdateAmount))
              const adding = Number.isFinite(enterAmount) && enterAmount > 0 ? enterAmount : 0
              const previewPaid = Math.min(amounts.total, amounts.paid + adding)
              const previewLeft = Math.max(0, amounts.total - previewPaid)
              const fullyPaid = amounts.total > 0 && amounts.balance <= 0
              const canRecordPayment = adding > 0 && !paymentUpdateSubmitting

              return (
                <>
                  <div className="modal-head payment-sheet-head">
                    <div>
                      <p className="payment-sheet-head__eyebrow">{t('orders.paymentModal.eyebrow')}</p>
                      <h2 id="payment-modal-title" className="modal-title">
                        {t('orders.paymentModal.title')}
                      </h2>
                      <p className="payment-sheet-head__patient">{paymentUpdateOrder.patient_name}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost modal-close"
                      onClick={() => !paymentUpdateSubmitting && setPaymentUpdateOpen(false)}
                      aria-label={t('common.close')}
                      disabled={paymentUpdateSubmitting}
                    >
                      ×
                    </button>
                  </div>

                  <div className="payment-sheet-body">
                    <PaymentModalSummary amounts={amounts} />

                    {paymentUpdateError ? (
                      <div className="form-alert form-alert--error" role="alert">
                        {paymentUpdateError}
                      </div>
                    ) : null}

                    <div className="payment-sheet-form">
                      <div className="field">
                        <div className="payment-sheet__amount-head">
                          <label htmlFor="pu-amount">{t('orders.paymentModal.amount')}</label>
                          {amounts.balance > 0 ? (
                            <button
                              type="button"
                              className="payment-sheet__quick-fill"
                              onClick={() =>
                                setPaymentUpdateAmount(Math.round(amounts.balance * 100) / 100)
                              }
                              disabled={paymentUpdateSubmitting}
                            >
                              {t('orders.paymentModal.payRemaining')}
                            </button>
                          ) : null}
                        </div>
                        <div className="payment-sheet__amount-wrap">
                          <input
                            id="pu-amount"
                            type="number"
                            className="payment-sheet__amount-input"
                            min={0}
                            step="0.01"
                            inputMode="decimal"
                            placeholder="0"
                            value={paymentUpdateAmount === '' ? '' : paymentUpdateAmount}
                            onChange={(e) =>
                              setPaymentUpdateAmount(
                                e.target.value === '' ? '' : Number(e.target.value),
                              )
                            }
                            disabled={paymentUpdateSubmitting}
                          />
                          <span className="payment-sheet__amount-unit" aria-hidden="true">
                            {t('orders.currency')}
                          </span>
                        </div>
                      </div>

                      <div className="field">
                        <label htmlFor="pu-method">{t('orders.paymentModal.method')}</label>
                        <select
                          id="pu-method"
                          className="select-chevron-left"
                          value={paymentUpdateMethod}
                          onChange={(e) =>
                            setPaymentUpdateMethod(e.target.value as ApiPaymentMethod)
                          }
                          disabled={paymentUpdateSubmitting}
                        >
                          {PAYMENT_METHOD_OPTIONS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      {fullyPaid ? (
                        <p className="payment-sheet__hint">
                          {t('orders.paymentModal.paidInFull')}
                        </p>
                      ) : null}

                      {adding > 0 ? (
                        <p className="payment-sheet__preview" role="status">
                          {t('orders.paymentModal.previewAfter')}{' '}
                          <strong>
                            {t('orders.paymentModal.previewPaid')}: {previewPaid.toLocaleString()} {t('orders.currency')}
                          </strong>
                          {previewLeft > 0 ? (
                            <>
                              {' · '}
                              <strong>
                                {t('orders.paymentModal.previewLeft')}: {previewLeft.toLocaleString()}{' '}
                                {t('orders.currency')}
                              </strong>
                            </>
                          ) : (
                            <> · {t('orders.paymentModal.paidInFull')}</>
                          )}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="payment-sheet-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setPaymentUpdateOpen(false)}
                      disabled={paymentUpdateSubmitting}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void submitPaymentUpdate()}
                      disabled={!canRecordPayment}
                    >
                      {paymentUpdateSubmitting
                        ? t('orders.paymentModal.recording')
                        : t('orders.paymentModal.record')}
                    </button>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      ) : null}

      {detailLoading ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h2 className="modal-title">{t('orders.detail.title')}</h2>
            </div>
            <div className="card-body-loading">
              <LoadingSpinner label={t('orders.detail.loading')} />
            </div>
          </div>
        </div>
      ) : null}

      {detailError ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && setDetailError(null)}>
          <div className="modal-card" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">{t('orders.detail.title')}</h2>
              <button
                type="button"
                className="btn btn-ghost modal-close"
                onClick={() => setDetailError(null)}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div className="form-alert form-alert--error">{detailError}</div>
            </div>
          </div>
        </div>
      ) : null}

      {detailOrder ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && setDetailOrder(null)}>
          <div className="modal-card modal-card--order-detail" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-card--order-detail__head modal-head">
              <h2 className="modal-title">{t('orders.detail.title')}</h2>
              <button
                type="button"
                className="btn btn-ghost modal-close"
                onClick={() => setDetailOrder(null)}
                aria-label={t('common.close')}
              >
                ×
              </button>
            </div>
            <div className="modal-card--order-detail__body">
              <div className="order-detail-summary">
                <section className="order-detail-summary__card" aria-labelledby="od-summary-people">
                  <h3 id="od-summary-people" className="order-detail-summary__title">
                    {t('common.order')}
                  </h3>
                  <div className="order-detail-grid order-detail-grid--in-card">
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">{t('common.order')} ID</span>
                      <span className="order-detail-value order-detail-value--id">{detailOrder.id}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.orderingUser')}</span>
                      {renderOrderingUser(detailOrder.user_id, detailOrder.ordering_user_name, userMap)}
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.patientName')}</span>
                      <span className="order-detail-value">{detailOrder.patient_name}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.patientAge')}</span>
                      <span className="order-detail-value">{detailOrder.patient_age ?? t('common.none')}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.patientPhone')}</span>
                      <span className="order-detail-value">{detailOrder.patient_phone}</span>
                    </div>
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">{t('orders.detail.address')}</span>
                      <span className="order-detail-value">{detailOrder.address}</span>
                    </div>
                    {detailOrder.description ? (
                      <div className="order-detail-item order-detail-item--span order-detail-item--notes">
                        <span className="order-detail-label">{t('orders.detail.description')}</span>
                        <span className="order-detail-value order-detail-value--notes">{detailOrder.description}</span>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="order-detail-summary__card" aria-labelledby="od-summary-care">
                  <h3 id="od-summary-care" className="order-detail-summary__title">
                    {t('orders.detail.reportDelivery')}
                  </h3>
                  <div className="order-detail-grid order-detail-grid--in-card">
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.status')}</span>
                      <span className={statusBadgeClass(detailOrder.status)}>
                        {orderStatusLabel(detailOrder.status)}
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.priority')}</span>
                      <span className="order-detail-value">{orderPriorityLabel(detailOrder.priority)}</span>
                    </div>
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">{t('orders.detail.reportDelivery')}</span>
                      <span className="order-detail-value">
                        {formatReportDeliveryMethod(detailOrder.report_delivery_method)}
                      </span>
                    </div>
                  </div>
                </section>

                <section className="order-detail-summary__card" aria-labelledby="od-summary-money">
                  <h3 id="od-summary-money" className="order-detail-summary__title">
                    {t('orders.detail.finalPrice')}
                  </h3>
                  <div className="order-detail-grid order-detail-grid--in-card">
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.originalPrice')}</span>
                      <span className="order-detail-value">
                        {detailOrder.original_price_mmk.toLocaleString()} {t('orders.currency')}
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.create.blendedDiscount')}</span>
                      <span className="order-detail-value">{detailOrder.discount_percent}%</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.finalPrice')}</span>
                      <span className="order-detail-value order-detail-value--emphasis">
                        {detailOrder.final_price_mmk.toLocaleString()} {t('orders.currency')}
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.paymentModal.alreadyPaid')}</span>
                      <span className="order-detail-value">
                        {(detailOrder.total_paid_mmk ?? 0).toLocaleString()} {t('orders.currency')}
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.paymentModal.balanceRemaining')}</span>
                      <span className="order-detail-value order-detail-value--emphasis">
                        {Math.max(
                          0,
                          detailOrder.balance_mmk ??
                            detailOrder.final_price_mmk - (detailOrder.total_paid_mmk ?? 0),
                        ).toLocaleString()}{' '}
                        {t('orders.currency')}
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.paymentStatus')}</span>
                      {(() => {
                        const payData = paymentByOrderId.get(detailOrder.id)
                        const display = orderPaymentListDisplay(
                          payData ??
                            (detailOrder.payments?.length
                              ? {
                                  summary: {
                                    total_price: detailOrder.final_price_mmk,
                                    total_paid: detailOrder.total_paid_mmk ?? 0,
                                    balance:
                                      detailOrder.balance_mmk ??
                                      detailOrder.final_price_mmk - (detailOrder.total_paid_mmk ?? 0),
                                  },
                                  history: detailOrder.payments,
                                }
                              : undefined),
                          detailOrder.final_price_mmk,
                        )
                        return (
                          <span className={paymentBadgeClass(display.status, display.fullyPaid)}>
                            {paymentDisplayKeyLabel(display.labelKey)}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('common.created')}</span>
                      <span className="order-detail-value order-detail-value--muted">{fmtDateTime(detailOrder.created_at)}</span>
                    </div>
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">{t('common.updated')}</span>
                      <span className="order-detail-value order-detail-value--muted">{fmtDateTime(detailOrder.updated_at)}</span>
                    </div>
                  </div>
                </section>
              </div>

              {orderPrescriptionAttachmentUrl(detailOrder) ? (
                <PrescriptionPreviewBlock url={orderPrescriptionAttachmentUrl(detailOrder)!} />
              ) : null}

              {(detailOrder.payments?.length ?? 0) > 0 ? (
                <div className="order-detail-section">
                  <h3 className="order-detail-section__title">{t('orders.detail.payments')}</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('orders.detail.amount')}</th>
                          <th>{t('orders.detail.status')}</th>
                          <th>{t('orders.detail.method')}</th>
                          <th>{t('orders.detail.reference')}</th>
                          <th>{t('orders.detail.paidAt')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrder.payments!.map((p) => {
                          const displayStatus = normalizePaymentStatusForDisplay(p.status)
                          return (
                          <tr key={p.id}>
                            <td>{p.amount_mmk.toLocaleString()}</td>
                            <td>
                              <span className={paymentBadgeClass(displayStatus)}>
                                {paymentDisplayKeyLabel(displayStatus as PaymentDisplayKey)}
                              </span>
                            </td>
                            <td>{p.method ?? t('common.none')}</td>
                            <td>{p.reference_no?.trim() || t('common.none')}</td>
                            <td>{fmtDateTime(p.paid_at ?? undefined)}</td>
                          </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {detailOrder.schedule ? (
                <div className="order-detail-section">
                  <h3 className="order-detail-section__title">{t('orders.detail.schedule')}</h3>
                  <div className="order-detail-schedule-grid">
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.collectingPerson')}</span>
                      <span className="order-detail-value">
                        {detailOrder.schedule.collecting_person ?? t('common.none')}
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.collectionTime')}</span>
                      <span className="order-detail-value">{fmtDateTime(detailOrder.schedule.collection_time ?? undefined)}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.runningTime')}</span>
                      <span className="order-detail-value">{fmtDateTime(detailOrder.schedule.running_time ?? undefined)}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">{t('orders.detail.reportOut')}</span>
                      <span className="order-detail-value">{fmtDateTime(detailOrder.schedule.report_out_time ?? undefined)}</span>
                    </div>
                  </div>
                  <p className="order-detail-section__footer-note">
                    {t('orders.detail.acceptedByUser', {
                      value: detailOrder.schedule.accepted_by_user ? t('common.yes') : t('common.no'),
                    })}
                  </p>
                </div>
              ) : (
                <div className="order-detail-section order-detail-section--muted">
                  <p className="order-detail-section__empty">{t('orders.detail.noSchedule')}</p>
                </div>
              )}

              <div className="order-detail-section order-detail-section--flush">
                <h3 className="order-detail-section__title">{t('orders.detail.lineItems')}</h3>
                {detailOrder.items.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--muted)' }}>{t('orders.detail.noLineItems')}</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>{t('orders.detail.test')}</th>
                          <th>{t('orders.detail.qty')}</th>
                          <th>{t('orders.detail.unitPrice')}</th>
                          <th>{t('orders.detail.subtotal')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrder.items.map((it, idx) => {
                          const t = testMap.get(it.test_id)
                          const label =
                            t != null
                              ? `${t.test_name} (${t.test_code})`
                              : it.test_name
                                ? `${it.test_name}${it.test_code ? ` (${it.test_code})` : ''}`
                                : it.test_id
                          return (
                            <tr key={`${it.test_id}-${idx}`}>
                              <td>{label}</td>
                              <td>{it.quantity}</td>
                              <td>{it.unit_price_mmk.toLocaleString()}</td>
                              <td>{it.subtotal_mmk.toLocaleString()}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-card--order-detail__footer row-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  const row = rows.find((r) => r.id === detailOrder.id)
                  if (row) openPaymentUpdate(row)
                  else {
                    openPaymentUpdate({
                      id: detailOrder.id,
                      patient_name: detailOrder.patient_name,
                      priority: detailOrder.priority,
                      status: detailOrder.status,
                      original_price_mmk: detailOrder.original_price_mmk,
                      final_price_mmk: detailOrder.final_price_mmk,
                      created_at: detailOrder.created_at,
                    })
                  }
                }}
              >
                {t('orders.actions.updatePayment')}
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setDetailOrder(null)}>
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignOpen && assignOrderDetail && assignOrderId === assignOrderDetail.id ? (
        <div
          className="modal-backdrop"
          style={{ zIndex: 10001 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="assign-tests-title"
          onMouseDown={(e) => e.target === e.currentTarget && !assignSubmitting && setAssignOpen(false)}
        >
          <div className="modal-card modal-card--assign-tests" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 id="assign-tests-title" className="modal-title">{t('orders.assign.title')}</h2>
              <button
                type="button"
                className="btn btn-ghost modal-close"
                onClick={() => !assignSubmitting && setAssignOpen(false)}
                aria-label={t('common.close')}
                disabled={assignSubmitting}
              >
                ×
              </button>
            </div>
            <form className="modal-card--assign-tests__form" onSubmit={(e) => void submitAssignTests(e)}>
              <div className="assign-tests-body-split">
                <div className="assign-tests-body-split__left assign-tests-tests-section">
                  <div className="assign-tests-left-meta">
                    <div className="assign-tests-order-summary">
                      <span className="assign-tests-order-summary__patient">{assignOrderDetail.patient_name}</span>
                      {assignOrderDetail.user_id ? (
                        <span className="assign-tests-order-summary__user">
                          {t('orders.assign.ordering')}{' '}
                          {assignOrderDetail.ordering_user_name?.trim() ||
                            userMap.get(assignOrderDetail.user_id)?.name ||
                            assignOrderDetail.user_id}
                          <span className="assign-tests-order-summary__role">
                            {' '}
                            (
                            {resolveOrderingUserRole(assignOrderDetail, userMap) ??
                              userMap.get(assignOrderDetail.user_id)?.role ??
                              t('common.none')}
                            )
                          </span>
                        </span>
                      ) : null}
                    </div>
                    {assignOrderDetail.description?.trim() ? (
                      <div className="assign-tests-clinical-card">
                        <div className="assign-tests-clinical-card__title">{t('orders.assign.clinicalNotes')}</div>
                        <div className="assign-tests-clinical-card__body">{assignOrderDetail.description.trim()}</div>
                      </div>
                    ) : (
                      <div className="assign-tests-clinical-card assign-tests-clinical-card--muted">
                        <div className="assign-tests-clinical-card__title">{t('orders.assign.clinicalNotes')}</div>
                        <div className="assign-tests-clinical-card__body assign-tests-clinical-card__body--placeholder">
                          {t('orders.assign.noClinicalNotes')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="assign-tests-left-body">
                    <div className="assign-tests-catalog-block">
                      <p className="assign-tests-dialog__hint">
                        {t('orders.assign.hint', {
                          role:
                            (assignOrderDetail.user_id
                              ? resolveOrderingUserRole(assignOrderDetail, userMap) ??
                                userMap.get(assignOrderDetail.user_id)?.role ??
                                t('common.none')
                              : t('common.none')) as string,
                          limit: ORDER_TEST_PICKER_LIMIT,
                        })}
                      </p>
                      {tests.length > ORDER_TEST_PICKER_LIMIT && !assignTestSearch.trim() ? (
                        <p className="assign-tests-banner assign-tests-banner--warn">
                          {t('orders.assign.catalogWarn', { limit: ORDER_TEST_PICKER_LIMIT })}
                        </p>
                      ) : null}
                      <OrderTestCheckboxPicker
                        disabled={assignSubmitting || tests.length === 0}
                        open={assignTestPickerOpen}
                        onOpenChange={setAssignTestPickerOpen}
                        rows={assignPickerPanel.rows}
                        totalMatches={assignPickerPanel.totalMatches}
                        selectedIds={assignSelectedIds}
                        onToggle={toggleAssignTest}
                        userRole={resolveOrderingUserRole(assignOrderDetail, userMap)}
                        testDiscounts={testDiscounts}
                        triggerId="assign-test-multiselect"
                        listId="assign-test-multiselect-list"
                        filterValue={assignTestSearch}
                        onFilterChange={setAssignTestSearch}
                        filterInputId="assign-test-filter"
                      />
                    </div>

                    <div className="assign-tests-queue-section">
                      <div className="assign-tests-queue-section__head">
                        <span className="assign-tests-queue-section__title">{t('orders.create.testsOnOrder')}</span>
                        {assignSelectedIds.length > 0 ? (
                          <span className="assign-tests-queue-section__count">{assignSelectedIds.length}</span>
                        ) : null}
                      </div>
                      {assignSelectedIds.length > 0 ? (
                        <div className="table-wrap assign-tests-queue-table">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>{t('orders.testPicker.label')}</th>
                                <th>{t('orders.testPicker.discount')}</th>
                                <th>{t('orders.testPicker.finalMmk')}</th>
                                <th className="action-col"> </th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignSelectedIds.map((id) => {
                                const test = testMap.get(id)
                                if (!test) return null
                                const pct = activeDiscountPercentForOrder(
                                  testDiscounts,
                                  id,
                                  resolveOrderingUserRole(assignOrderDetail, userMap),
                                )
                                const unit = Math.round(test.base_price_mmk * 100) / 100
                                const sub =
                                  Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
                                return (
                                  <tr key={id}>
                                    <td>
                                      {test.test_name}{' '}
                                      <span style={{ color: 'var(--muted)' }}>({test.test_code})</span>
                                    </td>
                                    <td>{pct}%</td>
                                    <td>{sub.toLocaleString()}</td>
                                    <td className="action-cell">
                                      <button
                                        type="button"
                                        className="btn btn-ghost"
                                        style={{ fontSize: '0.8rem' }}
                                        onClick={() => removeAssignTest(id)}
                                        disabled={assignSubmitting}
                                      >
                                        {t('common.delete')}
                                      </button>
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="assign-tests-queue-empty" role="status">
                          <p className="assign-tests-queue-empty__lead">{t('orders.create.noTestsAdded')}</p>
                          <p className="assign-tests-queue-empty__hint">
                            {t('orders.create.testPickerHint')}
                          </p>
                        </div>
                      )}
                    </div>

                    {assignError ? (
                      <div className="form-alert form-alert--error assign-tests-left-error" role="alert">
                        {assignError}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="assign-tests-body-split__preview" aria-label={t('orders.prescription.preview')}>
                  {(() => {
                    const rxUrl = orderPrescriptionAttachmentUrl(assignOrderDetail)
                    return rxUrl ? (
                      <PrescriptionPanelEmbed url={rxUrl} />
                    ) : (
                      <div className="assign-tests-prescription-panel assign-tests-prescription-panel--empty-side">
                        <p>{t('common.none')}</p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="modal-card--assign-tests__footer row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignOpen(false)} disabled={assignSubmitting}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignSubmitting || tests.length === 0 || assignSelectedIds.length === 0}>
                  {assignSubmitting ? t('orders.assign.submitting') : t('orders.assign.submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('orders.delete.title')}
        message={
          deleteTarget
            ? t('orders.delete.message', { id: deleteTarget.id, patient: deleteTarget.patient_name })
            : ''
        }
        confirmLabel={t('orders.delete.confirm')}
        cancelLabel={t('common.cancel')}
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  )
}
