import { useEffect, useMemo, useState, type ChangeEventHandler, type FormEvent } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { isApiMode } from '../services/apiBase'
import {
  fetchOrderById,
  fetchOrders,
  uploadOrderTestResult,
  type ApiOrderDetail,
  type ApiOrderListRow,
} from '../services/orderService'
import { reviewLabResultsNumeric } from '../services/aiDemo'
import '../components/common/ui.css'

export function LabResultManagementPage() {
  const hasApi = isApiMode()
  const [orders, setOrders] = useState<ApiOrderListRow[]>([])
  const [listLoading, setListLoading] = useState(hasApi)
  const [listError, setListError] = useState<string | null>(null)
  const [orderId, setOrderId] = useState('')
  const [detail, setDetail] = useState<ApiOrderDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)

  const [hb, setHb] = useState('')
  const [wbc, setWbc] = useState('')
  const [plt, setPlt] = useState('')
  const [aiResult, setAiResult] = useState<{ passed: boolean; notes: string } | null>(null)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [localPdfName, setLocalPdfName] = useState<string | null>(null)

  useEffect(() => {
    if (!hasApi) {
      setOrders([])
      setListLoading(false)
      return
    }
    let cancelled = false
    setListLoading(true)
    setListError(null)
    void (async () => {
      try {
        const list = await fetchOrders()
        if (!cancelled) {
          setOrders(list)
          setOrderId((prev) => prev || list[0]?.id || '')
        }
      } catch (e) {
        if (!cancelled) setListError(e instanceof Error ? e.message : 'Failed to load orders')
      } finally {
        if (!cancelled) setListLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi])

  useEffect(() => {
    if (!hasApi || !orderId) {
      setDetail(null)
      setAiResult(null)
      setLocalPdfName(null)
      return
    }
    let cancelled = false
    setDetailLoading(true)
    setDetailError(null)
    void (async () => {
      try {
        const d = await fetchOrderById(orderId)
        if (!cancelled) {
          if (!d) {
            setDetail(null)
            setDetailError('Order not found.')
          } else {
            setDetail(d)
            setDetailError(null)
          }
          setAiResult(null)
          setLocalPdfName(null)
        }
      } catch (e) {
        if (!cancelled) setDetailError(e instanceof Error ? e.message : 'Failed to load order')
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasApi, orderId])

  const firstTestItem = useMemo(() => detail?.items?.[0] ?? null, [detail])

  const runAi = () => {
    const res = reviewLabResultsNumeric({
      hemoglobin: Number.parseFloat(hb) || 0,
      wbc: Number.parseFloat(wbc) || 0,
      platelet: Number.parseFloat(plt) || 0,
    })
    setAiResult({ passed: res.passed, notes: res.notes.join(' ') })
  }

  const onPdf: ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0]
    setLocalPdfName(f ? f.name : null)
    setUploadError(null)
  }

  async function submitUpload(ev: FormEvent) {
    ev.preventDefault()
    if (!detail || !firstTestItem) return
    const input = (ev.target as HTMLFormElement).querySelector('input[type=file]') as HTMLInputElement | null
    const file = input?.files?.[0]
    if (!file) {
      setUploadError('Choose a PDF first.')
      return
    }
    setUploadBusy(true)
    setUploadError(null)
    try {
      await uploadOrderTestResult(detail.id, firstTestItem.test_id, file)
      const next = await fetchOrderById(detail.id)
      setDetail(next)
      setLocalPdfName(null)
      if (input) input.value = ''
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploadBusy(false)
    }
  }

  const sendToUser = () => {
    if (!detail) return
    if (detail.status !== 'completed') {
      window.alert('Set the order status to completed in Order management when the lab run is finished.')
      return
    }
    const hasServerFile = detail.items.some((it) => Boolean(it.download_url || it.result_file_url))
    if (!hasServerFile) {
      window.alert('Upload a result file for at least one test line item so it exists on the server.')
      return
    }
    if (aiResult && !aiResult.passed) {
      const ok = window.confirm('AI flagged issues on the numeric check. Continue anyway?')
      if (!ok) return
    }
    window.alert(
      'Uploaded files are stored on the server; patient apps typically load them via your mobile/backend integration. Confirm your release process with operations.',
    )
  }

  return (
    <div className="stack">
      <PageHeader
        title="Lab result management"
        description="Select a live order, enter QC values, upload PDF results per line item, and run a local numeric sanity check before release."
      />

      {!hasApi ? (
        <div className="card" style={{ borderColor: '#dfe5f0', background: '#f8fafc' }}>
          <p style={{ margin: 0, fontSize: '0.9rem' }}>
            Set <code>VITE_API_BASE_URL</code> and sign in to load orders.
          </p>
        </div>
      ) : null}

      {listError ? (
        <div className="card" style={{ borderColor: '#f0c4c4', background: '#fff8f8' }}>
          <p style={{ margin: 0, color: '#ba1a1a', fontSize: '0.9rem' }}>{listError}</p>
        </div>
      ) : null}

      <div className="card">
        <h3 className="card-title">Select order</h3>
        <div className="field" style={{ maxWidth: 480 }}>
          <label htmlFor="oid">Order</label>
          <select
            id="oid"
            className="select-chevron-left"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            disabled={listLoading || !hasApi}
          >
            {orders.length === 0 ? (
              <option value="">No orders</option>
            ) : (
              orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.patient_name} — {o.status} ({o.id.slice(0, 8)}…)
                </option>
              ))
            )}
          </select>
        </div>
        {detailError ? (
          <p style={{ margin: '0.75rem 0 0', color: '#b91c1c', fontSize: '0.875rem' }}>{detailError}</p>
        ) : null}
      </div>

      {detailLoading ? (
        <div className="card">
          <p style={{ margin: 0 }}>Loading order detail…</p>
        </div>
      ) : null}

      {detail && !detailLoading ? (
        <div className="card">
          <h3 className="card-title">Result entry · {detail.id}</h3>
          <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: 'var(--muted)' }}>
            Status: <strong>{detail.status}</strong> · Final: {detail.final_price_mmk.toLocaleString()} MMK
          </p>
          <div className="form-grid" style={{ maxWidth: 'none', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
            <div className="field">
              <label htmlFor="hb">Hemoglobin</label>
              <input id="hb" value={hb} onChange={(e) => setHb(e.target.value)} placeholder="e.g. 13.2" />
            </div>
            <div className="field">
              <label htmlFor="wbc">WBC</label>
              <input id="wbc" value={wbc} onChange={(e) => setWbc(e.target.value)} placeholder="e.g. 7200" />
            </div>
            <div className="field">
              <label htmlFor="plt">Platelet</label>
              <input id="plt" value={plt} onChange={(e) => setPlt(e.target.value)} placeholder="e.g. 240000" />
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label htmlFor="pdf">Attach PDF report (first line item: {firstTestItem?.test_id ?? '—'})</label>
              <form className="file-upload-row" onSubmit={(e) => void submitUpload(e)}>
                <input
                  id="pdf"
                  className="file-upload-input"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={onPdf}
                  disabled={uploadBusy || !firstTestItem}
                />
                <label htmlFor="pdf" className="file-upload-btn">
                  Choose PDF
                </label>
                <span className="file-upload-name">
                  {firstTestItem?.download_url ? 'File on server' : localPdfName ?? 'No file selected'}
                </span>
                <button type="submit" className="btn btn-secondary" disabled={uploadBusy || !firstTestItem}>
                  {uploadBusy ? 'Uploading…' : 'Upload to server'}
                </button>
              </form>
              {uploadError ? (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: '#b91c1c' }}>{uploadError}</p>
              ) : null}
              {firstTestItem?.download_url ? (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--accent-green)' }}>
                  <a href={firstTestItem.download_url} target="_blank" rel="noreferrer">
                    Open uploaded file
                  </a>
                </p>
              ) : (
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  Upload stores the file against the first test line on this order.
                </p>
              )}
            </div>
          </div>

          <div className="row-actions" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={runAi}>
              Run numeric sanity check
            </button>
            <button type="button" className="btn btn-primary" onClick={sendToUser}>
              Release checklist
            </button>
          </div>

          {aiResult ? (
            <div
              className={`ai-panel ${aiResult.passed ? 'ai-panel--ok' : 'ai-panel--warn'}`}
              style={{ marginTop: '1rem' }}
            >
              <strong>{aiResult.passed ? 'Numeric check: within demo thresholds' : 'Numeric check: review'}</strong>
              {aiResult.notes ? <p style={{ margin: '0.35rem 0 0' }}>{aiResult.notes}</p> : null}
            </div>
          ) : (
            <p style={{ marginTop: '0.75rem', fontSize: '0.85rem', color: 'var(--muted)' }}>
              Run the numeric check after entering values.
            </p>
          )}
        </div>
      ) : null}
    </div>
  )
}
