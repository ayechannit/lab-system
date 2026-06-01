import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { DatetimeLocalField } from '../components/common/DatetimeLocalField'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { useToast } from '../hooks/ToastContext'
import { useErrorToast } from '../hooks/usePageNotify'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import type { StaffListRow, StaffRole } from '../model/types'
import { isApiMode } from '../services/apiBase'
import {
  fetchOrderById,
  fetchOrders,
  type ApiOrderDetailItem,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import { fetchStaffList } from '../services/staffService'
import { upsertSchedule, type ApiOrderSchedule } from '../services/scheduleService'
import { suggestCollectionRoute } from '../services/aiDemo'
import { datetimeLocalToIso, toDatetimeLocalValue } from '../utils/datetimeLocal'
import '../components/common/ui.css'

const ROUTING_STATUSES: ApiOrderStatus[] = ['pending', 'scheduled', 'collecting']

const COLLECTOR_OTHER_VALUE = '__other__'

function staffRoleShort(role: StaffRole): string {
  const map: Record<StaffRole, string> = {
    admin: 'Admin',
    lab_technician: 'Lab tech',
    reception: 'Reception',
    manager: 'Manager',
  }
  return map[role] ?? role
}

function collectorStaffDropdownList(st: StaffListRow[]): StaffListRow[] {
  const active = st.filter((s) => !s.is_deleted && s.is_active)
  return active.length > 0 ? active : st.filter((s) => !s.is_deleted)
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
  { value: 'collecting', label: 'Collecting' },
  { value: 'running', label: 'Running' },
  { value: 'completed', label: 'Completed' },
  { value: 'delivered', label: 'Delivered' },
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
  const [scheduleTarget, setScheduleTarget] = useState<ApiOrderListRow | null>(null)
  const [schCollectorSelect, setSchCollectorSelect] = useState('')
  const [schCollectingPerson, setSchCollectingPerson] = useState('')
  const [schCollectionTime, setSchCollectionTime] = useState('')
  const [schRunningTime, setSchRunningTime] = useState('')
  const [schReportOutTime, setSchReportOutTime] = useState('')
  const [schAcceptedByUser, setSchAcceptedByUser] = useState(false)
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)

  const isScheduleMode = statusFilter === 'scheduled'
  const collectorStaffOptions = useMemo(() => collectorStaffDropdownList(staff), [staff])

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
    setScheduleTarget(null)
  }, [ordersListQuery])

  const routable = useMemo(
    () => orders.filter((o) => ROUTING_STATUSES.includes(o.status)),
    [orders],
  )

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
    showSuccess('Collection route generated.')
  }

  async function openUpdateSchedule() {
    const picked = routable.filter((o) => selectedIds.has(o.id))
    if (picked.length !== 1) {
      showError('Select exactly one order to update its schedule.')
      return
    }
    const row = picked[0]
    setScheduleError(null)
    setScheduleTarget(row)
    let pre: ApiOrderSchedule | null = null
    try {
      const detail = await fetchOrderById(row.id)
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
    if (!scheduleTarget) return
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

    setScheduleSubmitting(true)
    try {
      await upsertSchedule({
        order_id: scheduleTarget.id,
        collecting_person: collectingPerson,
        collection_time: cIso,
        running_time: schRunningTime.trim() ? datetimeLocalToIso(schRunningTime) : null,
        report_out_time: schReportOutTime.trim() ? datetimeLocalToIso(schReportOutTime) : null,
        accepted_by_user: schAcceptedByUser,
      })
      setScheduleOpen(false)
      setRefreshTick((t) => t + 1)
      showSuccess('Schedule updated.')
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
            ? 'Select one order, then update who will collect, collection time, and optional lab / report times.'
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
                        aria-label={`Select ${o.id}`}
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
        <div className="row-actions" style={{ marginTop: '1rem' }}>
          {isScheduleMode ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void openUpdateSchedule()}
              disabled={!hasApi || loading || selectedIds.size !== 1}
            >
              Update schedule
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={runAiRoute} disabled={!hasApi || loading}>
              Plan route (demo ordering)
            </button>
          )}
        </div>
      </div>

      {scheduleOpen && scheduleTarget ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) =>
            e.target === e.currentTarget && !scheduleSubmitting && setScheduleOpen(false)
          }
        >
          <div className="modal-card modal-card--status-update" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h2 className="modal-title">Update schedule</h2>
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
                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--muted)' }}>
                  <strong>{scheduleTarget.patient_name}</strong>
                  {scheduleTarget.address?.trim() ? ` · ${scheduleTarget.address.trim()}` : ''}
                </p>
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
                    {scheduleSubmitting ? 'Saving…' : 'Save schedule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {!isScheduleMode && routeResult && routePlanOrders.length > 0 ? (
        <div className="route-panel">
          <div className="route-panel__head">
            <div>
              <h3 className="route-panel__title">Planned collection route</h3>
              <p className="route-panel__summary">{routeResult.summary}</p>
            </div>
            <div className="route-panel__eta">
              <span className="route-panel__eta-label">Est. time</span>
              <span className="route-panel__eta-value">{routeResult.estimatedMinutes} min</span>
            </div>
          </div>

          <ol className="route-stops" aria-label="Collection stops in route order">
            {routePlanOrders.map((order, stopIndex) => {
              const items: ApiOrderDetailItem[] = order.items ?? []
              const stop = stopIndex + 1
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
    </div>
  )
}
