import { useEffect } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

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
  /** Map height in CSS pixels (default 220). */
  mapHeight?: number
}

export function LocationMapPicker({ latitude, longitude, onPick, mapHeight = 220 }: LocationMapPickerProps) {
  const usable = hasUsableCoords(latitude, longitude)
  const la = parseCoord(latitude) ?? DEFAULT_CENTER[0]
  const ln = parseCoord(longitude) ?? DEFAULT_CENTER[1]
  const center: [number, number] = usable ? [la, ln] : DEFAULT_CENTER
  const zoom = usable ? 15 : 12

  return (
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
      <MapClickHandler onPick={onPick} />
      {usable ? <Marker position={[parseCoord(latitude)!, parseCoord(longitude)!]} /> : null}
    </MapContainer>
  )
}

export function formatCoordPair(lat: number | '', lng: number | ''): string {
  const la = parseCoord(lat)
  const ln = parseCoord(lng)
  if (la === null || ln === null) return '—'
  return `${la.toFixed(5)}, ${ln.toFixed(5)}`
}
