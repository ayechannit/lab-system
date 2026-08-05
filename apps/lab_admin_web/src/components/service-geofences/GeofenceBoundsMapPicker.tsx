import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { useTranslation } from 'react-i18next'
import L from 'leaflet'
import { MapContainer, Marker, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import {
  GeofenceBoundsLocationSearch,
  type GeofenceSearchPoint,
} from './GeofenceBoundsLocationSearch'

const startCornerIcon = L.divIcon({
  className: 'geofence-bounds-map-picker__corner-icon',
  html: '<span class="geofence-bounds-map-picker__corner-badge" aria-hidden="true">1</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const endCornerIcon = L.divIcon({
  className: 'geofence-bounds-map-picker__corner-icon',
  html: '<span class="geofence-bounds-map-picker__corner-badge geofence-bounds-map-picker__corner-badge--secondary" aria-hidden="true">2</span>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
})

const resizeHandleIcon = L.divIcon({
  className: 'geofence-bounds-map-picker__resize-handle',
  html: '<span class="geofence-bounds-map-picker__resize-handle-dot" aria-hidden="true"></span>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

const MIN_BOUNDS_SPAN = 0.0003

type BoundsCorner = 'sw' | 'se' | 'ne' | 'nw'

/** Default view: Mandalay — primary lab service area. */
const MAP_INIT_CENTER: [number, number] = [21.9588, 96.0891]
const MAP_INIT_ZOOM = 11
const MAP_SEARCH_ZOOM = 13

export type GeofenceBounds = {
  south_latitude: number | ''
  north_latitude: number | ''
  west_longitude: number | ''
  east_longitude: number | ''
}

function parseCoord(v: number | ''): number | null {
  if (v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

export function hasCompleteGeofenceBounds(bounds: GeofenceBounds): boolean {
  const south = parseCoord(bounds.south_latitude)
  const north = parseCoord(bounds.north_latitude)
  const west = parseCoord(bounds.west_longitude)
  const east = parseCoord(bounds.east_longitude)
  if (south == null || north == null || west == null || east == null) return false
  return west < east && south < north
}

function boundsFromCorners(
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): GeofenceBounds {
  return {
    south_latitude: Math.min(aLat, bLat),
    north_latitude: Math.max(aLat, bLat),
    west_longitude: Math.min(aLng, bLng),
    east_longitude: Math.max(aLng, bLng),
  }
}

function formatBoundsSummary(bounds: GeofenceBounds): string {
  if (!hasCompleteGeofenceBounds(bounds)) return '—'
  const south = parseCoord(bounds.south_latitude)!
  const north = parseCoord(bounds.north_latitude)!
  const west = parseCoord(bounds.west_longitude)!
  const east = parseCoord(bounds.east_longitude)!
  return `${south.toFixed(5)}–${north.toFixed(5)}°N · ${west.toFixed(5)}–${east.toFixed(5)}°E`
}

function geofenceBoundsToLatLngBounds(bounds: GeofenceBounds): L.LatLngBounds {
  const south = parseCoord(bounds.south_latitude)!
  const north = parseCoord(bounds.north_latitude)!
  const west = parseCoord(bounds.west_longitude)!
  const east = parseCoord(bounds.east_longitude)!
  return L.latLngBounds(L.latLng(south, west), L.latLng(north, east))
}

function latLngBoundsToGeofenceBounds(latLngBounds: L.LatLngBounds): GeofenceBounds {
  return {
    south_latitude: latLngBounds.getSouth(),
    north_latitude: latLngBounds.getNorth(),
    west_longitude: latLngBounds.getWest(),
    east_longitude: latLngBounds.getEast(),
  }
}

function cornerPositions(bounds: GeofenceBounds): Record<BoundsCorner, L.LatLng> {
  const south = parseCoord(bounds.south_latitude)!
  const north = parseCoord(bounds.north_latitude)!
  const west = parseCoord(bounds.west_longitude)!
  const east = parseCoord(bounds.east_longitude)!
  return {
    sw: L.latLng(south, west),
    se: L.latLng(south, east),
    ne: L.latLng(north, east),
    nw: L.latLng(north, west),
  }
}

function resizeGeofenceBounds(
  bounds: GeofenceBounds,
  corner: BoundsCorner,
  lat: number,
  lng: number,
): GeofenceBounds {
  const south = parseCoord(bounds.south_latitude)!
  const north = parseCoord(bounds.north_latitude)!
  const west = parseCoord(bounds.west_longitude)!
  const east = parseCoord(bounds.east_longitude)!
  switch (corner) {
    case 'sw':
      return latLngBoundsToGeofenceBounds(
        L.latLngBounds(
          L.latLng(Math.min(lat, north - MIN_BOUNDS_SPAN), Math.min(lng, east - MIN_BOUNDS_SPAN)),
          L.latLng(north, east),
        ),
      )
    case 'se':
      return latLngBoundsToGeofenceBounds(
        L.latLngBounds(
          L.latLng(Math.min(lat, north - MIN_BOUNDS_SPAN), west),
          L.latLng(north, Math.max(lng, west + MIN_BOUNDS_SPAN)),
        ),
      )
    case 'ne':
      return latLngBoundsToGeofenceBounds(
        L.latLngBounds(
          L.latLng(south, west),
          L.latLng(Math.max(lat, south + MIN_BOUNDS_SPAN), Math.max(lng, west + MIN_BOUNDS_SPAN)),
        ),
      )
    case 'nw':
      return latLngBoundsToGeofenceBounds(
        L.latLngBounds(
          L.latLng(Math.max(lat, south + MIN_BOUNDS_SPAN), Math.min(lng, east - MIN_BOUNDS_SPAN)),
          L.latLng(north, east),
        ),
      )
  }
}

function translateGeofenceBounds(bounds: GeofenceBounds, dLat: number, dLng: number): GeofenceBounds {
  const south = parseCoord(bounds.south_latitude)!
  const north = parseCoord(bounds.north_latitude)!
  const west = parseCoord(bounds.west_longitude)!
  const east = parseCoord(bounds.east_longitude)!
  return {
    south_latitude: south + dLat,
    north_latitude: north + dLat,
    west_longitude: west + dLng,
    east_longitude: east + dLng,
  }
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

function MapResizeObserver() {
  const map = useMap()
  useEffect(() => {
    const viewport = map.getContainer().parentElement
    if (!viewport) return
    const ro = new ResizeObserver(() => map.invalidateSize())
    ro.observe(viewport)
    return () => ro.disconnect()
  }, [map])
  return null
}

function FitGeofenceBounds({
  bounds,
  skipFitRef,
}: {
  bounds: GeofenceBounds
  skipFitRef: MutableRefObject<boolean>
}) {
  const map = useMap()
  useEffect(() => {
    if (skipFitRef.current) {
      skipFitRef.current = false
      return
    }
    if (!hasCompleteGeofenceBounds(bounds)) return
    map.fitBounds(geofenceBoundsToLatLngBounds(bounds), {
      padding: [24, 24],
      maxZoom: 14,
      animate: true,
    })
  }, [map, bounds.south_latitude, bounds.north_latitude, bounds.west_longitude, bounds.east_longitude, skipFitRef])
  return null
}

function EditableGeofenceRectangle({
  bounds,
  onChange,
  disabled,
  skipFitRef,
}: {
  bounds: GeofenceBounds
  onChange: (bounds: GeofenceBounds) => void
  disabled?: boolean
  skipFitRef: MutableRefObject<boolean>
}) {
  const map = useMap()
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const boundsRef = useRef(bounds)
  boundsRef.current = bounds
  const layersRef = useRef<{
    rectangle: L.Rectangle
    markers: Record<BoundsCorner, L.Marker>
  } | null>(null)
  const moveRef = useRef<{ lat: number; lng: number; bounds: GeofenceBounds } | null>(null)
  const resizingCornerRef = useRef<BoundsCorner | null>(null)

  const syncLayers = useCallback((next: GeofenceBounds) => {
    const layers = layersRef.current
    if (!layers || !hasCompleteGeofenceBounds(next)) return
    const llBounds = geofenceBoundsToLatLngBounds(next)
    layers.rectangle.setBounds(llBounds)
    const corners = cornerPositions(next)
    ;(Object.keys(corners) as BoundsCorner[]).forEach((corner) => {
      layers.markers[corner].setLatLng(corners[corner])
    })
  }, [])

  const applyBounds = useCallback(
    (next: GeofenceBounds, fromDrag = true) => {
      if (!hasCompleteGeofenceBounds(next)) return
      if (fromDrag) skipFitRef.current = true
      syncLayers(next)
      onChangeRef.current(next)
    },
    [skipFitRef, syncLayers],
  )

  useEffect(() => {
    if (disabled || !hasCompleteGeofenceBounds(bounds)) return

    const rectangle = L.rectangle(geofenceBoundsToLatLngBounds(bounds), {
      color: 'var(--primary)',
      weight: 2,
      fillColor: 'var(--primary)',
      fillOpacity: 0.12,
      className: 'geofence-bounds-map-picker__zone-rect',
    }).addTo(map)

    const markers = {} as Record<BoundsCorner, L.Marker>
    const corners = cornerPositions(bounds)
    ;(Object.keys(corners) as BoundsCorner[]).forEach((corner) => {
      const marker = L.marker(corners[corner], {
        icon: resizeHandleIcon,
        draggable: true,
        zIndexOffset: 1200,
        riseOnHover: true,
      }).addTo(map)

      marker.on('dragstart', () => {
        resizingCornerRef.current = corner
        skipFitRef.current = true
        map.dragging.disable()
        const el = marker.getElement()
        if (el) L.DomEvent.disableClickPropagation(el)
      })
      marker.on('drag', () => {
        const pos = marker.getLatLng()
        applyBounds(resizeGeofenceBounds(boundsRef.current, corner, pos.lat, pos.lng))
      })
      marker.on('dragend', () => {
        resizingCornerRef.current = null
        map.dragging.enable()
        skipFitRef.current = true
      })

      markers[corner] = marker
    })

    const onMove = (e: L.LeafletMouseEvent) => {
      const move = moveRef.current
      if (!move) return
      const dLat = e.latlng.lat - move.lat
      const dLng = e.latlng.lng - move.lng
      applyBounds(translateGeofenceBounds(move.bounds, dLat, dLng))
    }

    const onMoveEnd = () => {
      if (!moveRef.current) return
      moveRef.current = null
      map.dragging.enable()
      skipFitRef.current = true
    }

    rectangle.on('mousedown', (e: L.LeafletMouseEvent) => {
      if (disabled) return
      L.DomEvent.stopPropagation(e)
      skipFitRef.current = true
      map.dragging.disable()
      moveRef.current = {
        lat: e.latlng.lat,
        lng: e.latlng.lng,
        bounds: boundsRef.current,
      }
    })

    map.on('mousemove', onMove)
    map.on('mouseup', onMoveEnd)

    layersRef.current = { rectangle, markers }

    return () => {
      map.off('mousemove', onMove)
      map.off('mouseup', onMoveEnd)
      rectangle.remove()
      ;(Object.keys(markers) as BoundsCorner[]).forEach((corner) => markers[corner].remove())
      layersRef.current = null
      moveRef.current = null
    }
  }, [map, disabled, applyBounds, skipFitRef])

  useEffect(() => {
    if (moveRef.current || resizingCornerRef.current) return
    syncLayers(bounds)
  }, [bounds, syncLayers])

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

function FlyToPendingCorner({ corner }: { corner: { lat: number; lng: number } | null }) {
  const map = useMap()
  useEffect(() => {
    if (!corner) return
    map.flyTo([corner.lat, corner.lng], Math.max(map.getZoom(), MAP_SEARCH_ZOOM), { duration: 0.35 })
  }, [map, corner?.lat, corner?.lng])
  return null
}

function BoundsClickHandler({
  disabled,
  onCorner,
}: {
  disabled?: boolean
  onCorner: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (disabled) return
      onCorner(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function BoundsPreviewHandler({
  disabled,
  pendingCorner,
  onPreview,
}: {
  disabled?: boolean
  pendingCorner: { lat: number; lng: number } | null
  onPreview: (point: { lat: number; lng: number } | null) => void
}) {
  useMapEvents({
    mousemove(e) {
      if (disabled || !pendingCorner) return
      onPreview({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
    mouseout() {
      if (disabled || !pendingCorner) return
      onPreview(null)
    },
  })
  return null
}

type GeofenceBoundsMapPickerProps = {
  bounds: GeofenceBounds
  onChange: (bounds: GeofenceBounds) => void
  disabled?: boolean
  mapHeight?: number
}

export function GeofenceBoundsMapPicker({
  bounds,
  onChange,
  disabled = false,
  mapHeight = 260,
}: GeofenceBoundsMapPickerProps) {
  const { t } = useTranslation()
  const [pendingCorner, setPendingCorner] = useState<{ lat: number; lng: number } | null>(null)
  const [previewCorner, setPreviewCorner] = useState<{ lat: number; lng: number } | null>(null)
  const [searchFlyTarget, setSearchFlyTarget] = useState<{ lat: number; lng: number; key: number } | null>(
    null,
  )
  const [searchedPin, setSearchedPin] = useState<GeofenceSearchPoint | null>(null)
  const skipFitRef = useRef(false)

  useEffect(() => {
    if (!hasCompleteGeofenceBounds(bounds)) return
    setPendingCorner(null)
    setPreviewCorner(null)
  }, [bounds.south_latitude, bounds.north_latitude, bounds.west_longitude, bounds.east_longitude])

  useEffect(() => {
    if (!pendingCorner) setPreviewCorner(null)
  }, [pendingCorner])

  const complete = hasCompleteGeofenceBounds(bounds)
  const rectangleBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (!complete) return null
    const south = parseCoord(bounds.south_latitude)!
    const north = parseCoord(bounds.north_latitude)!
    const west = parseCoord(bounds.west_longitude)!
    const east = parseCoord(bounds.east_longitude)!
    return [
      [south, west],
      [north, east],
    ]
  }, [bounds, complete])

  const previewRectangleBounds = useMemo((): [[number, number], [number, number]] | null => {
    if (!pendingCorner || !previewCorner) return null
    const next = boundsFromCorners(
      pendingCorner.lat,
      pendingCorner.lng,
      previewCorner.lat,
      previewCorner.lng,
    )
    if (!hasCompleteGeofenceBounds(next)) return null
    const south = parseCoord(next.south_latitude)!
    const north = parseCoord(next.north_latitude)!
    const west = parseCoord(next.west_longitude)!
    const east = parseCoord(next.east_longitude)!
    return [
      [south, west],
      [north, east],
    ]
  }, [pendingCorner, previewCorner])

  const statusMessage = pendingCorner
    ? t('serviceGeofences.form.mapStep2')
    : complete
      ? t('serviceGeofences.form.mapComplete')
      : t('serviceGeofences.form.mapStep1')

  const handleCorner = useCallback(
    (lat: number, lng: number) => {
      if (disabled) return
      if (pendingCorner == null) {
        setSearchedPin(null)
        setPendingCorner({ lat, lng })
        onChange({
          south_latitude: '',
          north_latitude: '',
          west_longitude: '',
          east_longitude: '',
        })
        return
      }
      const next = boundsFromCorners(pendingCorner.lat, pendingCorner.lng, lat, lng)
      if (
        parseCoord(next.west_longitude)! >= parseCoord(next.east_longitude)! ||
        parseCoord(next.south_latitude)! >= parseCoord(next.north_latitude)!
      ) {
        setPendingCorner({ lat, lng })
        onChange({
          south_latitude: '',
          north_latitude: '',
          west_longitude: '',
          east_longitude: '',
        })
        return
      }
      setPendingCorner(null)
      setSearchedPin(null)
      onChange(next)
    },
    [disabled, onChange, pendingCorner],
  )

  const clearBounds = useCallback(() => {
    setPendingCorner(null)
    setPreviewCorner(null)
    setSearchedPin(null)
    onChange({
      south_latitude: '',
      north_latitude: '',
      west_longitude: '',
      east_longitude: '',
    })
  }, [onChange])

  const handleFromOnlySearch = useCallback(
    (point: GeofenceSearchPoint) => {
      setSearchedPin(null)
      setPendingCorner({ lat: point.lat, lng: point.lng })
      setPreviewCorner(null)
      onChange({
        south_latitude: '',
        north_latitude: '',
        west_longitude: '',
        east_longitude: '',
      })
      setSearchFlyTarget({ lat: point.lat, lng: point.lng, key: Date.now() })
    },
    [onChange],
  )

  const handleBoundsFromSearch = useCallback(
    (next: GeofenceBounds) => {
      setPendingCorner(null)
      setPreviewCorner(null)
      setSearchedPin(null)
      onChange(next)
    },
    [onChange],
  )

  const handleToOnlySearch = useCallback(
    (point: GeofenceSearchPoint) => {
      setPendingCorner(null)
      setPreviewCorner(null)
      setSearchedPin(point)
      onChange({
        south_latitude: '',
        north_latitude: '',
        west_longitude: '',
        east_longitude: '',
      })
      setSearchFlyTarget({ lat: point.lat, lng: point.lng, key: Date.now() })
    },
    [onChange],
  )

  const center: [number, number] = complete
    ? [
        (parseCoord(bounds.south_latitude)! + parseCoord(bounds.north_latitude)!) / 2,
        (parseCoord(bounds.west_longitude)! + parseCoord(bounds.east_longitude)!) / 2,
      ]
    : pendingCorner
      ? [pendingCorner.lat, pendingCorner.lng]
      : MAP_INIT_CENTER
  const zoom = complete || pendingCorner ? 12 : MAP_INIT_ZOOM

  return (
    <div
      className="geofence-bounds-map-picker"
      style={{ ['--location-map-height' as string]: `${mapHeight}px` }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <p className="geofence-bounds-map-picker__hint">{t('serviceGeofences.form.mapHint')}</p>
      <GeofenceBoundsLocationSearch
        disabled={disabled}
        onFromOnly={handleFromOnlySearch}
        onBoundsFromSearch={handleBoundsFromSearch}
        onToOnly={handleToOnlySearch}
      />
      <div className="geofence-bounds-map-picker__viewport">
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
          <FlyToPendingCorner corner={pendingCorner} />
          <FitGeofenceBounds bounds={bounds} skipFitRef={skipFitRef} />
          <BoundsClickHandler disabled={disabled || complete} onCorner={handleCorner} />
          <BoundsPreviewHandler
            disabled={disabled}
            pendingCorner={pendingCorner}
            onPreview={setPreviewCorner}
          />
          {pendingCorner ? (
            <Marker position={[pendingCorner.lat, pendingCorner.lng]} icon={startCornerIcon}>
              <Tooltip permanent direction="top" offset={[0, -14]} className="geofence-bounds-map-picker__corner-tooltip">
                {t('serviceGeofences.form.mapCornerStart')}
              </Tooltip>
            </Marker>
          ) : null}
          {searchedPin ? (
            <Marker position={[searchedPin.lat, searchedPin.lng]} icon={endCornerIcon}>
              <Tooltip permanent direction="top" offset={[0, -14]} className="geofence-bounds-map-picker__corner-tooltip">
                {t('serviceGeofences.form.mapCornerTo')}
              </Tooltip>
            </Marker>
          ) : null}
          {previewRectangleBounds ? (
            <Rectangle
              bounds={previewRectangleBounds}
              pathOptions={{
                color: 'var(--primary)',
                weight: 2,
                dashArray: '7 5',
                fillColor: 'var(--primary)',
                fillOpacity: 0.08,
              }}
            />
          ) : null}
          {rectangleBounds && !disabled ? (
            <EditableGeofenceRectangle
              bounds={bounds}
              onChange={onChange}
              disabled={disabled}
              skipFitRef={skipFitRef}
            />
          ) : rectangleBounds ? (
            <Rectangle
              bounds={rectangleBounds}
              pathOptions={{
                color: 'var(--primary)',
                weight: 2,
                fillColor: 'var(--primary)',
                fillOpacity: 0.12,
              }}
            />
          ) : null}
        </MapContainer>
      </div>
      <div className="geofence-bounds-map-picker__toolbar">
        <span className="geofence-bounds-map-picker__status" aria-live="polite">
          {statusMessage}
        </span>
        {(complete || pendingCorner || searchedPin) && !disabled ? (
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearBounds}>
            {t('serviceGeofences.form.clearBounds')}
          </button>
        ) : null}
      </div>
      <p className="geofence-bounds-map-picker__summary">
        <span className="geofence-bounds-map-picker__summary-label">{t('serviceGeofences.form.boundsSummary')}</span>
        <code>{formatBoundsSummary(bounds)}</code>
      </p>
    </div>
  )
}
