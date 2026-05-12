import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ConfirmDialog } from '../components/common/ConfirmDialog'
import { PageHeader } from '../components/common/PageHeader'
import { TableActionMenu } from '../components/common/TableActionMenu'
import { OrderQrModal } from '../components/orders/OrderQrModal'
import { formatCoordPair, LocationMapPicker } from '../components/users/LocationMapPicker'
import type { EndUserRole, LabTestCatalogRow, StaffListRow, UserListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import { fetchAllDiscounts, type TestDiscountListRow } from '../services/discountService'
import { fetchLabTestsList } from '../services/labTestCatalogService'
import {
  createOrder,
  deleteOrder,
  fetchOrderById,
  fetchOrders,
  type ApiOrderDetail,
  type ApiOrderListRow,
  type ApiOrderStatus,
  updateOrderStatus,
} from '../services/orderService'
import { fetchStaffList } from '../services/staffService'
import { nominatimSearch } from '../services/nominatimGeocode'
import { fetchUserList } from '../services/userService'
import '../components/common/ui.css'

const ADDRESS_GEOCODE_DEBOUNCE_MS = 900
const ADDRESS_GEOCODE_MIN_LEN = 4

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

function fmtDateTime(raw: string | undefined): string {
  if (!raw) return '—'
  const d = new Date(raw)
  if (!Number.isFinite(d.getTime())) return raw
  return d.toLocaleString()
}

function coordsForOrderApi(lat: number | '', lng: number | ''): { latitude: number | null; longitude: number | null } {
  const la = typeof lat === 'number' ? lat : Number.parseFloat(String(lat))
  const ln = typeof lng === 'number' ? lng : Number.parseFloat(String(lng))
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return { latitude: null, longitude: null }
  if (la === 0 && ln === 0) return { latitude: null, longitude: null }
  return { latitude: la, longitude: ln }
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

export function OrderManagementPage() {
  const hasApi = isApiMode()
  const [rows, setRows] = useState<ApiOrderListRow[]>([])
  const [users, setUsers] = useState<UserListRow[]>([])
  const [staff, setStaff] = useState<StaffListRow[]>([])
  const [tests, setTests] = useState<LabTestCatalogRow[]>([])
  const [testDiscounts, setTestDiscounts] = useState<TestDiscountListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [detailOrder, setDetailOrder] = useState<ApiOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [qrOrder, setQrOrder] = useState<ApiOrderListRow | null>(null)
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
  const [createTestId, setCreateTestId] = useState('')
  const [createQuantity, setCreateQuantity] = useState<number>(1)
  const [createOriginalPrice, setCreateOriginalPrice] = useState<number | ''>('')
  const [createLatitude, setCreateLatitude] = useState<number | ''>(0)
  const [createLongitude, setCreateLongitude] = useState<number | ''>(0)
  const [createGeocodeHint, setCreateGeocodeHint] = useState<string | null>(null)

  const [statusOpen, setStatusOpen] = useState(false)
  const [statusTarget, setStatusTarget] = useState<ApiOrderListRow | null>(null)
  const [statusValue, setStatusValue] = useState<ApiOrderStatus>('pending')
  const [statusStaffId, setStatusStaffId] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [statusSubmitting, setStatusSubmitting] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

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
          fetchOrders(),
          fetchUserList(),
          fetchStaffList(),
          fetchLabTestsList(),
          fetchAllDiscounts(),
        ])
        if (cancelled) return
        setRows(ordersRes)
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
  }, [hasApi, refreshTick])

  useEffect(() => {
    if (!createOpen) return

    const trimmed = createAddress.trim()
    if (trimmed.length < ADDRESS_GEOCODE_MIN_LEN) {
      setCreateGeocodeHint(null)
      return
    }

    let alive = true
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setCreateGeocodeHint('Looking up address…')
      void (async () => {
        try {
          const hit = await nominatimSearch(trimmed, ac.signal)
          if (!alive || ac.signal.aborted) return
          if (hit) {
            setCreateLatitude(hit.lat)
            setCreateLongitude(hit.lng)
            setCreateGeocodeHint(null)
          } else {
            setCreateGeocodeHint('No match for that address. Try a fuller line or set the pin on the map.')
          }
        } catch {
          if (!alive || ac.signal.aborted) return
          setCreateGeocodeHint('Could not look up address. Set the pin on the map or try again.')
        }
      })()
    }, ADDRESS_GEOCODE_DEBOUNCE_MS)

    return () => {
      alive = false
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [createOpen, createAddress])

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users])
  const testMap = useMemo(() => new Map(tests.map((t) => [t.id, t])), [tests])

  const createOrderUser = useMemo(
    () => (createUserId ? userMap.get(createUserId) : undefined),
    [createUserId, userMap],
  )
  const resolvedCreateDiscountPercent = useMemo(
    () => activeDiscountPercentForOrder(testDiscounts, createTestId, createOrderUser?.role),
    [testDiscounts, createTestId, createOrderUser?.role],
  )

  const sorted = useMemo(
    () => [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    [rows],
  )

  function bumpOrderViews() {
    setRefreshTick((t) => t + 1)
  }

  const createFinalPrice = useMemo(() => {
    const original = typeof createOriginalPrice === 'number' ? createOriginalPrice : Number(createOriginalPrice)
    if (!Number.isFinite(original) || original < 0) return 0
    const safeDiscount = Math.max(0, Math.min(100, resolvedCreateDiscountPercent))
    return Math.round(original * (1 - safeDiscount / 100) * 100) / 100
  }, [createOriginalPrice, resolvedCreateDiscountPercent])

  const qrTestLabel = useMemo(() => {
    if (!qrOrder) return ''
    const detail = detailOrder && detailOrder.id === qrOrder.id ? detailOrder : null
    if (detail && detail.items.length > 0) {
      const first = detail.items[0]
      const t = first.test_id ? testMap.get(first.test_id) : undefined
      if (t) return t.test_name
    }
    return 'Lab test'
  }, [qrOrder, detailOrder, testMap])

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
    setCreateTestId(firstTest?.id ?? '')
    setCreateQuantity(1)
    setCreateOriginalPrice(firstTest?.base_price_mmk ?? '')
    setCreateLatitude(firstUser ? firstUser.latitude : 0)
    setCreateLongitude(firstUser ? firstUser.longitude : 0)
    setCreateGeocodeHint(null)
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

  function onCreateTestChange(testId: string) {
    setCreateTestId(testId)
    const t = testMap.get(testId)
    if (!t) return
    setCreateOriginalPrice(t.base_price_mmk)
  }

  async function submitCreateOrder(e: FormEvent) {
    e.preventDefault()
    setCreateError(null)
    if (!createUserId) return setCreateError('Select a user.')
    if (!createTestId) return setCreateError('Select a test.')
    if (!createPatientName.trim()) return setCreateError('Enter patient name.')
    if (!createPatientPhone.trim()) return setCreateError('Enter patient phone.')
    if (!createAddress.trim()) return setCreateError('Enter address.')
    const age = typeof createPatientAge === 'number' ? createPatientAge : Number.parseInt(String(createPatientAge), 10)
    if (!Number.isFinite(age) || age < 0) return setCreateError('Enter valid patient age.')
    const qty = Number.isFinite(createQuantity) ? Math.max(1, Math.floor(createQuantity)) : 1
    const original =
      typeof createOriginalPrice === 'number' ? createOriginalPrice : Number.parseFloat(String(createOriginalPrice))
    if (!Number.isFinite(original) || original < 0) return setCreateError('Enter valid original price.')
    const safeDiscount = Math.max(0, Math.min(100, resolvedCreateDiscountPercent))
    const unit = Math.round(original * 100) / 100
    const subtotal = Math.round(unit * qty * 100) / 100
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
        original_price_mmk: unit,
        discount_percent: safeDiscount,
        final_price_mmk: createFinalPrice,
        items: [{ test_id: createTestId, quantity: qty, unit_price_mmk: unit, subtotal_mmk: subtotal }],
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
      }
    } catch (e) {
      setDetailError(e instanceof Error ? e.message : 'Failed to load detail')
    } finally {
      setDetailLoading(false)
    }
  }

  function openStatusUpdate(row: ApiOrderListRow) {
    setStatusTarget(row)
    setStatusValue(row.status)
    setStatusStaffId(staff[0]?.id ?? '')
    setStatusNote('')
    setStatusError(null)
    setStatusOpen(true)
  }

  async function submitStatusUpdate(e: FormEvent) {
    e.preventDefault()
    if (!statusTarget) return
    setStatusError(null)
    if (!statusStaffId) return setStatusError('Select staff.')
    setStatusSubmitting(true)
    try {
      await updateOrderStatus(statusTarget.id, {
        status: statusValue,
        staff_id: statusStaffId,
        note: statusNote.trim() || null,
      })
      setStatusOpen(false)
      bumpOrderViews()
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
      bumpOrderViews()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="stack">
      <PageHeader title="Order management" />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> in <code>apps/lab_admin_web</code> (e.g. <code>http://localhost:3000</code>) and restart the dev server.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="card" style={{ borderColor: '#f0c4c4', background: '#fff8f8' }}>
          <p style={{ margin: 0, color: '#ba1a1a', fontSize: '0.9rem' }}>{loadError}</p>
        </div>
      ) : null}

      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn btn-primary"
          onClick={openCreateOrder}
          disabled={!hasApi || loading}
        >
          Create order
        </button>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Patient</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Original (MMK)</th>
              <th>Final (MMK)</th>
              <th>Created</th>
              <th className="action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="data-table__state">
                  Loading…
                </td>
              </tr>
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="data-table__state">
                  No orders yet.
                </td>
              </tr>
            ) : (
              sorted.map((o) => (
                <tr key={o.id}>
                  <td>
                    <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{o.id}</code>
                  </td>
                  <td>{o.patient_name}</td>
                  <td>
                    <span className={priorityBadgeClass(o.priority)}>{o.priority}</span>
                  </td>
                  <td>
                    <span className={statusBadgeClass(o.status)}>{o.status}</span>
                  </td>
                  <td>{o.original_price_mmk.toLocaleString()}</td>
                  <td>{o.final_price_mmk.toLocaleString()}</td>
                  <td>{fmtDateTime(o.created_at)}</td>
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
                          label: 'Update status',
                          onSelect: () => openStatusUpdate(o),
                        },
                        {
                          label: 'QR',
                          onSelect: () => setQrOrder(o),
                        },
                        {
                          label: 'Delete',
                          onSelect: () => setDeleteTarget(o),
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
              <div className="grid-2">
                <div className="field">
                  <label htmlFor="om-user">User</label>
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
                </div>
                <div className="field">
                  <label htmlFor="om-test">Test</label>
                  <select id="om-test" className="select-chevron-left" value={createTestId} onChange={(e) => onCreateTestChange(e.target.value)} disabled={createSubmitting}>
                    {tests.length === 0 ? (
                      <option value="">No tests available</option>
                    ) : (
                      tests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.test_name} ({t.test_code})
                        </option>
                      ))
                    )}
                  </select>
                </div>
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
                <p className="user-form-modal__section-label">Map</p>
                <p className="user-form-modal__map-hint">
                  Typing the address geocodes the pin (debounced). Clicking the map or using your location updates
                  the address from the pin (reverse geocoding).
                </p>
                <LocationMapPicker
                  latitude={createLatitude}
                  longitude={createLongitude}
                  mapHeight={220}
                  onPick={(lat, lng) => {
                    setCreateLatitude(lat)
                    setCreateLongitude(lng)
                  }}
                  onAddressFromMap={(addr) => {
                    setCreateAddress(addr)
                    setCreateGeocodeHint(null)
                  }}
                />
                <p className="user-form-modal__coords" aria-live="polite">
                  {formatCoordPair(createLatitude, createLongitude)}
                  {createLatitude === 0 && createLongitude === 0 ? (
                    <span className="user-form-modal__coords-hint"> — optional (left unset if you do not pick)</span>
                  ) : null}
                </p>
                {createGeocodeHint ? <p className="user-form-modal__geocode-hint">{createGeocodeHint}</p> : null}
              </div>
              <div className="field">
                <label htmlFor="om-desc">Description</label>
                <textarea id="om-desc" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} disabled={createSubmitting} />
              </div>
              <div className="order-create-modal__grid-three">
                <div className="field">
                  <label htmlFor="om-qty">Quantity</label>
                  <input id="om-qty" type="number" min={1} step={1} value={createQuantity} onChange={(e) => setCreateQuantity(Math.max(1, Number(e.target.value) || 1))} disabled={createSubmitting} />
                </div>
                <div className="field">
                  <label htmlFor="om-org">Original price</label>
                  <input id="om-org" type="number" min={0} step={100} value={createOriginalPrice === '' ? '' : createOriginalPrice} onChange={(e) => setCreateOriginalPrice(e.target.value === '' ? '' : Number(e.target.value))} disabled={createSubmitting} />
                </div>
                <div className="field">
                  <label htmlFor="om-disc">Discount %</label>
                  <input
                    id="om-disc"
                    type="number"
                    readOnly
                    disabled
                    value={resolvedCreateDiscountPercent}
                    title="Discount comes from test-specific pricing for the selected user’s role (Discounts admin)."
                    className="lab-test-modal__input-computed"
                  />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--muted)' }}>
                    From catalog discount for <strong>{createOrderUser?.role ?? '…'}</strong> on this test. Configure
                    under Discounts.
                  </p>
                </div>
              </div>
              <div className="field">
                <label>Final price (auto)</label>
                <input readOnly disabled value={createFinalPrice.toLocaleString()} className="lab-test-modal__input-computed" />
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
                  disabled={createSubmitting || users.length === 0 || tests.length === 0}
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

      {statusOpen && statusTarget ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => e.target === e.currentTarget && !statusSubmitting && setStatusOpen(false)}>
          <div className="modal-card" style={{ maxWidth: 460 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Update status</h2>
              <button type="button" className="btn btn-ghost modal-close" onClick={() => !statusSubmitting && setStatusOpen(false)} aria-label="Close" disabled={statusSubmitting}>×</button>
            </div>
            <form className="form-grid" onSubmit={(e) => void submitStatusUpdate(e)} style={{ maxWidth: 'none' }}>
              <div className="field">
                <label htmlFor="os-status">Status</label>
                <select id="os-status" className="select-chevron-left" value={statusValue} onChange={(e) => setStatusValue(e.target.value as ApiOrderStatus)} disabled={statusSubmitting}>
                  {ORDER_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
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
      ) : null}

      {detailLoading ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card" style={{ maxWidth: 560 }}>
            <div className="modal-head">
              <h2 className="modal-title">Order detail</h2>
            </div>
            <div style={{ padding: '1.25rem' }}>Loading…</div>
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
          <div className="modal-card" style={{ maxWidth: 720 }} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Order detail</h2>
              <button type="button" className="btn btn-ghost modal-close" onClick={() => setDetailOrder(null)} aria-label="Close">×</button>
            </div>
            <div style={{ padding: '1.1rem 1.25rem' }}>
              <div className="order-detail-grid">
                <div className="order-detail-item"><span className="order-detail-label">Order ID</span><span>{detailOrder.id}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Patient</span><span>{detailOrder.patient_name}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Phone</span><span>{detailOrder.patient_phone}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Priority</span><span>{detailOrder.priority}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Status</span><span className={statusBadgeClass(detailOrder.status)}>{detailOrder.status}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Address</span><span>{detailOrder.address}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Original</span><span>{detailOrder.original_price_mmk.toLocaleString()} MMK</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Discount</span><span>{detailOrder.discount_percent}%</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Final</span><span>{detailOrder.final_price_mmk.toLocaleString()} MMK</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Created</span><span>{fmtDateTime(detailOrder.created_at)}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Updated</span><span>{fmtDateTime(detailOrder.updated_at)}</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Total paid</span><span>{(detailOrder.total_paid_mmk ?? 0).toLocaleString()} MMK</span></div>
                <div className="order-detail-item"><span className="order-detail-label">Balance</span><span>{(detailOrder.balance_mmk ?? detailOrder.final_price_mmk).toLocaleString()} MMK</span></div>
              </div>
              <div style={{ marginTop: '0.85rem' }}>
                <p className="user-form-modal__section-label" style={{ marginBottom: '0.4rem' }}>Items</p>
                {detailOrder.items.length === 0 ? (
                  <p style={{ margin: 0, color: 'var(--muted)' }}>No items.</p>
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
                          return (
                            <tr key={`${it.test_id}-${idx}`}>
                              <td>{t ? `${t.test_name} (${t.test_code})` : it.test_id}</td>
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
              <div className="row-actions" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setQrOrder(rows.find((r) => r.id === detailOrder.id) ?? null)}>
                  QR
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setDetailOrder(null)}>
                  Close
                </button>
              </div>
            </div>
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

      {qrOrder ? (
        <OrderQrModal
          orderId={qrOrder.id}
          patientName={qrOrder.patient_name}
          testType={qrTestLabel}
          onClose={() => setQrOrder(null)}
        />
      ) : null}
    </div>
  )
}
