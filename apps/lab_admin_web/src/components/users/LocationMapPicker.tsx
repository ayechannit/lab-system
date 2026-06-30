import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'
import { MapLocationSearch } from '../common/MapLocationSearch'
import { nominatimReverse } from '../../services/nominatimGeocode'

/** Default view: Yangon area — most collection addresses are in Myanmar. */
const MAP_INIT_CENTER: [number, number] = [16.8661, 96.1951]
const MAP_INIT_ZOOM = 11
const MAP_SELECTED_ZOOM = 15
const MAP_SEARCH_ZOOM = 15

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

export function hasUsableCoords(lat: number | '', lng: number | ''): boolean {
  const la = parseCoord(lat)
  const ln = parseCoord(lng)
  if (la === null || ln === null) return false
  if (la === 0 && ln === 0) return false
  return true
}

function MapResizeFix() {
  const map = useMap()
  useEffect(() => {
    const run = () => map.invalidateSize()
    const id = requestAnimationFrame(() => {
      run()
      requestAnimationFrame(run)
    })
    return () => cancelAnimationFrame(id)
  }, [map])
  return null
}

/** Re-measure when the map viewport is resized (e.g. responsive layout). */
function MapResizeObserver() {
  const map = useMap()
  useEffect(() => {
    const viewport = map.getContainer().parentElement
    if (!viewport) return
    const ro = new ResizeObserver(() => {
      map.invalidateSize()
    })
    ro.observe(viewport)
    return () => ro.disconnect()
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

function FlyToSearchTarget({
  target,
}: {
  target: { lat: number; lng: number; key: number } | null
}) {
  const map = useMap()
  useEffect(() => {
    if (!target) return
    map.flyTo([target.lat, target.lng], MAP_SEARCH_ZOOM, { duration: 0.45 })
  }, [map, target])
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
  /** Hide the bottom toolbar (search hint, use my location). */
  hideToolbar?: boolean
}

export function LocationMapPicker({
  latitude,
  longitude,
  onPick,
  onAddressFromMap,
  mapHeight = 220,
  hideToolbar = false,
}: LocationMapPickerProps) {
  const { t } = useTranslation()
  const [geoLoading, setGeoLoading] = useState(false)
  const [geoMessage, setGeoMessage] = useState<string | null>(null)
  const [reverseHint, setReverseHint] = useState<string | null>(null)
  const [searchFlyTarget, setSearchFlyTarget] = useState<{ lat: number; lng: number; key: number } | null>(
    null,
  )
  const reverseAbortRef = useRef<AbortController | null>(null)

  const fillAddressFromCoords = useCallback(
    (lat: number, lng: number) => {
      if (!onAddressFromMap) return
      reverseAbortRef.current?.abort()
      const ac = new AbortController()
      reverseAbortRef.current = ac
      setReverseHint(t('locationMap.lookingUpAddress'))
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
    [onAddressFromMap, t],
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
      setGeoMessage(t('locationMap.geolocationNotSupported'))
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
          setGeoMessage(t('locationMap.permissionDenied'))
        } else if (code === 2) {
          setGeoMessage(t('locationMap.positionUnavailable'))
        } else if (code === 3) {
          setGeoMessage(t('locationMap.requestTimedOut'))
        } else {
          setGeoMessage(t('locationMap.couldNotReadLocation'))
        }
      },
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 60_000 },
    )
  }, [handlePick, t])

  const usable = hasUsableCoords(latitude, longitude)
  const center: [number, number] = usable
    ? [parseCoord(latitude)!, parseCoord(longitude)!]
    : MAP_INIT_CENTER
  const zoom = usable ? MAP_SELECTED_ZOOM : MAP_INIT_ZOOM

  const handleSearchLocation = useCallback(
    (lat: number, lng: number) => {
      setSearchFlyTarget({ lat, lng, key: Date.now() })
      handlePick(lat, lng)
    },
    [handlePick],
  )

  return (
    <div
      className="location-map-picker"
      style={{ ['--location-map-height' as string]: `${mapHeight}px` }}
    >
      <MapLocationSearch onLocationFound={handleSearchLocation} />
      <div className="location-map-picker__viewport">
        <MapContainer
          center={center}
          zoom={zoom}
          className="location-map-picker__map"
          style={{ height: '100%', width: '100%', zIndex: 0 }}
          scrollWheelZoom
        >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizeFix />
          <MapResizeObserver />
          <FlyToSearchTarget target={searchFlyTarget} />
          <RecenterOnCoords latitude={latitude} longitude={longitude} />
        <MapClickHandler onPick={handlePick} />
        {usable ? <Marker position={[parseCoord(latitude)!, parseCoord(longitude)!]} /> : null}
        </MapContainer>
      </div>
      {!hideToolbar ? (
      <div className="location-map-picker__toolbar">
        {!usable ? (
          <span style={{ fontSize: '0.8rem', color: 'var(--muted)', flexBasis: '100%' }} aria-live="polite">
            {t('locationMap.noLocationSelected')}
          </span>
        ) : null}
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => requestBrowserLocation()}
          disabled={geoLoading}
          aria-busy={geoLoading}
        >
          {geoLoading ? t('locationMap.gettingLocation') : t('locationMap.useMyLocation')}
        </button>
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
      ) : null}
    </div>
  )
}

export function formatCoordPair(lat: number | '', lng: number | ''): string {
  const la = parseCoord(lat)
  const ln = parseCoord(lng)
  if (la === null || ln === null) return '—'
  return `${la.toFixed(5)}, ${ln.toFixed(5)}`
}
