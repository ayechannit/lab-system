import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { OrderLocationGoogleMap } from './OrderLocationGoogleMap'

type OrderMapLinkProps = {
  patientName?: string | null
  address?: string | null
  latitude?: number | string | null
  longitude?: number | string | null
  /** Link text; defaults to the translated "View map" label. */
  label?: string
}

/** Table-cell link that opens the order's location on a Google Map in a popup. */
export function OrderMapLink({ patientName, address, latitude, longitude, label }: OrderMapLinkProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        type="button"
        className="order-map-link"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <span className="material-symbols-outlined order-map-link__icon" aria-hidden>
          location_on
        </span>
        {label ?? t('orders.detail.viewMap')}
      </button>
      {open
        ? createPortal(
            <div
              className="modal-backdrop"
              role="dialog"
              aria-modal="true"
              onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-card modal-card--order-map" onMouseDown={(e) => e.stopPropagation()}>
                <div className="modal-head">
                  <h2 className="modal-title">
                    {t('orders.detail.mapLocation')}
                    {patientName ? ` — ${patientName}` : ''}
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost modal-close"
                    onClick={() => setOpen(false)}
                    aria-label={t('common.close')}
                  >
                    ×
                  </button>
                </div>
                {address?.trim() ? <p className="order-map-modal__address">{address.trim()}</p> : null}
                <OrderLocationGoogleMap latitude={latitude} longitude={longitude} address={address} />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
