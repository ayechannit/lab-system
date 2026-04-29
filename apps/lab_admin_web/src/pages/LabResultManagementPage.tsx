import { useEffect, useMemo, useState, type ChangeEventHandler } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { useOrderLab } from '../context/OrderLabContext'
import { reviewLabResultsNumeric } from '../services/aiDemo'
import '../components/common/ui.css'

const valueDefaults: Record<string, { hb: string; wbc: string; plt: string }> = {
  LAB1021: { hb: '10.2', wbc: '7500', plt: '240000' },
  LAB1022: { hb: '13.1', wbc: '8200', plt: '265000' },
  LAB1023: { hb: '14.0', wbc: '7100', plt: '230000' },
  LAB1024: { hb: '12.4', wbc: '6900', plt: '210000' },
}

export function LabResultManagementPage() {
  const { orders, patchOrder } = useOrderLab()
  const [orderId, setOrderId] = useState(orders[0]?.orderId ?? '')
  const [hb, setHb] = useState('10.2')
  const [wbc, setWbc] = useState('7500')
  const [plt, setPlt] = useState('240000')

  const order = useMemo(() => orders.find((o) => o.orderId === orderId) ?? null, [orders, orderId])

  useEffect(() => {
    const d = valueDefaults[orderId]
    if (d) {
      setHb(d.hb)
      setWbc(d.wbc)
      setPlt(d.plt)
    }
  }, [orderId])

  const runAi = () => {
    if (!order) return
    const res = reviewLabResultsNumeric({
      hemoglobin: Number.parseFloat(hb) || 0,
      wbc: Number.parseFloat(wbc) || 0,
      platelet: Number.parseFloat(plt) || 0,
    })
    patchOrder(order.orderId, {
      aiReviewPassed: res.passed,
      aiReviewNotes: res.notes.join(' '),
    })
  }

  const onPdf: ChangeEventHandler<HTMLInputElement> = (e) => {
    if (!order) return
    const f = e.target.files?.[0]
    patchOrder(order.orderId, {
      resultPdfFileName: f ? f.name : null,
      resultSentToUserApp: false,
    })
  }

  const sendToUser = () => {
    if (!order) return
    if (order.paymentStatus !== 'paid') {
      window.alert('Payment must be fully received before sending results to the user app.')
      return
    }
    if (order.status !== 'completed') {
      window.alert('Mark this order as completed before releasing results to the user app.')
      return
    }
    if (!order.resultPdfFileName) {
      window.alert('Attach a PDF report before sending to the user app (demo guard).')
      return
    }
    if (order.aiReviewPassed === null) {
      window.alert('Run the AI quality check before sending (demo guard).')
      return
    }
    if (order.aiReviewPassed === false) {
      const ok = window.confirm(
        'AI flagged issues on this result. Send to user app anyway? (demo — normally blocked).',
      )
      if (!ok) return
    }
    patchOrder(order.orderId, { resultSentToUserApp: true, reportOutTime: new Date().toISOString().slice(0, 16) })
    window.alert(`Result for ${order.orderId} pushed to user app (demo).`)
  }

  return (
    <div className="stack">
      <PageHeader
        title="Lab result management"
        description="Enter analytes, attach the signed PDF, run AI pre-release review, then deliver to the patient / doctor / clinic app."
      />
      <div className="card">
        <h3 className="card-title">Select order</h3>
        <div className="field" style={{ maxWidth: 360 }}>
          <label htmlFor="oid">Order ID</label>
          <select
            id="oid"
            className="select-chevron-left"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          >
            {orders.map((o) => (
              <option key={o.orderId} value={o.orderId}>
                {o.orderId} — {o.patientName} ({o.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {order ? (
        <div className="card">
          <h3 className="card-title">Result entry · {order.orderId}</h3>
          <div className="form-grid" style={{ maxWidth: 'none', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="field">
              <label htmlFor="hb">Hemoglobin</label>
              <input id="hb" value={hb} onChange={(e) => setHb(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="wbc">WBC</label>
              <input id="wbc" value={wbc} onChange={(e) => setWbc(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="plt">Platelet</label>
              <input id="plt" value={plt} onChange={(e) => setPlt(e.target.value)} />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="pdf">Attach PDF report</label>
              <div className="file-upload-row">
                <input
                  id="pdf"
                  className="file-upload-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onPdf}
                />
                <label htmlFor="pdf" className="file-upload-btn">
                  Choose PDF
                </label>
                <span className="file-upload-name">
                  {order.resultPdfFileName ? order.resultPdfFileName : 'No file selected'}
                </span>
              </div>
              {order.resultPdfFileName ? (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                  Attached: {order.resultPdfFileName}
                </p>
              ) : (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  No PDF attached yet.
                </p>
              )}
            </div>
          </div>

          <div className="row-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={runAi}>
              Run AI result check
            </button>
            <button type="button" className="btn btn-primary" onClick={sendToUser}>
              Send PDF + results to user app
            </button>
          </div>

          {order.aiReviewPassed !== null ? (
            <div
              className={`ai-panel ${order.aiReviewPassed ? 'ai-panel--ok' : 'ai-panel--warn'}`}
              style={{ marginTop: '1rem' }}
            >
              <strong>{order.aiReviewPassed ? 'AI: OK to release (demo thresholds)' : 'AI: Review required'}</strong>
              {order.aiReviewNotes ? <p style={{ margin: '0.35rem 0 0' }}>{order.aiReviewNotes}</p> : null}
            </div>
          ) : (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              AI check not run yet for this order.
            </p>
          )}

          {order.resultSentToUserApp ? (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--accent-green)', fontWeight: 600 }}>
              Already marked as sent to user app.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
