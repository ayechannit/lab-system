import { useTranslation } from 'react-i18next'

type OrderLocationGoogleMapProps = {
  latitude: number | string | null | undefined
  longitude: number | string | null | undefined
  /** Used as the map query when the order has no coordinates. */
  address?: string | null
}

function toCoord(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(v)
  return Number.isFinite(n) ? n : null
}

/** Read-only Google Maps embed of the order's collection location (no API key required). */
export function OrderLocationGoogleMap({ latitude, longitude, address }: OrderLocationGoogleMapProps) {
  const { t } = useTranslation()
  const lat = toCoord(latitude)
  const lng = toCoord(longitude)
  const hasCoords = lat !== null && lng !== null && !(lat === 0 && lng === 0)
  const query = hasCoords ? `${lat},${lng}` : address?.trim() ?? ''

  if (!query) {
    return <span className="order-detail-value">{t('orders.detail.noMapLocation')}</span>
  }

  const q = encodeURIComponent(query)
  const embedSrc = `https://maps.google.com/maps?q=${q}&z=${hasCoords ? 16 : 14}&output=embed`
  const openHref = `https://www.google.com/maps/search/?api=1&query=${q}`

  return (
    <div className="order-location-map">
      <iframe
        title={t('orders.detail.mapLocation')}
        className="order-location-map__frame"
        src={embedSrc}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="order-location-map__footer">
        <span className="order-location-map__hint">
          {hasCoords ? `${lat!.toFixed(5)}, ${lng!.toFixed(5)}` : t('orders.detail.mapFromAddress')}
        </span>
        <a className="btn btn-secondary" href={openHref} target="_blank" rel="noopener noreferrer">
          {t('orders.detail.openInGoogleMaps')}
        </a>
      </div>
    </div>
  )
}
