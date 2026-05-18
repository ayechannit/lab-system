import { useEffect, useMemo, useState } from 'react'
import { ListFilterSearchField } from '../components/common/ListFilterSearchField'
import { PageHeader } from '../components/common/PageHeader'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { DEFAULT_TABLE_PAGE_SIZE, TablePagination } from '../components/common/TablePagination'
import { isApiMode } from '../services/apiBase'
import {
  fetchOrders,
  type ApiOrderListRow,
  type ApiOrderStatus,
  type FetchOrdersParams,
} from '../services/orderService'
import { suggestCollectionRoute } from '../services/aiDemo'
import '../components/common/ui.css'

const ROUTING_STATUSES: ApiOrderStatus[] = ['pending', 'scheduled', 'collecting']

const ORDER_STATUS_OPTIONS: { value: '' | ApiOrderStatus; label: string }[] = [
  { value: '', label: 'All statuses' },
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

export function SampleCollectionPage() {
  const hasApi = isApiMode()
  const [orders, setOrders] = useState<ApiOrderListRow[]>([])
  const [loading, setLoading] = useState(hasApi)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [routeResult, setRouteResult] = useState<ReturnType<typeof suggestCollectionRoute> | null>(null)
  const [patientInput, setPatientInput] = useState('')
  const [patientName, setPatientName] = useState('')
  const [statusFilter, setStatusFilter] = useState<'' | ApiOrderStatus>('')
  const [ordersPage, setOrdersPage] = useState(1)
  const [ordersPageSize, setOrdersPageSize] = useState(DEFAULT_TABLE_PAGE_SIZE)
  const [refreshTick, setRefreshTick] = useState(0)

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
        const list = await fetchOrders(ordersListQuery)
        if (!cancelled) {
          setOrders(list)
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
      window.alert('Select at least two orders to build a multi-stop collection route.')
      return
    }
    const addresses = picked.map((o) => `${o.id}: ${o.address ?? '—'}`)
    setRouteResult(suggestCollectionRoute(addresses))
  }

  return (
    <div className="stack">
      <PageHeader
        title="Collection & routing"
        description="Choose orders that need a sample pickup, then arrange an efficient route using each patient’s address on the map."
      />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load orders from the backend.
          </p>
        </div>
      ) : null}

      {loadError ? (
        <div className="card" style={{ borderColor: '#f0c4c4', background: '#fff8f8' }}>
          <p style={{ margin: 0, color: '#ba1a1a', fontSize: '0.9rem' }}>{loadError}</p>
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
              onChange={(e) => setStatusFilter((e.target.value || '') as '' | ApiOrderStatus)}
              disabled={!hasApi || loading}
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
        <h3 className="card-title">Orders ready for pickup routing</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          Addresses come from the order record. Select rows and run heuristic route ordering (demo helper).
          Rows below are still limited to pending, scheduled, or collecting for routing.
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
                      : 'No orders in pending / scheduled / collecting in this list. Clear the status filter or load all orders to see other stages.'}
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
          <button type="button" className="btn btn-primary" onClick={runAiRoute} disabled={!hasApi || loading}>
            Plan route (demo ordering)
          </button>
        </div>
      </div>

      {routeResult ? (
        <div className="route-panel">
          <strong>Suggested collection order</strong>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>{routeResult.summary}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            Estimated driving + handover: <strong>{routeResult.estimatedMinutes} min</strong> (heuristic estimate)
          </p>
          <ol>
            {routeResult.orderedStops.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="card">
        <h3 className="card-title">Route map preview</h3>
        <div className="map-preview">Connect Mapbox / Google Maps for live routing against these coordinates.</div>
      </div>
    </div>
  )
}
