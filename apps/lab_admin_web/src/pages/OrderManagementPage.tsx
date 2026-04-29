import { useCallback, useEffect, useMemo, useState } from 'react'
import { PageHeader } from '../components/common/PageHeader'
import { OrderQrModal } from '../components/orders/OrderQrModal'
import { useOrderLab } from '../context/OrderLabContext'
import type { OrderRow, OrderSource, OrderStatus, PaymentStatus } from '../mock-data/types'
import '../components/common/ui.css'

function statusBadge(status: OrderStatus) {
  const map: Record<OrderStatus, string> = {
    pending: 'badge badge--warn',
    collection: 'badge badge--neutral',
    testing: 'badge badge--neutral',
    completed: 'badge badge--success',
    cancelled: 'badge badge--danger',
  }
  return map[status]
}

function payClass(p: PaymentStatus) {
  if (p === 'paid') return 'badge badge--success'
  if (p === 'unpaid') return 'badge badge--danger'
  return 'badge badge--warn'
}

function sourceLabel(s: OrderSource) {
  const map: Record<OrderSource, string> = {
    patient_app: 'Patient app',
    doctor_app: 'Doctor app',
    clinic_portal: 'Clinic portal',
    walk_in: 'Walk-in',
  }
  return map[s]
}

function sourceBadgeClass(s: OrderSource) {
  if (s === 'patient_app') return 'badge badge--neutral'
  if (s === 'doctor_app') return 'badge badge--success'
  if (s === 'clinic_portal') return 'badge badge--warn'
  return 'badge badge--neutral'
}

export function OrderManagementPage() {
  const { orders, patchOrder, addOrder } = useOrderLab()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [qrFor, setQrFor] = useState<string | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const closeQr = useCallback(() => setQrFor(null), [])

  const selected = useMemo(
    () => orders.find((o) => o.orderId === selectedId) ?? null,
    [orders, selectedId],
  )

  const qrOrder = qrFor ? orders.find((o) => o.orderId === qrFor) : null
  const closeEditor = useCallback(() => setSelectedId(null), [])
  const closeDetail = useCallback(() => setDetailId(null), [])
  const detailOrder = useMemo(
    () => orders.find((o) => o.orderId === detailId) ?? null,
    [detailId, orders],
  )

  const hasSchedule = useCallback(
    (orderId: string) => {
      const order = orders.find((o) => o.orderId === orderId)
      if (!order) return false
      return Boolean(
        order.collectionTime &&
          order.labRunningCompleteAt &&
          order.reportOutTime &&
          order.collectingPerson &&
          order.collectingPerson !== 'Unassigned',
      )
    },
    [orders],
  )
  const nextOrderId = useMemo(() => {
    const max = orders.reduce((acc, o) => {
      const n = Number.parseInt(o.orderId.replace(/\D/g, ''), 10)
      return Number.isNaN(n) ? acc : Math.max(acc, n)
    }, 1020)
    return `LAB${String(max + 1).padStart(4, '0')}`
  }, [orders])

  const createNewOrder = useCallback(() => {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)
    const defaultDateTime = `${today}T09:00`
    const newOrder: OrderRow = {
      orderId: nextOrderId,
      patientName: 'New patient',
      patientPhone: '',
      testType: 'New lab test',
      orderDate: today,
      status: 'pending',
      paymentStatus: 'unpaid',
      technician: undefined,
      source: 'walk_in',
      patientAddress: '',
      amountMmk: 0,
      collectionTime: defaultDateTime,
      collectingPerson: 'Unassigned',
      labRunningCompleteAt: defaultDateTime,
      reportOutTime: defaultDateTime,
      resultPdfFileName: null,
      aiReviewPassed: null,
      aiReviewNotes: null,
      resultSentToUserApp: false,
    }
    addOrder(newOrder)
    setSelectedId(newOrder.orderId)
  }, [addOrder, nextOrderId])

  useEffect(() => {
    const onDocumentMouseDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.action-menu')) return
      setOpenMenuId(null)
    }

    const onDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenuId(null)
    }

    document.addEventListener('mousedown', onDocumentMouseDown)
    document.addEventListener('keydown', onDocumentKeyDown)
    return () => {
      document.removeEventListener('mousedown', onDocumentMouseDown)
      document.removeEventListener('keydown', onDocumentKeyDown)
    }
  }, [])

  const exportCsv = useCallback(() => {
    const header = [
      'order_id',
      'source',
      'patient_name',
      'patient_phone',
      'patient_address',
      'test_type',
      'order_date',
      'amount_mmk',
      'status',
      'payment_status',
      'technician',
      'collection_time',
      'collecting_person',
      'lab_running_complete_at',
      'report_out_time',
      'result_pdf',
      'ai_review_passed',
      'ai_review_notes',
      'result_sent_to_user_app',
    ]
    const esc = (v: string | number | boolean | null | undefined) =>
      `"${String(v ?? '').replaceAll('"', '""')}"`
    const rows = orders.map((o) =>
      [
        o.orderId,
        o.source,
        o.patientName,
        o.patientPhone,
        o.patientAddress,
        o.testType,
        o.orderDate,
        o.amountMmk,
        o.status,
        o.paymentStatus,
        o.technician ?? '',
        o.collectionTime,
        o.collectingPerson,
        o.labRunningCompleteAt,
        o.reportOutTime,
        o.resultPdfFileName ?? '',
        o.aiReviewPassed === null ? '' : o.aiReviewPassed,
        o.aiReviewNotes ?? '',
        o.resultSentToUserApp,
      ].map(esc).join(','),
    )
    const csv = [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lab_orders_${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }, [orders])

  return (
    <div className="stack">
      <PageHeader
        title="Order management"
        description="Receive lab tests from user apps, verify payment, schedule collection / lab / report times, print sample QR codes, and assign staff."
      />
      <div className="row-actions" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-export-csv" onClick={exportCsv}>
          <span aria-hidden>⤓</span>
          Export CSV
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{ minWidth: 92, paddingInline: '1rem' }}
          onClick={createNewOrder}
        >
          Create New Order
        </button>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Source</th>
              <th>Patient / client</th>
              <th>Test</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Payment</th>
              <th className="action-col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.orderId}>
                <td>
                  <strong>{o.orderId}</strong>
                </td>
                <td>
                  <span className={sourceBadgeClass(o.source)}>{sourceLabel(o.source)}</span>
                </td>
                <td>{o.patientName}</td>
                <td>{o.testType}</td>
                <td>{o.orderDate}</td>
                <td>{o.amountMmk.toLocaleString()} MMK</td>
                <td>
                  <span className={statusBadge(o.status)}>{o.status}</span>
                </td>
                <td>
                  <span className={payClass(o.paymentStatus)}>{o.paymentStatus}</span>
                </td>
                <td className="action-cell">
                  <div className="action-menu">
                    <button
                      type="button"
                      className="btn btn-secondary action-menu-trigger"
                      aria-label="Open actions menu"
                      aria-expanded={openMenuId === o.orderId}
                      onClick={() =>
                        setOpenMenuId((current) => (current === o.orderId ? null : o.orderId))
                      }
                    >
                      ⋯
                    </button>
                    {openMenuId === o.orderId ? (
                      <div className="action-menu-list">
                        <button
                          type="button"
                          className="action-menu-item"
                          onClick={() => {
                            setDetailId(o.orderId)
                            setOpenMenuId(null)
                          }}
                        >
                          Detail
                        </button>
                        <button
                          type="button"
                          className="action-menu-item"
                          onClick={() => {
                            setSelectedId(o.orderId)
                            setOpenMenuId(null)
                          }}
                        >
                          Update
                        </button>
                        <button
                          type="button"
                          className="action-menu-item"
                          onClick={() => {
                            setQrFor(o.orderId)
                            setOpenMenuId(null)
                          }}
                        >
                          QR
                        </button>
                      </div>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-editor-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEditor()
          }}
        >
          <div className="modal-card modal-card--order" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head order-modal-head">
              <h3 id="order-editor-title" className="modal-title">
                {hasSchedule(selected.orderId) ? 'Update order setup' : 'Add order setup'} · {selected.orderId}
              </h3>
              <button type="button" className="btn btn-ghost modal-close" onClick={closeEditor} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal-sub order-modal-sub">
              {selected.patientName} · {selected.patientPhone} · {selected.patientAddress}
            </p>

            <div className="order-detail-top-grid">
              <div className="field">
                <label htmlFor="st">Workflow status</label>
                <select
                  id="st"
                  value={selected.status}
                  onChange={(e) => patchOrder(selected.orderId, { status: e.target.value as OrderStatus })}
                >
                  {(['pending', 'collection', 'testing', 'completed', 'cancelled'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="paymentStatus">Payment received</label>
                <select
                  id="paymentStatus"
                  value={selected.paymentStatus}
                  onChange={(e) =>
                    patchOrder(selected.orderId, { paymentStatus: e.target.value as PaymentStatus })
                  }
                >
                  <option value="paid">Paid</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="tech">Technician</label>
                <input
                  id="tech"
                  value={selected.technician ?? ''}
                  placeholder="Assign name"
                  onChange={(e) => patchOrder(selected.orderId, { technician: e.target.value || undefined })}
                />
              </div>
            </div>

            <h4 className="order-detail-schedule-title order-modal-section-title">Collection & report schedule</h4>
            <p className="order-detail-meta" style={{ marginTop: '-0.15rem', marginBottom: '0.75rem' }}>
              Fill new details or update existing details. Changes save automatically.
            </p>
            <div className="order-detail-schedule-grid">
              <div className="field">
                <label htmlFor="collTime">Collection time</label>
                <input
                  id="collTime"
                  type="datetime-local"
                  value={selected.collectionTime}
                  onChange={(e) => patchOrder(selected.orderId, { collectionTime: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="collector">Collecting person</label>
                <input
                  id="collector"
                  value={selected.collectingPerson}
                  onChange={(e) => patchOrder(selected.orderId, { collectingPerson: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="runEnd">Lab running complete (target)</label>
                <input
                  id="runEnd"
                  type="datetime-local"
                  value={selected.labRunningCompleteAt}
                  onChange={(e) => patchOrder(selected.orderId, { labRunningCompleteAt: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor="reportOut">Report out time</label>
                <input
                  id="reportOut"
                  type="datetime-local"
                  value={selected.reportOutTime}
                  onChange={(e) => patchOrder(selected.orderId, { reportOutTime: e.target.value })}
                />
              </div>
            </div>

            <div className="row-actions order-detail-actions">
              <button type="button" className="btn btn-primary" onClick={closeEditor}>
                Update
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailOrder ? (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeDetail()
          }}
        >
          <div className="modal-card modal-card--order" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head order-modal-head">
              <h3 id="order-detail-title" className="modal-title">
                Order detail · {detailOrder.orderId}
              </h3>
              <button type="button" className="btn btn-ghost modal-close" onClick={closeDetail} aria-label="Close">
                ×
              </button>
            </div>
            <p className="modal-sub order-modal-sub">
              {detailOrder.patientName} · {detailOrder.patientPhone} · {detailOrder.patientAddress}
            </p>

            <div className="order-detail-grid">
              <div className="order-detail-item">
                <span className="order-detail-label">Source</span>
                <span>{sourceLabel(detailOrder.source)}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Test type</span>
                <span>{detailOrder.testType}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Order date</span>
                <span>{detailOrder.orderDate}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Amount</span>
                <span>{detailOrder.amountMmk.toLocaleString()} MMK</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Workflow status</span>
                <span className={statusBadge(detailOrder.status)}>{detailOrder.status}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Payment status</span>
                <span className={payClass(detailOrder.paymentStatus)}>{detailOrder.paymentStatus}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Technician</span>
                <span>{detailOrder.technician ?? 'Unassigned'}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Collecting person</span>
                <span>{detailOrder.collectingPerson || 'Unassigned'}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Collection time</span>
                <span>{detailOrder.collectionTime.replace('T', ' ')}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Lab running complete</span>
                <span>{detailOrder.labRunningCompleteAt.replace('T', ' ')}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Report out time</span>
                <span>{detailOrder.reportOutTime.replace('T', ' ')}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">PDF report</span>
                <span>{detailOrder.resultPdfFileName ?? 'Not attached'}</span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">AI review</span>
                <span>
                  {detailOrder.aiReviewPassed === null
                    ? 'Not run'
                    : detailOrder.aiReviewPassed
                      ? 'Passed'
                      : 'Flagged'}
                </span>
              </div>
              <div className="order-detail-item">
                <span className="order-detail-label">Result sent to app</span>
                <span>{detailOrder.resultSentToUserApp ? 'Yes' : 'No'}</span>
              </div>
            </div>

            <div className="row-actions order-detail-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setQrFor(detailOrder.orderId)}>
                QR
              </button>
              <button type="button" className="btn btn-primary" onClick={closeDetail}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {qrOrder ? (
        <OrderQrModal
          orderId={qrOrder.orderId}
          patientName={qrOrder.patientName}
          testType={qrOrder.testType}
          onClose={closeQr}
        />
      ) : null}
    </div>
  )
}
