import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { DatetimeLocalField } from '../components/common/DatetimeLocalField'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { messageFromError, useErrorToast } from '../hooks/usePageNotify'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { formatCoordPair, LocationMapPicker } from '../components/users/LocationMapPicker'
import type { EndUserRole, LabTestCatalogRow, StaffListRow, StaffRole, UserListRow } from '../model/types'
import { getApiBaseUrl, isApiMode } from '../services/apiBase'
import { fetchAllDiscounts, type TestDiscountListRow } from '../services/discountService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import {
  createPayment,
  fetchPaymentsByOrderId,
  PAYMENT_METHOD_OPTIONS,
  updatePaymentStatus,
  type ApiPayment,
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
  updateOrderStatus,
} from '../services/orderService'
import { upsertSchedule, type ApiOrderSchedule } from '../services/scheduleService'
import { fetchStaffList } from '../services/staffService'
import { datetimeLocalToIso, toDatetimeLocalValue } from '../utils/datetimeLocal'
import { useAddressGeocode } from '../hooks/useAddressGeocode'
import { fetchUserList } from '../services/userService'
import '../components/common/ui.css'

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

function paymentBadgeClass(status: ApiPaymentStatus | 'unpaid', fullyPaid = false): string {
  if (fullyPaid && status === 'received') return 'badge badge--success'
  const map: Record<ApiPaymentStatus | 'unpaid', string> = {
    unpaid: 'badge badge--danger',
    pending: 'badge badge--warn',
    received: 'badge badge--neutral',
    verified: 'badge badge--success',
    failed: 'badge badge--danger',
  }
  return map[status]
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

const ADMIN_PAYMENT_UPDATE_STATUSES: ApiPaymentStatus[] = ['received', 'verified', 'failed']

type PaymentModalFocus = 'add' | 'fix'

function PaymentModalSummary({ amounts }: { amounts: ReturnType<typeof orderPaymentAmounts> }) {
  const due = amounts.balance > 0 ? amounts.balance : 0
  const fullyPaid = amounts.total > 0 && due <= 0
  return (
    <div className="payment-modal-summary">
      <div className="payment-modal-summary__head">
        <span className="payment-modal-summary__title">Balance</span>
        {fullyPaid ? <span className="payment-modal-summary__badge">Fully paid</span> : null}
      </div>
      <div className="payment-modal-stats" role="group" aria-label="Order payment summary">
        <div className="payment-modal-stat">
          <span className="payment-modal-stat__label">Total</span>
          <span className="payment-modal-stat__value">{amounts.total.toLocaleString()}</span>
          <span className="payment-modal-stat__unit">MMK</span>
        </div>
        <div className="payment-modal-stat">
          <span className="payment-modal-stat__label">Paid</span>
          <span className="payment-modal-stat__value">{amounts.paid.toLocaleString()}</span>
          <span className="payment-modal-stat__unit">MMK</span>
        </div>
        <div
          className={`payment-modal-stat${due > 0 ? ' payment-modal-stat--due' : ' payment-modal-stat--clear'}`}
        >
          <span className="payment-modal-stat__label">Due</span>
          <span className="payment-modal-stat__value">{due.toLocaleString()}</span>
          <span className="payment-modal-stat__unit">MMK</span>
        </div>
      </div>
    </div>
  )
}

type OrderPaymentListDisplay = {
  label: string
  status: ApiPaymentStatus | 'unpaid'
  /** Order fully paid — used for green badge on `received` */
  fullyPaid?: boolean
}

/** Label + badge for the order list payment column. */
function orderPaymentListDisplay(
  data: ApiPaymentOrderSummary | undefined,
  finalPriceMmk: number,
): OrderPaymentListDisplay {
  if (!data) return { label: '—', status: 'unpaid' }
  const { balance, total_price, total_paid } = data.summary
  const history = data.history
  const total = total_price > 0 ? total_price : finalPriceMmk
  const fullyPaid = total > 0 && balance <= 0 && total_paid > 0

  if (history.length === 0) {
    return balance <= 0 && total <= 0
      ? { label: 'unpaid', status: 'unpaid' }
      : { label: 'unpaid', status: 'unpaid' }
  }

  const failedOnly = history.every((p) => p.status === 'failed')
  if (failedOnly) return { label: 'failed', status: 'failed' }

  if (fullyPaid) {
    // Verified = staff confirmed (optional). Received = money recorded at the lab.
    if (history.some((p) => p.status === 'verified')) {
      return { label: 'verified', status: 'verified', fullyPaid: true }
    }
    return { label: 'received', status: 'received', fullyPaid: true }
  }

  if (balance > 0) {
    const pending = history.find((p) => p.status === 'pending')
    if (pending) return { label: 'pending', status: 'pending' }
    if (total_paid > 0) {
      return { label: 'partial received', status: 'received', fullyPaid: false }
    }
    return { label: 'unpaid', status: 'unpaid' }
  }

  const latest = history[history.length - 1]
  return { label: latest.status, status: latest.status }
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

function staffRoleShort(role: StaffRole): string {
  const map: Record<StaffRole, string> = {
    admin: 'Admin',
    lab_technician: 'Lab tech',
    reception: 'Reception',
    manager: 'Manager',
    collector: 'Collector',
  }
  return map[role] ?? role
}

/** Active staff for pickers; if none active, fall back to non-deleted. */
function collectorStaffDropdownList(st: StaffListRow[]): StaffListRow[] {
  const active = st.filter((s) => !s.is_deleted && s.is_active)
  return active.length > 0 ? active : st.filter((s) => !s.is_deleted)
}

const COLLECTOR_OTHER_VALUE = '__other__'

function fmtDateTime(raw: string | undefined): string {
  if (!raw) return '—'
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
    return <span className="order-detail-value">—</span>
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
  const u = url.trim()
  if (!u) return null
  return (
    <div
      className="order-detail-section order-detail-section--prescription"
      style={compact ? { marginBottom: '0.65rem' } : undefined}
    >
      <h3 className="order-detail-section__title">Prescription</h3>
      {prescriptionLooksImage(u) ? (
        <div className="order-prescription-preview order-prescription-preview--image-only">
          <img className="order-prescription-preview__img" src={prescriptionEmbedSrc(u)} alt="Prescription" />
          <div className="order-prescription-preview__foot">
            <a className="btn btn-secondary" href={u} target="_blank" rel="noopener noreferrer">
              Open in new tab
            </a>
          </div>
        </div>
      ) : prescriptionLooksPdf(u) ? (
        <div className="order-prescription-pdf-card">
          <p className="order-prescription-pdf-card__text">
            PDF prescription — open in a new tab to view (inline preview is off).
          </p>
          <a className="btn btn-primary" href={u} target="_blank" rel="noopener noreferrer">
            Open PDF
          </a>
        </div>
      ) : (
        <a className="btn btn-secondary" href={u} target="_blank" rel="noopener noreferrer">
          Open prescription file
        </a>
      )}
    </div>
  )
}

/** Embedded PDF / image preview while assigning tests (right column uses default tall panel). */
function PrescriptionPanelEmbed({ url }: { url: string }) {
  const u = url.trim()
  if (!u) return null
  const src = prescriptionEmbedSrc(u)
  return (
    <div className="assign-tests-prescription-panel">
      <div className="assign-tests-prescription-panel__header">Prescription preview</div>
      <div className="assign-tests-prescription-panel__body">
        {prescriptionLooksImage(u) ? (
          <img src={src} alt="Prescription" />
        ) : prescriptionLooksPdf(u) ? (
          <iframe title="Prescription PDF" src={src} />
        ) : (
          <div style={{ padding: '1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            <p style={{ margin: '0 0 0.65rem' }}>Inline preview isn’t available for this file type.</p>
            <a className="btn btn-secondary" href={u} target="_blank" rel="noopener noreferrer">
              Open in new tab
            </a>
          </div>
        )}
      </div>
      <div className="assign-tests-prescription-panel__foot">
        <a className="btn btn-ghost" href={u} target="_blank" rel="noopener noreferrer">
          Open in new tab
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
  const wrapRef = useRef<HTMLDivElement>(null)
  const filterInputRef = useRef<HTMLInputElement>(null)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds])
  const n = selectedIds.length
  const summary = n === 0 ? 'Choose tests…' : `${n} test${n === 1 ? '' : 's'} selected`

  useEffect(() => {
    if (!open || disabled) return
    const id = requestAnimationFrame(() => {
      filterInputRef.current?.focus()
    })
    return () => cancelAnimationFrame(id)
  }, [open, disabled])

  useEffect(() => {
    if (!open) return
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) onOpenChange(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
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
      <label htmlFor={triggerId}>Test</label>
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
              Search tests
            </label>
            <input
              ref={filterInputRef}
              id={filterInputId}
              type="text"
              className="order-test-multiselect-panel__search-input"
              placeholder="Name or code…"
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
          {totalMatches > ORDER_TEST_PICKER_LIMIT ? (
            <p className="order-test-multiselect-panel__hint">
              Showing {ORDER_TEST_PICKER_LIMIT} of {totalMatches} matches — narrow your search.
            </p>
          ) : null}
          {rows.length === 0 ? (
            <p style={{ margin: '0.6rem 0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              No matches — try different keywords.
            </p>
          ) : (
            rows.map((t) => {
              const pct = activeDiscountPercentForOrder(testDiscounts, t.id, userRole)
              const unit = t.base_price_mmk
              const lineFinal =
                Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
              const checked = selectedSet.has(t.id)
              return (
                <label key={t.id} className="order-test-multiselect-row">
                  <input
                    type="checkbox"
                    className="order-test-multiselect-row__check"
                    checked={checked}
                    onChange={() => onToggle(t.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="order-test-multiselect-row__body">
                    <span className="order-test-multiselect-row__title">
                      <span className="order-test-multiselect-row__name">{t.test_name}</span>
                      <span className="order-test-multiselect-row__code">{t.test_code}</span>
                    </span>
                    <span className="order-test-multiselect-row__foot">
                      <span className="order-test-multiselect-row__discount">
                        {pct > 0 ? `${pct}% off` : 'No discount'}
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
        </div>
      ) : null}
      </div>
    </div>
  )
}

export function OrderManagementPage() {
  const hasApi = isApiMode()
  const { showSuccess, showError } = useToast()
  const [rows, setRows] = useState<ApiOrderListRow[]>([])
  const [users, setUsers] = useState<UserListRow[]>([])
  const [staff, setStaff] = useState<StaffListRow[]>([])
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
  const [createLatitude, setCreateLatitude] = useState<number | ''>(0)
  const [createLongitude, setCreateLongitude] = useState<number | ''>(0)

  const onCreateGeocodeCoords = useCallback((lat: number, lng: number) => {
    setCreateLatitude(lat)
    setCreateLongitude(lng)
  }, [])

  const createGeocodeHint = useAddressGeocode({
    enabled: createOpen,
    address: createAddress,
    onCoords: onCreateGeocodeCoords,
  })

  const [statusOpen, setStatusOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<ApiOrderListRow | null>(null)
  const [statusValue, setStatusValue] = useState<ApiOrderStatus>('pending')
  const [statusStaffId, setStatusStaffId] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [schCollectingPerson, setSchCollectingPerson] = useState('')
  const [schCollectorSelect, setSchCollectorSelect] = useState('')
  const [schCollectionTime, setSchCollectionTime] = useState('')
  const [schRunningTime, setSchRunningTime] = useState('')
  const [schReportOutTime, setSchReportOutTime] = useState('')
  const [schAcceptedByUser, setSchAcceptedByUser] = useState(false)

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
  const [paymentUpdateSelectedId, setPaymentUpdateSelectedId] = useState('')
  const [paymentUpdateStatus, setPaymentUpdateStatus] = useState<ApiPaymentStatus>('pending')
  const [paymentUpdateStaffId, setPaymentUpdateStaffId] = useState('')
  const [paymentUpdateAmount, setPaymentUpdateAmount] = useState<number | ''>('')
  const [paymentUpdateMethod, setPaymentUpdateMethod] = useState<ApiPaymentMethod>('cash')
  const [paymentUpdateReference, setPaymentUpdateReference] = useState('')
  const [paymentUpdateSubmitting, setPaymentUpdateSubmitting] = useState(false)
  const [paymentSubmitAction, setPaymentSubmitAction] = useState<'record' | 'fix' | null>(null)
  const [paymentUpdateFocus, setPaymentUpdateFocus] = useState<PaymentModalFocus>('add')
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
      setStaff([])
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
        const [ordersRes, usersRes, staffRes, testsRes, discountsRes] = await Promise.all([
          fetchOrders(ordersListQuery),
          fetchUserList(),
          fetchStaffList(),
          fetchLabTestsList(),
          fetchAllDiscounts(),
        ])
        if (cancelled) return
        setRows(ordersRes)
        if (ordersRes.length === 0 && ordersPage > 1) {
          setOrdersPage((p) => Math.max(1, p - 1))
        }
        setUsers(usersRes.filter((u) => !u.is_deleted))
        setStaff(staffRes.filter((s) => !s.is_deleted))
        setTests(testsRes.filter((t) => t.is_active && !t.is_deleted))
        setTestDiscounts(discountsRes)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load orders')
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
  const collectorStaffOptions = useMemo(() => collectorStaffDropdownList(staff), [staff])
  const testMap = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests])

  /** While updating an order that is still `pending`, only allow `pending` or `scheduled` in the UI. */
  const statusUpdateSelectOptions = useMemo((): ApiOrderStatus[] => {
    if (statusTarget?.status === 'pending') return ['pending', 'scheduled']
    return ORDER_STATUS_OPTIONS
  }, [statusTarget?.status])

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

  const assignPickerPanel = useMemo(
    () => filterTestsForOrderDropdown(tests, assignTestSearch, new Set(), ORDER_TEST_PICKER_LIMIT),
    [tests, assignTestSearch],
  )

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

  function openPaymentUpdate(row: ApiOrderListRow, focus: PaymentModalFocus = 'add') {
    const data = paymentSummaryForOrder(row.id, paymentByOrderId, detailOrder, row)
    const history = data?.history ?? []
    const latest = history[history.length - 1]
    setPaymentUpdateFocus(focus === 'fix' && history.length === 0 ? 'add' : focus)
    setPaymentUpdateOrder(row)
    setPaymentUpdateSelectedId(latest?.id ?? '')
    setPaymentUpdateStatus(latest?.status === 'failed' ? 'received' : (latest?.status ?? 'received'))
    setPaymentUpdateStaffId(staff[0]?.id ?? '')
    const balance = data?.summary.balance ?? row.final_price_mmk
    setPaymentUpdateAmount(balance > 0 ? Math.round(balance * 100) / 100 : '')
    setPaymentUpdateMethod('cash')
    setPaymentUpdateReference('')
    setPaymentUpdateError(null)
    setPaymentSubmitAction(null)
    setOpenMenuId(null)
    setPaymentUpdateOpen(true)
  }

  function onPaymentUpdateSelectPayment(paymentId: string, history: ApiPayment[]) {
    setPaymentUpdateSelectedId(paymentId)
    const p = history.find((h) => h.id === paymentId)
    if (p) setPaymentUpdateStatus(p.status)
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
      return setPaymentUpdateError('Enter a valid payment amount.')
    }
    setPaymentSubmitAction('record')
    setPaymentUpdateSubmitting(true)
    try {
      await createPayment({
        order_id: paymentUpdateOrder.id,
        amount_mmk: amount,
        method: paymentUpdateMethod,
        status: 'received',
        reference_no: paymentUpdateReference.trim() || null,
      })
      showSuccess('Payment recorded.')
      setPaymentUpdateOpen(false)
      await refreshPaymentForOrder(paymentUpdateOrder.id)
      if (detailOrder?.id === paymentUpdateOrder.id) void refreshDetailOrder(paymentUpdateOrder.id)
    } catch (err) {
      setPaymentUpdateError(err instanceof Error ? err.message : 'Payment update failed')
    } finally {
      setPaymentUpdateSubmitting(false)
      setPaymentSubmitAction(null)
    }
  }

  async function submitPaymentFix() {
    if (!paymentUpdateOrder) return
    setPaymentUpdateError(null)
    if (paymentUpdateStatus === 'verified' && !paymentUpdateStaffId) {
      return setPaymentUpdateError('Select staff when marking payment as verified.')
    }
    if (!paymentUpdateSelectedId) {
      return setPaymentUpdateError('Select a payment to update.')
    }
    setPaymentSubmitAction('fix')
    setPaymentUpdateSubmitting(true)
    try {
      await updatePaymentStatus(paymentUpdateSelectedId, {
        status: paymentUpdateStatus,
        staff_id: paymentUpdateStatus === 'verified' ? paymentUpdateStaffId : undefined,
      })
      showSuccess('Payment status updated.')
      setPaymentUpdateOpen(false)
      await refreshPaymentForOrder(paymentUpdateOrder.id)
      if (detailOrder?.id === paymentUpdateOrder.id) void refreshDetailOrder(paymentUpdateOrder.id)
    } catch (err) {
      setPaymentUpdateError(err instanceof Error ? err.message : 'Payment update failed')
    } finally {
      setPaymentUpdateSubmitting(false)
      setPaymentSubmitAction(null)
    }
  }

  function openCreateOrder() {
    const firstUser = users[0]
    const firstTest = tests[0]
    setCreateUserId(firstUser?.id ?? '')
    setCreatePriority('elective')
    setCreatePatientName(firstUser?.name ?? '')
    setCreatePatientAge('')
    setCreatePatientPhone(firstUser?.phone ?? '')
    setCreateAddress(firstUser?.address ?? '')
    setCreateDescription('')
    setCreateSelectedTestIds([])
    setCreateTestSearch('')
    setCreateTestPickerOpen(false)
    setCreateLatitude(firstUser ? firstUser.latitude : 0)
    setCreateLongitude(firstUser ? firstUser.longitude : 0)
    if (!firstUser && !firstTest) {
      setCreateError('No users and no lab tests found. Create users/tests first.')
    } else if (!firstUser) {
      setCreateError('No users found. Create at least one user first.')
    } else if (!firstTest) {
      setCreateError('No lab tests found. Create at least one lab test first.')
    } else {
      setCreateError(null)
    }
    setCreateOpen(true)
  }

  function onCreateUserChange(userId: string) {
    setCreateUserId(userId)
    const u = userMap.get(userId)
    if (!u) return
    setCreatePatientName(u.name)
    setCreatePatientPhone(u.phone)
    setCreateAddress(u.address)
    setCreateLatitude(u.latitude)
    setCreateLongitude(u.longitude)
  }

  function toggleCreateTest(testId: string) {
    setCreateSelectedTestIds((prev) => (prev.includes(testId) ? prev.filter((id) => id !== testId) : [...prev, testId]))
  }

  function removeCreateTest(testId: string) {
    setCreateSelectedTestIds((prev) => prev.filter((id) => id !== testId))
  }

  async function submitCreateOrder(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateTestPickerOpen(false)
    if (!createUserId) return setCreateError('Select a user.')
    if (createSelection.lines.length === 0) return setCreateError('Select at least one test.')
    if (!createPatientName.trim()) return setCreateError('Enter patient name.')
    if (!createPatientPhone.trim()) return setCreateError('Enter patient phone.')
    if (!createAddress.trim()) return setCreateError('Enter address.')
    const age = typeof createPatientAge === 'number' ? createPatientAge : Number.parseInt(String(createPatientAge), 10)
    if (!Number.isFinite(age) || age < 0) return setCreateError('Enter valid patient age.')
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
        items,
      })
      setCreateOpen(false)
      bumpOrderViews()
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function openDetail(id: string) {
    setDetailOrder(null)
    setDetailError(null)
    setDetailLoading(true)
    try {
      const order = await fetchOrderById(id)
      if (!order) {
        setDetailError('Order not found.')
      } else {
        setDetailOrder(order)
        void refreshPaymentForOrder(id)
      }
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load detail')
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
        showError('Order not found.')
        return
      }
      setAssignOrderDetail(order)
      setAssignOrderId(order.id)
      setAssignOpen(true)
    } catch (e) {
      showError(messageFromError(e, 'Failed to load order'))
    }
  }

  function canAddTestFromListRow(o: ApiOrderListRow): boolean {
    return o.status === 'pending' && !testsAssignedFlag(o.is_tests_assigned)
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

  async function openStatusUpdate(row: ApiOrderListRow, schedulePrefill?: ApiOrderSchedule | null) {
    setStatusTarget(row)
    setStatusValue(row.status)
    setStatusStaffId(staff[0]?.id ?? '')
    setStatusNote('')
    setStatusError(null)
    let pre: ApiOrderSchedule | null = schedulePrefill ?? null
    if (schedulePrefill === undefined && row.status === 'scheduled') {
      try {
        const d = await fetchOrderById(row.id)
        pre = d?.schedule ?? null
      } catch {
        pre = null
      }
    }
    const opts = collectorStaffDropdownList(staff)
    const raw = (pre?.collecting_person ?? '').trim()
    if (opts.length === 0) {
      setSchCollectorSelect(COLLECTOR_OTHER_VALUE)
      setSchCollectingPerson(raw)
    } else {
      const match = opts.find((s) => s.name.trim().toLowerCase() === raw.toLowerCase())
      if (match) {
        setSchCollectorSelect(match.id)
        setSchCollectingPerson('')
      } else if (raw) {
        setSchCollectorSelect(COLLECTOR_OTHER_VALUE)
        setSchCollectingPerson(raw)
      } else {
        setSchCollectorSelect(opts[0]?.id ?? '')
        setSchCollectingPerson('')
      }
    }
    setSchCollectionTime(toDatetimeLocalValue(pre?.collection_time ?? null))
    setSchRunningTime(toDatetimeLocalValue(pre?.running_time ?? null))
    setSchReportOutTime(toDatetimeLocalValue(pre?.report_out_time ?? null))
    setSchAcceptedByUser(Boolean(pre?.accepted_by_user))
    setStatusOpen(true)
  }

  async function submitAssignTests(e: FormEvent) {
    e.preventDefault()
    setAssignError(null)
    setAssignTestPickerOpen(false)
    if (!assignOrderId || !assignOrderDetail || assignOrderDetail.id !== assignOrderId) {
      setAssignError('Order context lost. Close this dialog and try again.')
      return
    }
    if (assignSelectedIds.length === 0) {
      setAssignError('Select at least one test.')
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
      setAssignError('No valid tests selected.')
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
      setAssignError(err instanceof Error ? err.message : 'Failed to assign tests')
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

  async function submitStatusUpdate(e: FormEvent) {
    e.preventDefault()
    if (!statusTarget) return
    setStatusError(null)
    if (!statusStaffId) return setStatusError('Select staff.')

    let scheduleCollectingPerson = ''
    if (statusValue === 'scheduled') {
      const opts = collectorStaffDropdownList(staff)
      if (opts.length === 0 || schCollectorSelect === COLLECTOR_OTHER_VALUE) {
        scheduleCollectingPerson = schCollectingPerson.trim()
      } else if (schCollectorSelect) {
        scheduleCollectingPerson = opts.find((s) => s.id === schCollectorSelect)?.name.trim() ?? ''
      }
      if (!scheduleCollectingPerson) {
        return setStatusError(
          opts.length === 0
            ? 'Enter who will perform collection (no staff accounts yet).'
            : schCollectorSelect === COLLECTOR_OTHER_VALUE
              ? 'Enter a name or team for collection.'
              : 'Select who will perform collection.',
        )
      }
      if (!schCollectionTime.trim()) return setStatusError('Enter collection date and time.')
      const cIso = datetimeLocalToIso(schCollectionTime)
      if (!cIso) return setStatusError('Collection date and time is invalid.')
    }

    setStatusSubmitting(true)
    try {
      if (statusValue === 'scheduled') {
        await upsertSchedule({
          order_id: statusTarget.id,
          collecting_person: scheduleCollectingPerson,
          collection_time: datetimeLocalToIso(schCollectionTime)!,
          running_time: schRunningTime.trim() ? datetimeLocalToIso(schRunningTime) : null,
          report_out_time: schReportOutTime.trim() ? datetimeLocalToIso(schReportOutTime) : null,
          accepted_by_user: schAcceptedByUser,
        })
      }
      await updateOrderStatus(statusTarget.id, {
        status: statusValue,
        staff_id: statusStaffId,
        note: statusNote.trim() || null,
      })
      setStatusOpen(false)
      bumpOrderViews()
      if (detailOrder && detailOrder.id === statusTarget.id) void refreshDetailOrder(statusTarget.id)
    } catch (e) {
      setStatusError(e instanceof Error ? e.message : 'Status update failed')
    } finally {
      setStatusSubmitting(false)
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const row = deleteTarget
    setDeleteTarget(null)
    try {
      await deleteOrder(row.id)
      showSuccess('Order deleted.')
      bumpOrderViews()
    } catch (e) {
      showError(messageFromError(e, 'Delete failed'))
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
      <PageHeader
        title="Order management"
        description="Review orders from the mobile app: confirm prescription, assign lab tests with role-based discounts, set collection schedule, then advance status through delivery."
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g. <code>http://localhost:3000</code>) and restart the dev server.
          </p>
        </div>
      ) : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label="Order filters">
          <ListFilterSearchField
            id="order-filter-patient"
            label="Patient"
            value={orderFilterPatientInput}
            onChange={(e) => setOrderFilterPatientInput(e.target.value)}
            disabled={!hasApi || loading}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="order-filter-status">
              Status
            </label>
            <select
              id="order-filter-status"
              className="list-filters-bar__select"
              value={orderFilterStatus}
              onChange={(e) => setOrderFilterStatus(e.target.value as '' | ApiOrderStatus)}
              disabled={!hasApi || loading}
            >
              <option value="">All</option>
              {ORDER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="order-filter-priority">
              Priority
            </label>
            <select
              id="order-filter-priority"
              className="list-filters-bar__select"
              value={orderFilterPriority}
              onChange={(e) => setOrderFilterPriority(e.target.value as '' | 'urgent' | 'elective')}
              disabled={!hasApi || loading}
            >
              <option value="">All</option>
              <option value="elective">Elective</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="order-filter-tests">
              Tests
            </label>
            <select
              id="order-filter-tests"
              className="list-filters-bar__select"
              value={orderFilterTests}
              onChange={(e) => setOrderFilterTests(e.target.value as '' | 'assigned' | 'missing')}
              disabled={!hasApi || loading}
            >
              <option value="">All</option>
              <option value="assigned">Assigned</option>
              <option value="missing">Missing</option>
            </select>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm list-filters-bar__clear"
            onClick={clearOrderFilters}
            disabled={!hasApi || loading}
          >
            Clear filters
          </button>
        </div>
        <div className="list-tools-row__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setRefreshTick((t) => t + 1)}
            disabled={!hasApi || loading}
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openCreateOrder}
            disabled={!hasApi || loading}
          >
            Create order
          </button>
        </div>
      </div>

      <div className="card">
        <div className="table-wrap table-wrap--sticky-actions">
          <table className="data-table data-table--catalog data-table--orders">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Phone</th>
                <th scope="col">Priority</th>
                <th scope="col">Status</th>
                <th scope="col" className="order-col-pay-status">
                  Payment
                </th>
                <th
                  scope="col"
                  className="col-num order-col-paid"
                  title="Sum of payments recorded on this order"
                >
                  Paid
                </th>
                <th scope="col" className="col-num order-col-due" title="Amount still owed on this order">
                  Due
                </th>
                <th scope="col" title="Prescription file uploaded">
                  Rx
                </th>
                <th scope="col">Tests</th>
                <th scope="col" className="col-num">
                  Original
                </th>
                <th scope="col" className="col-num">
                  Final
                </th>
                <th scope="col" className="action-col">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading orders" />
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={12} className="data-table__state">
                    <div className="data-table__empty-panel">
                      <div className="data-table__empty-icon" aria-hidden>
                        <span className="material-symbols-outlined">receipt_long</span>
                      </div>
                      <p className="data-table__empty-title">No orders yet</p>
                      <p className="data-table__empty-text">
                        When patients place orders they will appear here. Use filters above to narrow the list.
                      </p>
                      {hasApi ? (
                        <button type="button" className="btn btn-primary" onClick={openCreateOrder}>
                          Create order
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
                        '—'
                      )}
                    </td>
                    <td>
                      <span className={priorityBadgeClass(o.priority)}>{o.priority}</span>
                    </td>
                    <td>
                      <span className={statusBadgeClass(o.status)}>{o.status}</span>
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
                              {display.label}
                            </span>
                            {amounts.total > 0 ? (
                              <div
                                className="order-pay-progress"
                                role="progressbar"
                                aria-valuenow={amounts.percentPaid}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label={`${amounts.percentPaid}% paid`}
                              >
                                <div className="order-pay-progress__track">
                                  <div
                                    className={`order-pay-progress__fill${
                                      amounts.balance <= 0
                                        ? ' order-pay-progress__fill--complete'
                                        : display.label === 'partial received'
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
                        if (total <= 0) return '—'
                        if (balance <= 0) {
                          return <span className="order-due-zero">0</span>
                        }
                        return <span className="order-due-amount">{balance.toLocaleString()}</span>
                      })()}
                    </td>
                    <td>
                      {o.prescription_url ? (
                        <span className="badge badge--success" title={o.prescription_url}>
                          Yes
                        </span>
                      ) : (
                        <span className="badge badge--neutral">No</span>
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
                              {n} test{n === 1 ? '' : 's'}
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
                          <span className="badge badge--success">Assigned</span>
                        ) : (
                          <span className="badge badge--warn">Missing</span>
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
                            label: 'Detail',
                            onSelect: () => {
                              void openDetail(o.id)
                            },
                          },
                          {
                            label: 'Payment',
                            children: [
                              {
                                label: 'Add payment',
                                onSelect: () => {
                                  openPaymentUpdate(o, 'add')
                                },
                              },
                              ...((paymentByOrderId.get(o.id)?.history.length ?? 0) > 0
                                ? [
                                    {
                                      label: 'Update entry',
                                      onSelect: () => {
                                        openPaymentUpdate(o, 'fix')
                                      },
                                    },
                                  ]
                                : []),
                            ],
                          },
                          ...(canAddTestFromListRow(o)
                            ? [
                                {
                                  label: 'Add test',
                                  onSelect: () => {
                                    void openAddTestsFromListRow(o)
                                  },
                                },
                              ]
                            : []),
                          {
                            label: 'Update status',
                            onSelect: () => {
                              void openStatusUpdate(o)
                            },
                          },
                          {
                            label: 'Delete',
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
                <h2 className="modal-title">Create order</h2>
                <button
                  type="button"
                  className="btn btn-ghost modal-close"
                  onClick={() => !createSubmitting && setCreateOpen(false)}
                  aria-label="Close"
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
                <label htmlFor="om-user">Ordering user</label>
                <select id="om-user" className="select-chevron-left" value={createUserId} onChange={(e) => onCreateUserChange(e.target.value)} disabled={createSubmitting}>
                  {users.length === 0 ? (
                    <option value="">No users available</option>
                  ) : (
                    users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </option>
                    ))
                  )}
                </select>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                  Per-test discounts use this user’s role (same rules as mobile / Assign tests).
                </p>
              </div>
              <div className="field">
                <div id="om-tests-label" style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '0.35rem', color: 'var(--heading)' }}>
                  Tests on this order
                </div>
                {tests.length > ORDER_TEST_PICKER_LIMIT && !createTestSearch.trim() ? (
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#9a6700' }}>
                    Many tests in the catalog. Open <strong>Test</strong> and use the search box — the list shows at most{' '}
                    {ORDER_TEST_PICKER_LIMIT} matches at a time.
                  </p>
                ) : null}
                <p style={{ margin: '0 0 0.45rem', fontSize: '0.82rem', color: 'var(--muted)' }}>
                  Open <strong>Test</strong> for search and checkboxes (multi-select). Selected lines also appear in the
                  table below — use Delete there if a test is not in the current search results.
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
                          <th>Test</th>
                          <th>Discount</th>
                          <th>Final (MMK)</th>
                          <th className="action-col"> </th>
                        </tr>
                      </thead>
                      <tbody>
                        {createSelectedTestIds.map((id) => {
                          const t = testMap.get(id)
                          if (!t) return null
                          const pct = activeDiscountPercentForOrder(testDiscounts, id, createOrderUser?.role)
                          const unit = Math.round(t.base_price_mmk * 100) / 100
                          const sub =
                            Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
                          return (
                            <tr key={id}>
                              <td>
                                {t.test_name} <span style={{ color: 'var(--muted)' }}>({t.test_code})</span>
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
                                  Delete
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ margin: '0.55rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>No tests added yet.</p>
                )}
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="om-name">Patient name</label>
                  <input id="om-name" value={createPatientName} onChange={(e) => setCreatePatientName(e.target.value)} disabled={createSubmitting} />
                </div>
                <div className="field">
                  <label htmlFor="om-age">Age</label>
                  <input id="om-age" type="number" min={0} value={createPatientAge === '' ? '' : createPatientAge} onChange={(e) => setCreatePatientAge(e.target.value === '' ? '' : Number(e.target.value))} disabled={createSubmitting} />
                </div>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="om-phone">Phone</label>
                  <input id="om-phone" value={createPatientPhone} onChange={(e) => setCreatePatientPhone(e.target.value)} disabled={createSubmitting} />
                </div>
                <div className="field">
                  <label htmlFor="om-pri">Priority</label>
                  <select id="om-pri" className="select-chevron-left" value={createPriority} onChange={(e) => setCreatePriority(e.target.value as 'urgent' | 'elective')} disabled={createSubmitting}>
                    <option value="elective">Elective</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="om-address">Address</label>
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
                <label htmlFor="om-desc">Description</label>
                <textarea id="om-desc" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} disabled={createSubmitting} />
              </div>
              <div className="order-create-modal__grid-three">
                <div className="field">
                  <label>Original total (MMK)</label>
                  <input readOnly disabled value={createSelection.originalSum.toLocaleString()} className="lab-test-modal__input-computed" />
                </div>
                <div className="field">
                  <label>Blended discount %</label>
                  <input readOnly disabled value={String(createSelection.blendedDisc)} className="lab-test-modal__input-computed" />
                </div>
                <div className="field">
                  <label>Final total (MMK)</label>
                  <input readOnly disabled value={createSelection.finalSum.toLocaleString()} className="lab-test-modal__input-computed" />
                </div>
              </div>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createSubmitting || users.length === 0 || tests.length === 0 || createSelection.lines.length === 0}
                >
                  {createSubmitting ? 'Saving…' : 'Create'}
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
              const history = payData?.history ?? []
              const hasHistory = history.length > 0
              const enterAmount =
                typeof paymentUpdateAmount === 'number'
                  ? paymentUpdateAmount
                  : Number.parseFloat(String(paymentUpdateAmount))
              const adding = Number.isFinite(enterAmount) && enterAmount > 0 ? enterAmount : 0
              const previewPaid = Math.min(amounts.total, amounts.paid + adding)
              const previewLeft = Math.max(0, amounts.total - previewPaid)
              const showAddSection = paymentUpdateFocus === 'add'
              const showFixSection = paymentUpdateFocus === 'fix' && hasHistory
              const fullyPaid = amounts.total > 0 && amounts.balance <= 0

              return (
                <>
                  <div className="modal-head payment-modal__head">
                    <div>
                      <h2 id="payment-modal-title" className="modal-title">
                        {showFixSection ? 'Update payment entry' : 'Add payment'}
                      </h2>
                      <p className="payment-modal__subtitle">{paymentUpdateOrder.patient_name}</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost modal-close"
                      onClick={() => !paymentUpdateSubmitting && setPaymentUpdateOpen(false)}
                      aria-label="Close"
                      disabled={paymentUpdateSubmitting}
                    >
                      ×
                    </button>
                  </div>
                  <div className="payment-modal">
                    <PaymentModalSummary amounts={amounts} />

                    {paymentUpdateError ? (
                      <div className="form-alert form-alert--error" role="alert">
                        {paymentUpdateError}
                      </div>
                    ) : null}

                    {showAddSection ? (
                      <div className="payment-modal__form">
                        {fullyPaid ? (
                          <p className="payment-modal__notice" role="status">
                            This order is already fully paid. Enter an amount only if the patient
                            pays extra (e.g. additional tests).
                          </p>
                        ) : null}
                        <div className="payment-modal__row">
                          <div className="field payment-modal__amount-field">
                            <label htmlFor="pu-amount">Amount (MMK)</label>
                            <input
                              id="pu-amount"
                              type="number"
                              className="payment-modal__amount-input"
                              min={0}
                              step="0.01"
                              placeholder={fullyPaid ? '0' : amounts.balance > 0 ? String(Math.round(amounts.balance)) : '0'}
                              value={paymentUpdateAmount === '' ? '' : paymentUpdateAmount}
                              onChange={(e) =>
                                setPaymentUpdateAmount(
                                  e.target.value === '' ? '' : Number(e.target.value),
                                )
                              }
                              disabled={paymentUpdateSubmitting}
                            />
                            {amounts.balance > 0 ? (
                              <button
                                type="button"
                                className="payment-modal__fill-due"
                                onClick={() =>
                                  setPaymentUpdateAmount(Math.round(amounts.balance * 100) / 100)
                                }
                                disabled={paymentUpdateSubmitting}
                              >
                                Fill due ({amounts.balance.toLocaleString()} MMK)
                              </button>
                            ) : null}
                          </div>
                          <div className="field payment-modal__method-field">
                            <label htmlFor="pu-method">Method</label>
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
                        </div>
                        {adding > 0 ? (
                          <p className="payment-modal__preview" role="status">
                            After this payment:{' '}
                            <strong>{previewPaid.toLocaleString()}</strong> paid ·{' '}
                            <strong>{previewLeft.toLocaleString()}</strong> MMK due
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {showFixSection ? (
                      <div className="payment-modal__form">
                        <p className="payment-modal__notice payment-modal__notice--muted">
                          Update status on a payment already recorded — no new amount.
                        </p>
                        <div className="field">
                          <label htmlFor="pu-payment">Payment entry</label>
                          <select
                            id="pu-payment"
                            className="select-chevron-left"
                            value={paymentUpdateSelectedId}
                            onChange={(e) => onPaymentUpdateSelectPayment(e.target.value, history)}
                            disabled={paymentUpdateSubmitting}
                          >
                            {history.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.amount_mmk.toLocaleString()} MMK — {p.status}
                                {p.method ? ` (${p.method})` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="payment-modal__row">
                          <div className="field">
                            <label htmlFor="pu-status">New status</label>
                            <select
                              id="pu-status"
                              className="select-chevron-left"
                              value={paymentUpdateStatus}
                              onChange={(e) =>
                                setPaymentUpdateStatus(e.target.value as ApiPaymentStatus)
                              }
                              disabled={paymentUpdateSubmitting}
                            >
                              {ADMIN_PAYMENT_UPDATE_STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                          {paymentUpdateStatus === 'verified' ? (
                            <div className="field">
                              <label htmlFor="pu-staff">Verified by</label>
                              <select
                                id="pu-staff"
                                className="select-chevron-left"
                                value={paymentUpdateStaffId}
                                onChange={(e) => setPaymentUpdateStaffId(e.target.value)}
                                disabled={paymentUpdateSubmitting}
                              >
                                <option value="">Select staff</option>
                                {staff.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="payment-modal-footer">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setPaymentUpdateOpen(false)}
                        disabled={paymentUpdateSubmitting}
                      >
                        Cancel
                      </button>
                      {showAddSection ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => void submitPaymentUpdate()}
                          disabled={paymentUpdateSubmitting}
                        >
                          {paymentUpdateSubmitting && paymentSubmitAction === 'record'
                            ? 'Recording…'
                            : 'Record payment'}
                        </button>
                      ) : showFixSection ? (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => void submitPaymentFix()}
                          disabled={paymentUpdateSubmitting}
                        >
                          {paymentUpdateSubmitting && paymentSubmitAction === 'fix'
                            ? 'Saving…'
                            : 'Save changes'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </>
              )
            })()}
          </div>
        </div>
      ) : null}

      {statusOpen && statusTarget ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && !statusSubmitting && setStatusOpen(false)}>
          <div className="modal-card modal-card--status-update" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Update status</h2>
              <button type="button" className="btn btn-ghost modal-close" onClick={() => !statusSubmitting && setStatusOpen(false)} aria-label="Close" disabled={statusSubmitting}>×</button>
            </div>
            <div className="modal-card--status-update__body">
            <form className="form-grid status-update-form" onSubmit={(e) => void submitStatusUpdate(e)}>
              <div className="field">
                <label htmlFor="os-status">Status</label>
                <select id="os-status" className="select-chevron-left" value={statusValue} onChange={(e) => setStatusValue(e.target.value as ApiOrderStatus)} disabled={statusSubmitting}>
                  {statusUpdateSelectOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {statusValue === 'scheduled' ? (
                <div className="status-update-schedule">
                  <div className="status-update-schedule__heading">
                    <h3 className="status-update-schedule__title">Schedule details</h3>
                    <p className="status-update-schedule__intro">
                      Saved to <code>order_schedules</code> (collector, collection time, optional lab / report times) before
                      the order moves to <strong>scheduled</strong>.
                    </p>
                  </div>
                  <div className="field">
                    <label htmlFor="os-collector">Collecting person / team</label>
                    {collectorStaffOptions.length === 0 ? (
                      <>
                        <p className="status-update-hint status-update-hint--above-field">
                          No staff profiles yet — type who will collect (you can add staff under Staff).
                        </p>
                        <input
                          id="os-collector"
                          value={schCollectingPerson}
                          onChange={(e) => setSchCollectingPerson(e.target.value)}
                          disabled={statusSubmitting}
                          placeholder="e.g. Partner lab — driver"
                          autoComplete="off"
                        />
                      </>
                    ) : (
                      <>
                        <select
                          id="os-collector"
                          className="select-chevron-left"
                          value={schCollectorSelect}
                          onChange={(e) => {
                            const v = e.target.value
                            setSchCollectorSelect(v)
                            if (v !== COLLECTOR_OTHER_VALUE) setSchCollectingPerson('')
                          }}
                          disabled={statusSubmitting}
                          aria-describedby="os-collector-hint"
                        >
                          <option value="">Select team member…</option>
                          {collectorStaffOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({staffRoleShort(s.role)})
                            </option>
                          ))}
                          <option value={COLLECTOR_OTHER_VALUE}>Other name or team…</option>
                        </select>
                        <p id="os-collector-hint" className="status-update-hint">
                          Stored on the schedule as display text. Choose <strong>Other</strong> for drivers or partners not
                          in the staff list.
                        </p>
                        {schCollectorSelect === COLLECTOR_OTHER_VALUE ? (
                          <input
                            id="os-collector-custom"
                            type="text"
                            className="status-update-custom-collector"
                            value={schCollectingPerson}
                            onChange={(e) => setSchCollectingPerson(e.target.value)}
                            disabled={statusSubmitting}
                            placeholder="e.g. City courier — Aung"
                            autoComplete="off"
                            aria-label="Custom collecting person or team"
                          />
                        ) : null}
                      </>
                    )}
                  </div>
                  <div className="status-update-datetime-row">
                    <div className="field">
                      <label htmlFor="os-collect-at">Collection time</label>
                      <DatetimeLocalField
                        id="os-collect-at"
                        value={schCollectionTime}
                        onChange={setSchCollectionTime}
                        disabled={statusSubmitting}
                        allowClear={false}
                        schedule
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="os-running">Running / processing time (optional)</label>
                      <DatetimeLocalField
                        id="os-running"
                        value={schRunningTime}
                        onChange={setSchRunningTime}
                        disabled={statusSubmitting}
                        schedule
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="os-report">Report out time (optional)</label>
                    <DatetimeLocalField
                      id="os-report"
                      value={schReportOutTime}
                      onChange={setSchReportOutTime}
                      disabled={statusSubmitting}
                      schedule
                    />
                  </div>
                  <div className="auth-checkbox-row auth-checkbox-row--center status-update-accepted">
                    <input
                      id="os-accepted"
                      className="auth-checkbox"
                      type="checkbox"
                      checked={schAcceptedByUser}
                      onChange={() => setSchAcceptedByUser((v) => !v)}
                      disabled={statusSubmitting}
                    />
                    <label className="auth-checkbox-label" htmlFor="os-accepted">
                      Accepted by patient / requester
                    </label>
                  </div>
                </div>
              ) : null}
              {statusValue === 'scheduled' &&
              statusTarget &&
              !orderPrescriptionAttachmentUrl(statusTarget) &&
              !testsAssignedFlag(statusTarget.is_tests_assigned) ? (
                <p className="status-update-triage-hint">
                  This order has no prescription on file and no tests assigned yet. You can still schedule, but triage is incomplete.
                </p>
              ) : null}
              <div className="field">
                <label htmlFor="os-staff">Changed by staff</label>
                <select id="os-staff" className="select-chevron-left" value={statusStaffId} onChange={(e) => setStatusStaffId(e.target.value)} disabled={statusSubmitting}>
                  <option value="">Select staff</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="os-note">Note (optional)</label>
                <textarea id="os-note" value={statusNote} onChange={(e) => setStatusNote(e.target.value)} disabled={statusSubmitting} />
              </div>
              {statusError ? (
                <div className="form-alert form-alert--error" role="alert">
                  {statusError}
                </div>
              ) : null}
              <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStatusOpen(false)} disabled={statusSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={statusSubmitting}>
                  {statusSubmitting ? 'Saving…' : 'Update'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      ) : null}

      {detailLoading ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h2 className="modal-title">Order detail</h2>
            </div>
            <div className="card-body-loading">
              <LoadingSpinner label="Loading order detail" />
            </div>
          </div>
        </div>
      ) : null}

      {detailError ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && setDetailError(null)}>
          <div className="modal-card" style={{ maxWidth: 520 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Order detail</h2>
              <button type="button" className="btn btn-ghost modal-close" onClick={() => setDetailError(null)} aria-label="Close">×</button>
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
              <h2 className="modal-title">Order detail</h2>
              <button type="button" className="btn btn-ghost modal-close" onClick={() => setDetailOrder(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-card--order-detail__body">
              <div className="order-detail-summary">
                <section className="order-detail-summary__card" aria-labelledby="od-summary-people">
                  <h3 id="od-summary-people" className="order-detail-summary__title">
                    Order &amp; people
                  </h3>
                  <div className="order-detail-grid order-detail-grid--in-card">
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">Order ID</span>
                      <span className="order-detail-value order-detail-value--id">{detailOrder.id}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Ordering user</span>
                      {renderOrderingUser(detailOrder.user_id, detailOrder.ordering_user_name, userMap)}
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Patient</span>
                      <span className="order-detail-value">{detailOrder.patient_name}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Patient age</span>
                      <span className="order-detail-value">{detailOrder.patient_age ?? '—'}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Phone</span>
                      <span className="order-detail-value">{detailOrder.patient_phone}</span>
                    </div>
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">Address</span>
                      <span className="order-detail-value">{detailOrder.address}</span>
                    </div>
                    {detailOrder.description ? (
                      <div className="order-detail-item order-detail-item--span order-detail-item--notes">
                        <span className="order-detail-label">Notes</span>
                        <span className="order-detail-value order-detail-value--notes">{detailOrder.description}</span>
                      </div>
                    ) : null}
                  </div>
                </section>

                <section className="order-detail-summary__card" aria-labelledby="od-summary-care">
                  <h3 id="od-summary-care" className="order-detail-summary__title">
                    Status &amp; delivery
                  </h3>
                  <div className="order-detail-grid order-detail-grid--in-card">
                    <div className="order-detail-item">
                      <span className="order-detail-label">Status</span>
                      <span className={statusBadgeClass(detailOrder.status)}>{detailOrder.status}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Priority</span>
                      <span className="order-detail-value">{detailOrder.priority}</span>
                    </div>
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">Report delivery</span>
                      <span className="order-detail-value">{detailOrder.report_delivery_method ?? '—'}</span>
                    </div>
                  </div>
                </section>

                <section className="order-detail-summary__card" aria-labelledby="od-summary-money">
                  <h3 id="od-summary-money" className="order-detail-summary__title">
                    Pricing &amp; activity
                  </h3>
                  <div className="order-detail-grid order-detail-grid--in-card">
                    <div className="order-detail-item">
                      <span className="order-detail-label">Original</span>
                      <span className="order-detail-value">{detailOrder.original_price_mmk.toLocaleString()} MMK</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Discount</span>
                      <span className="order-detail-value">{detailOrder.discount_percent}%</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Final</span>
                      <span className="order-detail-value order-detail-value--emphasis">
                        {detailOrder.final_price_mmk.toLocaleString()} MMK
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Total paid</span>
                      <span className="order-detail-value">{(detailOrder.total_paid_mmk ?? 0).toLocaleString()} MMK</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Left to pay</span>
                      <span className="order-detail-value order-detail-value--emphasis">
                        {Math.max(
                          0,
                          detailOrder.balance_mmk ??
                            detailOrder.final_price_mmk - (detailOrder.total_paid_mmk ?? 0),
                        ).toLocaleString()}{' '}
                        MMK
                      </span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Payment</span>
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
                            {display.label}
                          </span>
                        )
                      })()}
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Created</span>
                      <span className="order-detail-value order-detail-value--muted">{fmtDateTime(detailOrder.created_at)}</span>
                    </div>
                    <div className="order-detail-item order-detail-item--span">
                      <span className="order-detail-label">Updated</span>
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
                  <h3 className="order-detail-section__title">Payments</h3>
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Amount (MMK)</th>
                          <th>Status</th>
                          <th>Method</th>
                          <th>Reference</th>
                          <th>Paid at</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrder.payments!.map((p) => (
                          <tr key={p.id}>
                            <td>{p.amount_mmk.toLocaleString()}</td>
                            <td>
                              <span className={paymentBadgeClass(p.status)}>{p.status}</span>
                            </td>
                            <td>{p.method ?? '—'}</td>
                            <td>{p.reference_no?.trim() || '—'}</td>
                            <td>{fmtDateTime(p.paid_at ?? undefined)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {detailOrder.schedule ? (
                <div className="order-detail-section">
                  <h3 className="order-detail-section__title">Schedule</h3>
                  <div className="order-detail-schedule-grid">
                    <div className="order-detail-item">
                      <span className="order-detail-label">Collecting person</span>
                      <span className="order-detail-value">{detailOrder.schedule.collecting_person ?? '—'}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Collection time</span>
                      <span className="order-detail-value">{fmtDateTime(detailOrder.schedule.collection_time ?? undefined)}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Running time</span>
                      <span className="order-detail-value">{fmtDateTime(detailOrder.schedule.running_time ?? undefined)}</span>
                    </div>
                    <div className="order-detail-item">
                      <span className="order-detail-label">Report out</span>
                      <span className="order-detail-value">{fmtDateTime(detailOrder.schedule.report_out_time ?? undefined)}</span>
                    </div>
                  </div>
                  <p className="order-detail-section__footer-note">
                    Accepted by user: {detailOrder.schedule.accepted_by_user ? 'Yes' : 'No'}
                  </p>
                </div>
              ) : (
                <div className="order-detail-section order-detail-section--muted">
                  <p className="order-detail-section__empty">
                    No schedule yet. It is created when you set status to <strong>scheduled</strong> (with collector and times).
                  </p>
                </div>
              )}

              <div className="order-detail-section order-detail-section--flush">
                <h3 className="order-detail-section__title">Line items (tests)</h3>
                {detailOrder.items.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--muted)' }}>No tests on this order yet.</p>
                ) : (
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Test</th>
                          <th>Qty</th>
                          <th>Unit (MMK)</th>
                          <th>Subtotal (MMK)</th>
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
                Update payment
              </button>
              <button type="button" className="btn btn-primary" onClick={() => setDetailOrder(null)}>
                Close
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
              <h2 id="assign-tests-title" className="modal-title">Add tests to order</h2>
              <button type="button" className="btn btn-ghost modal-close" onClick={() => !assignSubmitting && setAssignOpen(false)} aria-label="Close" disabled={assignSubmitting}>
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
                          Ordering:{' '}
                          {assignOrderDetail.ordering_user_name?.trim() ||
                            userMap.get(assignOrderDetail.user_id)?.name ||
                            assignOrderDetail.user_id}
                          <span className="assign-tests-order-summary__role">
                            {' '}
                            (
                            {resolveOrderingUserRole(assignOrderDetail, userMap) ??
                              userMap.get(assignOrderDetail.user_id)?.role ??
                              '—'}
                            )
                          </span>
                        </span>
                      ) : null}
                    </div>
                    {assignOrderDetail.description?.trim() ? (
                      <div className="assign-tests-clinical-card">
                        <div className="assign-tests-clinical-card__title">Clinical notes</div>
                        <div className="assign-tests-clinical-card__body">{assignOrderDetail.description.trim()}</div>
                      </div>
                    ) : (
                      <div className="assign-tests-clinical-card assign-tests-clinical-card--muted">
                        <div className="assign-tests-clinical-card__title">Clinical notes</div>
                        <div className="assign-tests-clinical-card__body assign-tests-clinical-card__body--placeholder">
                          None provided for this order.
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="assign-tests-left-body">
                    <div className="assign-tests-catalog-block">
                      <p className="assign-tests-dialog__hint">
                        Choose tests from the catalog (multi-select). Open <strong>Test</strong> and use the search box
                        there. Discounts follow the ordering user&apos;s role (
                        {assignOrderDetail.user_id
                          ? resolveOrderingUserRole(assignOrderDetail, userMap) ??
                            userMap.get(assignOrderDetail.user_id)?.role ??
                            '—'
                          : '—'}
                        ). Up to{' '}
                        {ORDER_TEST_PICKER_LIMIT} matches per search.
                      </p>
                      {tests.length > ORDER_TEST_PICKER_LIMIT && !assignTestSearch.trim() ? (
                        <p className="assign-tests-banner assign-tests-banner--warn">
                          Large catalog: open <strong>Test</strong> and search — the list shows at most{' '}
                          {ORDER_TEST_PICKER_LIMIT} matches at a time.
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
                        <span className="assign-tests-queue-section__title">Tests queued for save</span>
                        {assignSelectedIds.length > 0 ? (
                          <span className="assign-tests-queue-section__count">{assignSelectedIds.length}</span>
                        ) : null}
                      </div>
                      {assignSelectedIds.length > 0 ? (
                        <div className="table-wrap assign-tests-queue-table">
                          <table className="data-table">
                            <thead>
                              <tr>
                                <th>Test</th>
                                <th>Discount</th>
                                <th>Final (MMK)</th>
                                <th className="action-col"> </th>
                              </tr>
                            </thead>
                            <tbody>
                              {assignSelectedIds.map((id) => {
                                const t = testMap.get(id)
                                if (!t) return null
                                const pct = activeDiscountPercentForOrder(
                                  testDiscounts,
                                  id,
                                  resolveOrderingUserRole(assignOrderDetail, userMap),
                                )
                                const unit = Math.round(t.base_price_mmk * 100) / 100
                                const sub =
                                  Math.round(unit * (1 - Math.max(0, Math.min(100, pct)) / 100) * 100) / 100
                                return (
                                  <tr key={id}>
                                    <td>
                                      {t.test_name} <span style={{ color: 'var(--muted)' }}>({t.test_code})</span>
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
                                        Delete
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
                          <p className="assign-tests-queue-empty__lead">No tests selected yet</p>
                          <p className="assign-tests-queue-empty__hint">
                            Use <strong>Test</strong> → search, then tick tests to queue. Selected tests and discounted
                            totals appear here before you save.
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

                <div className="assign-tests-body-split__preview" aria-label="Prescription preview">
                  {(() => {
                    const rxUrl = orderPrescriptionAttachmentUrl(assignOrderDetail)
                    return rxUrl ? (
                      <PrescriptionPanelEmbed url={rxUrl} />
                    ) : (
                      <div className="assign-tests-prescription-panel assign-tests-prescription-panel--empty-side">
                        <p>No prescription file on this order.</p>
                      </div>
                    )
                  })()}
                </div>
              </div>

              <div className="modal-card--assign-tests__footer row-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setAssignOpen(false)} disabled={assignSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={assignSubmitting || tests.length === 0 || assignSelectedIds.length === 0}>
                  {assignSubmitting ? 'Saving…' : 'Save to order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete order?"
        message={
          deleteTarget
            ? `Delete order "${deleteTarget.id}" for ${deleteTarget.patient_name}?`
            : ''
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />

    </div>
  )
}
