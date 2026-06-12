import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { TimeField } from '../components/common/TimeField'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { formatCoordPair } from '../components/users/LocationMapPicker'
import type { StaffListRow } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  fetchOrders,
  updateOrderStatus,
  type ApiOrderDetailItem,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import { fetchStaffList } from '../services/staffService'
import { upsertSchedule } from '../services/scheduleService'
import {
  planCollectionRouteWithAi,
  type CollectionRouteResult,
  type CollectionRouteStopDetail,
} from '../services/aiConversationService'
import { fetchSystemSettings } from '../services/systemSettingService'
import { suggestCollectionRoute } from '../services/aiDemo'
import { friendlyAiReviewErrorMessage } from '../hooks/usePageNotify'
import { collectorRoleStaffList } from '../utils/collectorStaff'
import '../components/common/ui.css'

const ROUTING_STATUSES: ApiOrderStatus[] = ['pending', 'scheduled', 'collecting']

function fmtWhen(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString()
}

function formatRouteStartTime(date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function labStartLocation(settings: Awaited<ReturnType<typeof fetchSystemSettings>>): { lat: number; lng: number } | null {
  const lat = settings.latitude
  const lng = settings.longitude
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}


function parseRouteCollectionDuration(value: number | ''): number | null {
  const minutes = typeof value === 'number' ? value : Number.parseInt(String(value), 10)
  if (!Number.isFinite(minutes) || minutes <= 0) return null
  return minutes
}

function parseRouteStartTimeInput(value: string): string | null {
  const trimmed = value.trim()
  if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null
  const [h, m] = trimmed.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/** Combine today's date with a route clock time (HH:MM) for schedule storage. */
function clockTimeOnTodayToIso(clock: string): string | null {
  const normalized = parseRouteStartTimeInput(clock)
  if (!normalized) return null
  const [h, m] = normalized.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  if (!Number.isFinite(d.getTime())) return null
  return d.toISOString()
}

function stopCollectionIso(
  orderId: string,
  stopIndex: number,
  routeResult: CollectionRouteResult | null,
  baseIso: string,
  minutesPerStop: number,
): string {
  const stopDetail = routeResult ? routeStopDetailForOrder(routeResult.routeStops, orderId) : undefined
  const clock = stopDetail?.collectionStart ?? stopDetail?.arrivalTime
  if (clock) {
    const iso = clockTimeOnTodayToIso(clock)
    if (iso) return iso
  }
  const baseMs = new Date(baseIso).getTime()
  return new Date(baseMs + stopIndex * minutesPerStop * 60_000).toISOString()
}

const ORDER_STATUS_OPTIONS: { value: ApiOrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
]

function orderCoords(order: ApiOrderListRow): { lat: number; lng: number } | null {
  const lat = Number(order.latitude)
  const lng = Number(order.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat === 0 && lng === 0) return null
  return { lat, lng }
}

function orderStopsInRouteOrder(
  picked: ApiOrderListRow[],
  orderedStops: string[],
): ApiOrderListRow[] {
  const byId = new Map(picked.map((o) => [o.id.toLowerCase(), o]))
  const ordered: ApiOrderListRow[] = []
  for (const line of orderedStops) {
    const id = line.split(':')[0]?.trim()
    const o = id ? byId.get(id.toLowerCase()) : undefined
    if (o && !ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  for (const o of picked) {
    if (!ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  return ordered
}

function orderStopsFromRouteDetails(
  picked: ApiOrderListRow[],
  routeStops: CollectionRouteStopDetail[],
): ApiOrderListRow[] {
  if (routeStops.length === 0) return picked
  const byId = new Map(picked.map((o) => [o.id.toLowerCase(), o]))
  const ordered: ApiOrderListRow[] = []
  for (const stop of [...routeStops].sort((a, b) => a.sequence - b.sequence)) {
    const order = byId.get(stop.orderId.toLowerCase())
    if (order && !ordered.some((x) => x.id === order.id)) ordered.push(order)
  }
  for (const o of picked) {
    if (!ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  return ordered
}

function routeStopDetailForOrder(
  routeStops: CollectionRouteStopDetail[],
  orderId: string,
): CollectionRouteStopDetail | undefined {
  return routeStops.find((stop) => stop.orderId.toLowerCase() === orderId.toLowerCase())
}

export function SampleCollectionPage() {
  const hasApi = isApiMode()
  const { account } = useAuth()
  const { showError, showSuccess } = useToast()
  const [orders, setOrders] = useState<ApiOrderListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)

  useErrorToast(loadError)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [routeResult, setRouteResult] = useState<CollectionRouteResult | null>(null)
  const [routePlanOrders, setRoutePlanOrders] = useState<ApiOrderListRow[]>([])
  const [routePlanning, setRoutePlanning] = useState(false)
  const [labRouteStart, setLabRouteStart] = useState<{
    lat: number
    lng: number
    address: string | null
  } | null>(null)
  const [routeStartTime, setRouteStartTime] = useState(() => formatRouteStartTime())
  const [routeCollectionDurationMinutes, setRouteCollectionDurationMinutes] = useState<number | ''>(10)
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus>('pending')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const [staff, setStaff] = useState<StaffListRow[]>([])
  const [collectionSubmitting, setCollectionSubmitting] = useState(false)

  const [routeAssignOpen, setRouteAssignOpen] = useState(false)
  const [routeCollectorId, setRouteCollectorId] = useState('')
  const [routeAssignSubmitting, setRouteAssignSubmitting] = useState(false)
  const [routeAssignError, setRouteAssignError] = useState<string | null>(null)
  const [routeAssignments, setRouteAssignments] = useState<
    Record<string, { collectorName: string; collectionTime: string }>
  >({})

  const isScheduleMode = statusFilter === 'scheduled'
  const routeCollectorOptions = useMemo(() => collectorRoleStaffList(staff), [staff])

  useEffect(() => {
    const id = window.setTimeout(() => setPatientName(patientInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [patientInput])

  const orderFetchParams = useMemo((): FetchOrdersParams => {
    const p: FetchOrdersParams = { status: statusFilter }
    if (patientName) p.patient_name = patientName
    return p
  }, [patientName, statusFilter])

  const ordersListQuery = useMemo(
    (): FetchOrdersParams => ({
      ...orderFetchParams,
      page: ordersPage,
      limit: ordersPageSize,
    }),
    [orderFetchParams, ordersPage, ordersPageSize],
  )

  useEffect(() => {
    queueMicrotask(() => setOrdersPage(1))
  }, [patientName, statusFilter])

  useEffect(() => {
    if (!hasApi) {
      setOrders([])
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    void (async () => {
      try {
        const [list, staffRes] = await Promise.all([fetchOrders(ordersListQuery), fetchStaffList()])
        if (!cancelled) {
          setOrders(list)
          setStaff(staffRes.filter((s) => !s.is_deleted))
          if (list.length === 0 && ordersPage > 1) {
            setOrdersPage((p) => Math.max(1, p - 1))
          }
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load orders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, ordersListQuery, refreshTick])

  useEffect(() => {
    if (!hasApi || isScheduleMode) return
    let cancelled = false
    void (async () => {
      try {
        const settings = await fetchSystemSettings()
        if (cancelled) return
        const loc = labStartLocation(settings)
        setLabRouteStart(
          loc
            ? {
                lat: loc.lat,
                lng: loc.lng,
                address: settings.address?.trim() || null,
              }
            : null,
        )
      } catch {
        /* optional prefill only */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, isScheduleMode])

  useEffect(() => {
    setSelectedIds(new Set())
    setRouteResult(null)
    setRoutePlanOrders([])
  }, [ordersListQuery])

  const routable = useMemo(
    () => orders.filter((o) => ROUTING_STATUSES.includes(o.status)),
    [orders],
  )

  const selectedRoutableCount = useMemo(
    () => routable.filter((o) => selectedIds.has(o.id)).length,
    [routable, selectedIds],
  )

  const routeSetupReady = useMemo(() => {
    if (labRouteStart == null) return false
    if (parseRouteStartTimeInput(routeStartTime) == null) return false
    if (parseRouteCollectionDuration(routeCollectionDurationMinutes) == null) return false
    return true
  }, [labRouteStart, routeStartTime, routeCollectionDurationMinutes])

  const canPlanRoute =
    hasApi && !loading && !routePlanning && selectedRoutableCount >= 2 && routeSetupReady

  const canStartCollection = hasApi && !loading && !collectionSubmitting && selectedRoutableCount >= 1

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runAiRoute = async () => {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length < 2) {
      showError('Select at least two orders to build a multi-stop collection route.')
      return
    }

    if (!hasApi) {
      const addresses = picked.map(
        (o) => `${o.id}: ${o.patient_name} — ${o.address?.trim() || '—'}`,
      )
      const result = suggestCollectionRoute(addresses)
      setRouteResult({
        orderedStops: result.orderedStops,
        summary: result.summary,
        estimatedFinishTime: null,
        estimatedMinutes: result.estimatedMinutes,
        routeStops: [],
      })
      setRoutePlanOrders(orderStopsInRouteOrder(picked, result.orderedStops))
      setRouteAssignments({})
      showSuccess('Collection route generated.')
      return
    }

    const missingCoords = picked.filter((o) => !orderCoords(o))
    if (missingCoords.length > 0) {
      showError(
        `${missingCoords.length} selected order(s) are missing map coordinates. Add latitude/longitude on the order before planning a route.`,
      )
      return
    }

    if (!labRouteStart) {
      showError('Configure the lab location in System settings before planning a route.')
      return
    }

    const startTime = parseRouteStartTimeInput(routeStartTime)
    if (!startTime) {
      showError('Enter a valid route start time.')
      return
    }

    const collectionDurationMinutes = parseRouteCollectionDuration(routeCollectionDurationMinutes)
    if (collectionDurationMinutes == null) {
      showError('Enter collection duration per stop (minutes).')
      return
    }

    setRoutePlanning(true)
    try {
      const result = await planCollectionRouteWithAi({
        startLocation: { lat: labRouteStart.lat, lng: labRouteStart.lng },
        startTime,
        collectionDurationMinutes,
        stops: picked.map((o) => {
          const coords = orderCoords(o)!
          return {
            orderId: o.id,
            patientName: o.patient_name,
            address: o.address?.trim() || '—',
            lat: coords.lat,
            lng: coords.lng,
          }
        }),
      })
      setRouteResult(result)
      setRoutePlanOrders(orderStopsFromRouteDetails(picked, result.routeStops))
      setRouteAssignments({})
      showSuccess('Collection route generated.')
    } catch (err) {
      showError(friendlyAiReviewErrorMessage(err, 'Route planning failed.'))
    } finally {
      setRoutePlanning(false)
    }
  }

  function openRouteAssign() {
    if (routePlanOrders.length === 0) return
    setRouteAssignError(null)
    setRouteCollectorId(routeCollectorOptions[0]?.id ?? '')
    setRouteAssignOpen(true)
  }

  async function submitRouteAssign(e: FormEvent) {
    e.preventDefault()
    if (routePlanOrders.length === 0) return
    setRouteAssignError(null)

    const collector = routeCollectorOptions.find((s) => s.id === routeCollectorId)
    if (!collector) {
      setRouteAssignError('Select a collector staff member.')
      return
    }

    const startClock = parseRouteStartTimeInput(routeStartTime)
    if (!startClock) {
      setRouteAssignError('Set a valid start time in Route setup before assigning a collector.')
      return
    }
    const baseIso = clockTimeOnTodayToIso(startClock)
    if (!baseIso) {
      setRouteAssignError('Route start time from Route setup is invalid.')
      return
    }

    const actingStaffId = account?.id ?? collector.id
    const minutesPerStop =
      routeResult?.estimatedMinutes != null && routePlanOrders.length > 1
        ? Math.max(8, Math.round(routeResult.estimatedMinutes / routePlanOrders.length))
        : parseRouteCollectionDuration(routeCollectionDurationMinutes) ?? 10

    setRouteAssignSubmitting(true)
    const nextAssignments: Record<string, { collectorName: string; collectionTime: string }> = {}
    try {
      for (let i = 0; i < routePlanOrders.length; i++) {
        const order = routePlanOrders[i]
        const stopIso = stopCollectionIso(order.id, i, routeResult, baseIso, minutesPerStop)
        await upsertSchedule({
          order_id: order.id,
          collecting_person: collector.name.trim(),
          collection_time: stopIso,
          running_time: null,
          report_out_time: null,
          accepted_by_user: false,
        })
        if (order.status === 'pending') {
          await updateOrderStatus(order.id, {
            status: 'scheduled',
            staff_id: actingStaffId,
            note: `Route stop ${i + 1} — assigned to ${collector.name.trim()}`,
          })
        }
        nextAssignments[order.id] = {
          collectorName: collector.name.trim(),
          collectionTime: stopIso,
        }
      }
      setRouteAssignments(nextAssignments)
      setRouteAssignOpen(false)
      setRefreshTick((t) => t + 1)
      showSuccess(`Assigned ${collector.name.trim()} to ${routePlanOrders.length} route stop(s).`)
    } catch (err) {
      setRouteAssignError(err instanceof Error ? err.message : 'Route assignment failed')
    } finally {
      setRouteAssignSubmitting(false)
    }
  }

  async function startCollectionForSelected() {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length === 0) {
      showError('Select at least one order to start collection.')
      return
    }
    const staffId = account?.id
    if (!staffId) {
      showError('Sign in with a staff account to update order status.')
      return
    }

    setCollectionSubmitting(true)
    try {
      for (const order of picked) {
        await updateOrderStatus(order.id, {
          status: 'collecting',
          staff_id: staffId,
          note: 'Sample collection started',
        })
      }
      setSelectedIds(new Set())
      setRefreshTick((t) => t + 1)
      showSuccess(
        picked.length === 1
          ? 'Order status updated to collecting.'
          : `${picked.length} orders updated to collecting.`,
      )
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Status update failed')
    } finally {
      setCollectionSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Collection & routing"
        description={
          isScheduleMode
            ? 'Review scheduled pickups and mark orders as collecting when sample collection begins.'
            : 'Choose orders that need a sample pickup, then plan an efficient multi-stop collection route.'
        }
      />

      {!hasApi ? (
        <div className="card card--muted">
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load orders from the backend.
          </p>
        </div>
      ) : null}

      <div className="list-tools-row">
        <div className="list-filters-bar" aria-label="Filter orders for collection">
          <ListFilterSearchField
            id="collection-patient"
            label="Patient"
            value={patientInput}
            onChange={(e) => setPatientInput(e.target.value)}
            disabled={!hasApi || loading}
          />
          <div className="list-filters-bar__group">
            <label className="list-filters-bar__label" htmlFor="collection-status">
              Status
            </label>
            <select
              id="collection-status"
              className="list-filters-bar__select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ApiOrderStatus)}
              disabled={!hasApi || loading}
            >
              {ORDER_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
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
              setStatusFilter('pending')
              setOrdersPage(1)
            }}
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
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">
          {isScheduleMode ? 'Scheduled collections' : 'Orders ready for pickup routing'}
        </h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          {isScheduleMode
            ? 'Select one or more scheduled orders, then mark them as collecting when pickup starts.'
            : 'Select at least two orders below, then set route start details and plan an optimized multi-stop route with AI.'}
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Order</th>
                <th>Patient</th>
                <th>Address</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="data-table__state data-table__state--loading">
                    <LoadingSpinner label="Loading samples" />
                  </td>
                </tr>
              ) : routable.length === 0 ? (
                <tr>
                  <td colSpan={6} className="data-table__state">
                    {orders.length === 0
                      ? patientName || statusFilter
                        ? 'No orders match these filters.'
                        : 'No orders returned from the server.'
                      : isScheduleMode
                        ? 'No scheduled orders in this list.'
                        : 'No orders in pending / scheduled / collecting in this list.'}
                  </td>
                </tr>
              ) : (
                routable.map((o) => (
                  <tr key={o.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(o.id)}
                        onChange={() => toggle(o.id)}
                        aria-label={`Select ${o.patient_name}`}
                      />
                    </td>
                    <td>
                      <code style={{ fontSize: '0.72rem', wordBreak: 'break-all' }}>{o.id}</code>
                    </td>
                    <td>{o.patient_name}</td>
                    <td>{o.address?.trim() || '—'}</td>
                    <td>{o.status}</td>
                    <td>{fmtWhen(o.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && hasApi ? (
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
        {!isScheduleMode && hasApi && !loading ? (
          selectedRoutableCount >= 2 ? (
            <div className="route-setup">
              <h4 className="route-setup__title">Route setup</h4>
              <p className="route-setup__hint">
                {selectedRoutableCount} orders selected — routes start from your lab location in System
                settings. Set departure time and on-site minutes per stop, then click Plan route.
              </p>
              <div className="route-setup__location" aria-live="polite">
                <p className="route-setup__location-label">Route start (lab location)</p>
                {labRouteStart ? (
                  <div className="route-setup__location-info">
                    {labRouteStart.address ? <p>{labRouteStart.address}</p> : null}
                    <p className="route-setup__coords">{formatCoordPair(labRouteStart.lat, labRouteStart.lng)}</p>
                  </div>
                ) : (
                  <p className="route-setup__location-missing">
                    No lab location configured. Set it under{' '}
                    <Link to="/system-settings">System settings</Link> → Location &amp; contact.
                  </p>
                )}
              </div>
              <div className="route-setup__grid">
                <div className="field">
                  <label htmlFor="route-start-time">Start time</label>
                  <TimeField
                    id="route-start-time"
                    value={routeStartTime}
                    onChange={setRouteStartTime}
                    disabled={routePlanning}
                    placeholder="Select start time"
                  />
                </div>
                <div className="field">
                  <label htmlFor="route-duration">Collection duration (min per stop)</label>
                  <input
                    id="route-duration"
                    type="number"
                    min={1}
                    step={1}
                    value={routeCollectionDurationMinutes === '' ? '' : routeCollectionDurationMinutes}
                    onChange={(e) =>
                      setRouteCollectionDurationMinutes(
                        e.target.value === '' ? '' : Number(e.target.value),
                      )
                    }
                    disabled={routePlanning}
                  />
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: '1rem 0 0', fontSize: '0.875rem', color: 'var(--muted)' }}>
              Select at least two orders in the table above to set up a collection route.
            </p>
          )
        ) : null}
        <div className="row-actions" style={{ marginTop: '1rem', alignItems: 'center' }}>
          {isScheduleMode ? (
            canStartCollection ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void startCollectionForSelected()}
                disabled={collectionSubmitting}
                aria-busy={collectionSubmitting}
              >
                {collectionSubmitting
                  ? 'Updating…'
                  : selectedRoutableCount === 1
                    ? 'Start collecting'
                    : `Start collecting (${selectedRoutableCount})`}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
                Select one or more orders in the table above to mark them as collecting.
              </p>
            )
          ) : selectedRoutableCount >= 2 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void runAiRoute()}
              disabled={!canPlanRoute}
              aria-busy={routePlanning}
            >
              <span className="btn-busy-content">
                {routePlanning ? (
                  <span className="loading-spinner loading-spinner--sm btn-busy-content__spinner" aria-hidden />
                ) : null}
                {routePlanning ? 'Planning route…' : 'Plan route'}
              </span>
            </button>
          ) : null}
        </div>
      </div>

      {!isScheduleMode && routeResult && routePlanOrders.length > 0 ? (
        <div className="route-panel">
          <div className="route-panel__head">
            <div>
              <h3 className="route-panel__title">Planned collection route</h3>
              <p className="route-panel__summary">{routeResult.summary}</p>
            </div>
            <div className="route-panel__head-actions">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={openRouteAssign}
                disabled={!hasApi || routeAssignSubmitting}
              >
                Assign collector
              </button>
              <div className="route-panel__eta">
                <span className="route-panel__eta-label">Est. finish</span>
                <span className="route-panel__eta-value">{routeResult.estimatedFinishTime ?? '—'}</span>
              </div>
            </div>
          </div>
          {routeCollectorOptions.length === 0 ? (
            <p className="route-panel__hint">
              No staff with role <strong>Collector</strong> yet. Add one under <strong>Staff</strong>, then assign
              this route.
            </p>
          ) : null}

          <ol className="route-stops" aria-label="Collection stops in route order">
            {routePlanOrders.map((order, stopIndex) => {
              const items: ApiOrderDetailItem[] = order.items ?? []
              const stop = stopIndex + 1
              const assigned = routeAssignments[order.id]
              const stopDetail = routeStopDetailForOrder(routeResult.routeStops, order.id)
              return (
                <li key={order.id} className="route-stop-card">
                  <div className="route-stop-card__marker" aria-hidden>
                    <span className="route-stop-card__badge">{stop}</span>
                    {stopIndex < routePlanOrders.length - 1 ? <span className="route-stop-card__line" /> : null}
                  </div>
                  <div className="route-stop-card__body">
                    <div className="route-stop-card__meta">
                      <span className="route-stop-card__patient">{order.patient_name}</span>
                      <span className="route-stop-card__address">
                        {order.address?.trim() || 'No address on file'}
                      </span>
                    </div>
                    {stopDetail?.arrivalTime ? (
                      <p className="route-stop-card__schedule">
                        Arrive {stopDetail.arrivalTime}
                        {stopDetail.collectionStart && stopDetail.collectionEnd
                          ? ` · collect ${stopDetail.collectionStart}–${stopDetail.collectionEnd}`
                          : stopDetail.collectionEnd
                            ? ` · finish ${stopDetail.collectionEnd}`
                            : null}
                      </p>
                    ) : null}
                    {assigned ? (
                      <p className="route-stop-card__assigned">
                        <span className="material-symbols-outlined route-stop-card__assigned-icon" aria-hidden>
                          person
                        </span>
                        {assigned.collectorName} · {fmtWhen(assigned.collectionTime)}
                      </p>
                    ) : null}
                    {items.length === 0 ? (
                      <p className="route-stop-card__empty">No tests assigned on this order</p>
                    ) : (
                      <ul className="route-stop-card__tests">
                        {items.map((it, idx) => (
                          <li key={`${order.id}-${it.test_id}-${idx}`} className="route-stop-card__test">
                            <span className="route-stop-card__test-name">
                              {it.test_name?.trim() || it.test_id}
                            </span>
                            {it.test_code?.trim() ? (
                              <span className="route-stop-card__test-code">{it.test_code.trim()}</span>
                            ) : null}
                            <span className="route-stop-card__test-qty">×{it.quantity}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}

      {routeAssignOpen
        ? createPortal(
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="route-assign-title"
              onMouseDown={(e) =>
                e.target === e.currentTarget && !routeAssignSubmitting && setRouteAssignOpen(false)
              }
            >
              <div className="modal-card modal-card--status-update" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h2 className="modal-title" id="route-assign-title">
                    Assign collector to route
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost modal-close"
                    onClick={() => !routeAssignSubmitting && setRouteAssignOpen(false)}
                    aria-label="Close"
                    disabled={routeAssignSubmitting}
                  >
                    ×
                  </button>
                </div>
                <div className="modal-card--status-update__body">
                  <form className="form-grid status-update-form" onSubmit={(e) => void submitRouteAssign(e)}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                      Assigns a staff member with role <strong>Collector</strong> to all{' '}
                      <strong>{routePlanOrders.length}</strong> stops using the start time from{' '}
                      <strong>Route setup</strong> ({routeStartTime || '—'}). Pending orders move to{' '}
                      <strong>scheduled</strong>; per-stop times follow the planned route when available.
                    </p>
                    {routeCollectorOptions.length === 0 ? (
                      <div className="form-alert form-alert--error" role="alert">
                        No collectors available. Go to <strong>Staff</strong> → add or edit a staff member and set role
                        to <strong>Collector</strong>, then try again.
                      </div>
                    ) : (
                      <div className="field">
                        <label htmlFor="route-collector">Collector</label>
                        <select
                          id="route-collector"
                          className="select-chevron-left"
                          value={routeCollectorId}
                          onChange={(e) => setRouteCollectorId(e.target.value)}
                          disabled={routeAssignSubmitting}
                        >
                          <option value="">Select collector…</option>
                          {routeCollectorOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {routeAssignError ? (
                      <div className="form-alert form-alert--error" role="alert">
                        {routeAssignError}
                      </div>
                    ) : null}
                    <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setRouteAssignOpen(false)}
                        disabled={routeAssignSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={routeAssignSubmitting || routeCollectorOptions.length === 0}
                      >
                        {routeAssignSubmitting ? 'Assigning…' : 'Assign to route'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
