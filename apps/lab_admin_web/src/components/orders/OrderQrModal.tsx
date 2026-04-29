import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'
import '../common/ui.css'

/** Short payload for scanning (same as before). */
function qrScanValue(orderId: string) {
  return `medlab:${orderId}`
}

/** Raster QR via public API — avoids SVG/qr.js crashes that can blank the whole SPA. */
function qrImageUrl(data: string) {
  const params = new URLSearchParams({
    size: '280x280',
    margin: '12',
    ecc: 'H',
    data,
  })
  return `https://api.qrserver.com/v1/create-qr-code/?${params.toString()}`
}

type OrderQrModalProps = {
  orderId: string
  patientName: string
  testType: string
  onClose: () => void
}

export function OrderQrModal({ orderId, patientName, testType, onClose }: OrderQrModalProps) {
  const titleId = useId()
  const payload = qrScanValue(orderId)
  const src = qrImageUrl(payload)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const downloadQr = async () => {
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${orderId}_qr.png`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      window.open(src, '_blank')
    }
  }

  const modal = (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-card modal-card--qr" onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2 id={titleId} className="modal-title">
            Sample QR · {orderId}
          </h2>
          <button type="button" className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal-sub">
          {patientName} — {testType}
        </p>
        <div className="qr-wrap">
          <div className="qr-frame qr-frame--img">
            <img
              src={src}
              width={280}
              height={280}
              alt={`QR code linking order ${orderId}`}
              className="qr-img"
              decoding="async"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
        <div className="qr-meta">
          <p className="qr-meta-title">Encoded value (demo)</p>
          <code className="qr-payload">{payload}</code>
          <p className="qr-meta-note">
            App resolves <code>{orderId}</code> to full order metadata. QR image loads from a public generator
            (offline networks may not show it).
          </p>
        </div>
        <div className="row-actions qr-actions">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn btn-primary" onClick={downloadQr}>
            Download QR
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}
