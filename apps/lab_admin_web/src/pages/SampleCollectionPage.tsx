import { useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { useOrderLab } from '../context/OrderLabContext'
import { suggestCollectionRoute } from '../services/aiDemo'
import '../components/common/ui.css'

export function SampleCollectionPage() {
  const { orders } = useOrderLab()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [routeResult, setRouteResult] = useState<ReturnType<typeof suggestCollectionRoute> | null>(null)

  const routable = useMemo(
    () => orders.filter((o) => o.status === 'pending' || o.status === 'collection'),
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
    const picked = orders.filter((o) => selectedIds.has(o.orderId))
    if (picked.length < 2) {
      window.alert('Select at least two orders to build a multi-stop collection route (demo).')
      return
    }
    const addresses = picked.map((o) => `${o.orderId}: ${o.patientAddress}`)
    setRouteResult(suggestCollectionRoute(addresses))
  }

  return (
    <div className="stack">
      <PageHeader
        title="Collection & routing"
        description="Pick pending / collection orders, then use demo AI to order stops by efficiency. QR codes are printed from Order management."
      />

      <div className="card">
        <h3 className="card-title">Orders ready for pickup routing</h3>
        <p style={{ margin: '0 0 0.75rem', color: 'var(--muted)', fontSize: '0.875rem' }}>
          Addresses flow in from the patient / doctor / clinic apps. Check boxes and run AI route planning.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: 40 }} />
                <th>Order</th>
                <th>Patient</th>
                <th>Address</th>
                <th>Collection time</th>
                <th>Collector</th>
              </tr>
            </thead>
            <tbody>
              {routable.map((o) => (
                <tr key={o.orderId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(o.orderId)}
                      onChange={() => toggle(o.orderId)}
                      aria-label={`Select ${o.orderId}`}
                    />
                  </td>
                  <td>{o.orderId}</td>
                  <td>{o.patientName}</td>
                  <td>{o.patientAddress}</td>
                  <td>{o.collectionTime.replace('T', ' ')}</td>
                  <td>{o.collectingPerson}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="row-actions" style={{ marginTop: '1rem' }}>
          <button type="button" className="btn btn-primary" onClick={runAiRoute}>
            Plan route with AI
          </button>
        </div>
      </div>

      {routeResult ? (
        <div className="route-panel">
          <strong>AI suggested collection order</strong>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--muted)' }}>{routeResult.summary}</p>
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
            Estimated driving + handover: <strong>{routeResult.estimatedMinutes} min</strong> (mock)
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
        <div className="map-preview">Static map — connect Mapbox / Google Maps for live routing</div>
      </div>
    </div>
  )
}
