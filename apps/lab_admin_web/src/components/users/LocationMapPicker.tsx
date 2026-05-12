import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { nominatimReverse } from '../../services/nominatimGeocode'

/** Yangon — sensible default when coords are unset or 0,0 */
const DEFAULT_CENTER: [number, number] = [16.8661, 96.1951]

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

function parseCoord(v: number | ''): number | null {
  if (v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

function hasUsableCoords(lat: number | '', lng: number | ''): boolean {
  const la = parseCoord(lat)
  const ln = parseCoord(lng)
  if (la === null || ln === null) return false
  if (la === 0 && ln === 0) return false
  return true
}

function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      map.invalidateSize()
      requestAnimationFrame(() => map.invalidateSize())
    })
    return () => cancelAnimationFrame(id)
  }, [map])
  return null
}

function MapClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/** Pans to the pin when latitude/longitude change (edit load or map click). */
function RecenterOnCoords({ latitude, longitude }: { latitude: number | ''; longitude: number | '' }) {
  const map = useMap()
  useEffect(() => {
    if (!hasUsableCoords(latitude, longitude)) return
    const la = parseCoord(latitude)!
    const ln = parseCoord(longitude)!
    map.flyTo([la, ln], Math.max(map.getZoom(), 14), { duration: 0.35 })
  }, [map, latitude, longitude])
  return null
}

type LocationMapPickerProps = {
  latitude: number | ''
  longitude: number | ''
  onPick: (lat: number, lng: number) => void
  /** When set, a map click or “Use my location” fills the address via reverse geocoding (Nominatim). */
  onAddressFromMap?: (address: string) => void
  /** Map height in CSS pixels (default 220). */
  mapHeight?: number
}

export function LocationMapPicker({
  latitude,
  longitude,
  onPick,
  onAddressFromMap,
  mapHeight = 220,
}: LocationMapPickerProps) {
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const [reverseHint, setReverseHint] = useState<string | null>(null)
  const reverseAbortRef = useRef<AbortController | null>(null)

  const fillAddressFromCoords = useCallback(
    (lat: number, lng: number) => {
      if (!onAddressFromMap) return
      reverseAbortRef.current?.abort()
      const ac = new AbortController()
      reverseAbortRef.current = ac
      setReverseHint('Looking up address…')
      void nominatimReverse(lat, lng, ac.signal)
        .then((text) => {
          if (ac.signal.aborted) return
          setReverseHint(null)
          if (text) onAddressFromMap(text)
        })
        .catch(() => {
          if (ac.signal.aborted) return
          setReverseHint(null)
        })
    },
    [onAddressFromMap],
  )

  const handlePick = useCallback(
    (lat: number, lng: number) => {
      onPick(lat, lng)
      fillAddressFromCoords(lat, lng)
    },
    [onPick, fillAddressFromCoords],
  )

  useEffect(() => {
    return () => reverseAbortRef.current?.abort()
  }, [])

  const requestBrowserLocation = useCallback(() => {
    setGeoMessage(null)
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage('This browser does not support geolocation.')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false)
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        handlePick(lat, lng)
      },
      (err) => {
        setGeoLoading(false)
        const code = err.code
        if (code === 1) {
          setGeoMessage('Location permission denied. Allow access in the browser bar or settings.')
        } else if (code === 2) {
          setGeoMessage('Position unavailable. Try again or place the pin manually.')
        } else if (code === 3) {
          setGeoMessage('Location request timed out. Try again.')
        } else {
          setGeoMessage('Could not read your location.')
        }
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    )
  }, [handlePick])

  const usable = hasUsableCoords(latitude, longitude)
  const la = parseCoord(latitude) ?? DEFAULT_CENTER[0]
  const ln = parseCoord(longitude) ?? DEFAULT_CENTER[1]
  const center: [number, number] = usable ? [la, ln] : DEFAULT_CENTER
  const zoom = usable ? 15 : 12

  return (
    <div className="location-map-picker">
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: mapHeight, width: '100%', borderRadius: 10, zIndex: 0 }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeFix />
        <RecenterOnCoords latitude={latitude} longitude={longitude} />
        <MapClickHandler onPick={handlePick} />
        {usable ? <Marker position={[parseCoord(latitude)!, parseCoord(longitude)!]} /> : null}
      </MapContainer>
      <div
        className="location-map-picker__toolbar"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '0.55rem',
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => requestBrowserLocation()}
          disabled={geoLoading}
          aria-busy={geoLoading}
        >
          {geoLoading ? 'Getting location…' : 'Use my location'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Click the map or use your device location — the address field updates when a pin is placed (HTTPS or
          localhost).
        </span>
        {reverseHint ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', flexBasis: '100%' }} aria-live="polite">
            {reverseHint}
          </span>
        ) : null}
        {geoMessage ? (
          <span style={{ fontSize: '0.8rem', color: '#b42318', flexBasis: '100%' }} role="status">
            {geoMessage}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export function formatCoordPair(lat: number | '', lng: number | ''): string {
  const la = parseCoord(lat)
  const ln = parseCoord(lng)
  if (la === null || ln === null) return '—'
  return `${la.toFixed(5)}, ${ln.toFixed(5)}`
}
