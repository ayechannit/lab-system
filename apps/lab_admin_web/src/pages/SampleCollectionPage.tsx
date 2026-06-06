import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { DatetimeLocalField } from '../components/common/DatetimeLocalField'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useAuth } from '../hooks/AuthContext'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import type { StaffListRow, StaffRole } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  fetchOrderById,
  fetchOrders,
  updateOrderStatus,
  type ApiOrderDetailItem,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import { fetchStaffList } from '../services/staffService'
import { upsertSchedule, type ApiOrderSchedule } from '../services/scheduleService'
import { suggestCollectionRoute } from '../services/aiDemo'
import {
  COLLECTOR_OTHER_VALUE,
  collectorRoleStaffList,
  collectorStaffDropdownList,
} from '../utils/collectorStaff'
import { datetimeLocalToIso, toDatetimeLocalValue } from '../utils/datetimeLocal'
import '../components/common/ui.css'

const ROUTING_STATUSES: ApiOrderStatus[] = ['pending', 'scheduled', 'collecting']

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

function applySchedulePrefill(
  pre: ApiOrderSchedule | null,
  staff: StaffListRow[],
  setters: {
    setCollectorSelect: (v: string) => void
    setCollectingPerson: (v: string) => void
    setCollectionTime: (v: string) => void
    setRunningTime: (v: string) => void
    setReportOutTime: (v: string) => void
    setAcceptedByUser: (v: boolean) => void
  },
) {
  const opts = collectorStaffDropdownList(staff)
  const raw = (pre?.collecting_person ?? '').trim()
  if (opts.length === 0) {
    setters.setCollectorSelect(COLLECTOR_OTHER_VALUE)
    setters.setCollectingPerson(raw)
  } else {
    const match = opts.find((s) => s.name.trim().toLowerCase() === raw.toLowerCase())
    if (match) {
      setters.setCollectorSelect(match.id)
      setters.setCollectingPerson('')
    } else if (raw) {
      setters.setCollectorSelect(COLLECTOR_OTHER_VALUE)
      setters.setCollectingPerson(raw)
    } else {
      setters.setCollectorSelect(opts[0]?.id ?? '')
      setters.setCollectingPerson('')
    }
  }
  setters.setCollectionTime(toDatetimeLocalValue(pre?.collection_time ?? null))
  setters.setRunningTime(toDatetimeLocalValue(pre?.running_time ?? null))
  setters.setReportOutTime(toDatetimeLocalValue(pre?.report_out_time ?? null))
  setters.setAcceptedByUser(Boolean(pre?.accepted_by_user))
}

const ORDER_STATUS_OPTIONS: { value: ApiOrderStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'scheduled', label: 'Scheduled' },
]

function fmtWhen(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString()
}

function orderStopsInRouteOrder(
  picked: ApiOrderListRow[],
  orderedStops: string[],
): ApiOrderListRow[] {
  const byId = new Map(picked.map((o) => [o.id, o]))
  const ordered: ApiOrderListRow[] = []
  for (const line of orderedStops) {
    const id = line.split(':')[0]?.trim()
    const o = id ? byId.get(id) : undefined
    if (o && !ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  for (const o of picked) {
    if (!ordered.some((x) => x.id === o.id)) ordered.push(o)
  }
  return ordered
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
  const [routeResult, setRouteResult] = useState<ReturnType<typeof suggestCollectionRoute> | null>(null)
  const [routePlanOrders, setRoutePlanOrders] = useState<ApiOrderListRow[]>([])
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<ApiOrderStatus>('pending')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)
  const [staff, setStaff] = useState<StaffListRow[]>([])

  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleTargets, setScheduleTargets] = useState<ApiOrderListRow[]>([])
  const [schCollectorSelect, setSchCollectorSelect] = useState('')
  const [schCollectingPerson, setSchCollectingPerson] = useState('')
  const [schCollectionTime, setSchCollectionTime] = useState('')
  const [schRunningTime, setSchRunningTime] = useState('')
  const [schReportOutTime, setSchReportOutTime] = useState('')
  const [schAcceptedByUser, setSchAcceptedByUser] = useState(false)
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const [routeAssignOpen, setRouteAssignOpen] = useState(false)
  const [routeCollectorId, setRouteCollectorId] = useState('')
  const [routeCollectionTime, setRouteCollectionTime] = useState('')
  const [routeAssignSubmitting, setRouteAssignSubmitting] = useState(false)
  const [routeAssignError, setRouteAssignError] = useState<string | null>(null)
  const [routeAssignments, setRouteAssignments] = useState<
    Record<string, { collectorName: string; collectionTime: string }>
  >({})

  const isScheduleMode = statusFilter === 'scheduled'
  const collectorStaffOptions = useMemo(() => collectorStaffDropdownList(staff), [staff])
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
    setSelectedIds(new Set())
    setRouteResult(null)
    setRoutePlanOrders([])
    setScheduleOpen(false)
    setScheduleTargets([])
  }, [ordersListQuery])

  const routable = useMemo(
    () => orders.filter((o) => ROUTING_STATUSES.includes(o.status)),
    [orders],
  )

  const selectedRoutableCount = useMemo(
    () => routable.filter((o) => selectedIds.has(o.id)).length,
    [routable, selectedIds],
  )

  const canUpdateSchedule = hasApi && !loading && selectedRoutableCount >= 1

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runAiRoute = () => {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length < 2) {
      showError('Select at least two orders to build a multi-stop collection route.')
      return
    }
    const addresses = picked.map(
      (o) => `${o.id}: ${o.patient_name} — ${o.address?.trim() || '—'}`,
    )
    const result = suggestCollectionRoute(addresses)
    setRouteResult(result)
    setRoutePlanOrders(orderStopsInRouteOrder(picked, result.orderedStops))
    setRouteAssignments({})
    showSuccess('Collection route generated.')
  }

  function openRouteAssign() {
    if (routePlanOrders.length === 0) return
    setRouteAssignError(null)
    setRouteCollectorId(routeCollectorOptions[0]?.id ?? '')
    setRouteCollectionTime('')
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
    if (!routeCollectionTime.trim()) {
      setRouteAssignError('Enter the route start / collection time.')
      return
    }
    const baseIso = datetimeLocalToIso(routeCollectionTime)
    if (!baseIso) {
      setRouteAssignError('Collection date and time is invalid.')
      return
    }

    const actingStaffId = account?.id ?? collector.id
    const minutesPerStop =
      routeResult && routePlanOrders.length > 1
        ? Math.max(8, Math.round(routeResult.estimatedMinutes / routePlanOrders.length))
        : 0
    const baseMs = new Date(baseIso).getTime()

    setRouteAssignSubmitting(true)
    const nextAssignments: Record<string, { collectorName: string; collectionTime: string }> = {}
    try {
      for (let i = 0; i < routePlanOrders.length; i++) {
        const order = routePlanOrders[i]
        const stopMs = baseMs + i * minutesPerStop * 60_000
        const stopIso = new Date(stopMs).toISOString()
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

  async function openUpdateSchedule() {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length === 0) {
      showError('Select at least one order to update its schedule.')
      return
    }
    setScheduleError(null)
    setScheduleTargets(picked)
    let pre: ApiOrderSchedule | null = null
    try {
      const detail = await fetchOrderById(picked[0].id)
      pre = detail?.schedule ?? null
    } catch {
      pre = null
    }
    applySchedulePrefill(pre, staff, {
      setCollectorSelect: setSchCollectorSelect,
      setCollectingPerson: setSchCollectingPerson,
      setCollectionTime: setSchCollectionTime,
      setRunningTime: setSchRunningTime,
      setReportOutTime: setSchReportOutTime,
      setAcceptedByUser: setSchAcceptedByUser,
    })
    setScheduleOpen(true)
  }

  async function submitUpdateSchedule(e: FormEvent) {
    e.preventDefault()
    if (scheduleTargets.length === 0) return
    setScheduleError(null)

    const opts = collectorStaffDropdownList(staff)
    let collectingPerson = ''
    if (opts.length === 0 || schCollectorSelect === COLLECTOR_OTHER_VALUE) {
      collectingPerson = schCollectingPerson.trim()
    } else if (schCollectorSelect) {
      collectingPerson = opts.find((s) => s.id === schCollectorSelect)?.name.trim() ?? ''
    }
    if (!collectingPerson) {
      return setScheduleError(
        opts.length === 0
          ? 'Enter who will perform collection.'
          : schCollectorSelect === COLLECTOR_OTHER_VALUE
            ? 'Enter a name or team for collection.'
            : 'Select who will perform collection.',
      )
    }
    if (!schCollectionTime.trim()) return setScheduleError('Enter collection date and time.')
    const cIso = datetimeLocalToIso(schCollectionTime)
    if (!cIso) return setScheduleError('Collection date and time is invalid.')

    const runningIso = schRunningTime.trim() ? datetimeLocalToIso(schRunningTime) : null
    const reportIso = schReportOutTime.trim() ? datetimeLocalToIso(schReportOutTime) : null

    setScheduleSubmitting(true)
    try {
      for (const order of scheduleTargets) {
        await upsertSchedule({
          order_id: order.id,
          collecting_person: collectingPerson,
          collection_time: cIso,
          running_time: runningIso,
          report_out_time: reportIso,
          accepted_by_user: schAcceptedByUser,
        })
      }
      setScheduleOpen(false)
      setScheduleTargets([])
      setRefreshTick((t) => t + 1)
      showSuccess(
        scheduleTargets.length === 1
          ? 'Schedule updated.'
          : `Schedule updated for ${scheduleTargets.length} orders.`,
      )
    } catch (err) {
      setScheduleError(err instanceof Error ? err.message : 'Schedule update failed')
    } finally {
      setScheduleSubmitting(false)
    }
  }

  return (
    <div className="stack">
      <PageHeader
        title="Collection & routing"
        description={
          isScheduleMode
            ? 'Review scheduled pickups and update collector, collection time, and related schedule details.'
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
            ? 'Select one or more orders, then update collector, collection time, and optional lab / report times.'
            : 'Addresses come from the order record. Select at least two rows, then plan route order (demo helper).'}
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
        <div className="row-actions" style={{ marginTop: '1rem', alignItems: 'center' }}>
          {isScheduleMode ? (
            canUpdateSchedule ? (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void openUpdateSchedule()}
              >
                {selectedRoutableCount === 1
                  ? 'Update schedule'
                  : `Update schedules (${selectedRoutableCount})`}
              </button>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--muted)' }}>
                Select one or more orders in the table above to update their schedules.
              </p>
            )
          ) : (
            <button type="button" className="btn btn-primary" onClick={runAiRoute} disabled={!hasApi || loading}>
              Plan route (demo ordering)
            </button>
          )}
        </div>
      </div>

      {scheduleOpen && scheduleTargets.length > 0
        ? createPortal(
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              aria-labelledby="update-schedule-title"
              onMouseDown={(e) =>
                e.target === e.currentTarget && !scheduleSubmitting && setScheduleOpen(false)
              }
            >
              <div className="modal-card modal-card--status-update" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h2 className="modal-title" id="update-schedule-title">
                    Update schedule
                  </h2>
              <button
                type="button"
                className="btn btn-ghost modal-close"
                onClick={() => !scheduleSubmitting && setScheduleOpen(false)}
                aria-label="Close"
                disabled={scheduleSubmitting}
              >
                ×
              </button>
            </div>
            <div className="modal-card--status-update__body">
              <form className="form-grid status-update-form" onSubmit={(e) => void submitUpdateSchedule(e)}>
                {scheduleTargets.length === 1 ? (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                    <strong>{scheduleTargets[0].patient_name}</strong>
                    {scheduleTargets[0].address?.trim() ? ` · ${scheduleTargets[0].address.trim()}` : ''}
                  </p>
                ) : (
                  <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                    <p style={{ margin: '0 0 0.35rem' }}>
                      Updating <strong>{scheduleTargets.length}</strong> orders with the same schedule details.
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem' }}>
                      {scheduleTargets.map((o) => (
                        <li key={o.id}>
                          {o.patient_name}
                          {o.address?.trim() ? ` · ${o.address.trim()}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="status-update-schedule">
                  <div className="field">
                    <label htmlFor="sc-collector">Collecting person / team</label>
                    {collectorStaffOptions.length === 0 ? (
                      <>
                        <p className="status-update-hint status-update-hint--above-field">
                          No staff profiles yet — type who will collect.
                        </p>
                        <input
                          id="sc-collector"
                          value={schCollectingPerson}
                          onChange={(e) => setSchCollectingPerson(e.target.value)}
                          disabled={scheduleSubmitting}
                          placeholder="e.g. Partner lab — driver"
                          autoComplete="off"
                        />
                      </>
                    ) : (
                      <>
                        <select
                          id="sc-collector"
                          className="select-chevron-left"
                          value={schCollectorSelect}
                          onChange={(e) => {
                            const v = e.target.value
                            setSchCollectorSelect(v)
                            if (v !== COLLECTOR_OTHER_VALUE) setSchCollectingPerson('')
                          }}
                          disabled={scheduleSubmitting}
                        >
                          <option value="">Select team member…</option>
                          {collectorStaffOptions.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({staffRoleShort(s.role)})
                            </option>
                          ))}
                          <option value={COLLECTOR_OTHER_VALUE}>Other name or team…</option>
                        </select>
                        {schCollectorSelect === COLLECTOR_OTHER_VALUE ? (
                          <input
                            id="sc-collector-custom"
                            type="text"
                            className="status-update-custom-collector"
                            value={schCollectingPerson}
                            onChange={(e) => setSchCollectingPerson(e.target.value)}
                            disabled={scheduleSubmitting}
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
                      <label htmlFor="sc-collect-at">Collection time</label>
                      <DatetimeLocalField
                        id="sc-collect-at"
                        value={schCollectionTime}
                        onChange={setSchCollectionTime}
                        disabled={scheduleSubmitting}
                        allowClear={false}
                        schedule
                      />
                    </div>
                    <div className="field">
                      <label htmlFor="sc-running">Running / processing time (optional)</label>
                      <DatetimeLocalField
                        id="sc-running"
                        value={schRunningTime}
                        onChange={setSchRunningTime}
                        disabled={scheduleSubmitting}
                        schedule
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="sc-report">Report out time (optional)</label>
                    <DatetimeLocalField
                      id="sc-report"
                      value={schReportOutTime}
                      onChange={setSchReportOutTime}
                      disabled={scheduleSubmitting}
                      schedule
                    />
                  </div>
                  <div className="auth-checkbox-row auth-checkbox-row--center status-update-accepted">
                    <input
                      id="sc-accepted"
                      className="auth-checkbox"
                      type="checkbox"
                      checked={schAcceptedByUser}
                      onChange={() => setSchAcceptedByUser((v) => !v)}
                      disabled={scheduleSubmitting}
                    />
                    <label className="auth-checkbox-label" htmlFor="sc-accepted">
                      Accepted by patient / requester
                    </label>
                  </div>
                </div>
                {scheduleError ? (
                  <div className="form-alert form-alert--error" role="alert">
                    {scheduleError}
                  </div>
                ) : null}
                <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setScheduleOpen(false)}
                    disabled={scheduleSubmitting}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={scheduleSubmitting}>
                    {scheduleSubmitting
                      ? 'Saving…'
                      : scheduleTargets.length === 1
                        ? 'Save schedule'
                        : `Save ${scheduleTargets.length} schedules`}
                  </button>
                </div>
              </form>
            </div>
          </div>
            </div>,
            document.body,
          )
        : null}

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
                <span className="route-panel__eta-label">Est. time</span>
                <span className="route-panel__eta-value">{routeResult.estimatedMinutes} min</span>
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
                      <strong>{routePlanOrders.length}</strong> stops. Pending orders move to{' '}
                      <strong>scheduled</strong>; collection times are staggered along the route.
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
                    <div className="field">
                      <label htmlFor="route-collect-at">Route start / first collection time</label>
                      <DatetimeLocalField
                        id="route-collect-at"
                        value={routeCollectionTime}
                        onChange={setRouteCollectionTime}
                        disabled={routeAssignSubmitting}
                        allowClear={false}
                        schedule
                      />
                    </div>
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
