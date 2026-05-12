import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { isApiMode } from '../services/apiBase'
import { fetchOrders, type ApiOrderListRow, type ApiOrderStatus } from '../services/orderService'
import { suggestCollectionRoute } from '../services/aiDemo'
import '../components/common/ui.css'

const ROUTING_STATUSES: ApiOrderStatus[] = ['pending', 'scheduled', 'collecting']

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
        const list = await fetchOrders()
        if (!cancelled) setOrders(list)
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load orders')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi])

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
    const picked = orders.filter((o) => selectedIds.has(o.id))
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
        description="Pick orders that are pending, scheduled, or out for collection. Plan a stop order from live addresses on your lab API."
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

      <div className="card">
        <h3 className="card-title">Orders ready for pickup routing</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          Addresses come from the order record. Select rows and run heuristic route ordering (demo helper).
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
                  <td colSpan={6} className="data-table__state">
                    Loading…
                  </td>
                </tr>
              ) : routable.length === 0 ? (
                <tr>
                  <td colSpan={6} className="data-table__state">
                    No orders in pending / scheduled / collecting.
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
