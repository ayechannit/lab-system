import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nominatimSearch } from '../../services/nominatimGeocode'
import type { GeofenceBounds } from './GeofenceBoundsMapPicker'

function parseCoord(v: number | ''): number | null {
  if (v === '') return null
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}

export type GeofenceSearchPoint = {
  lat: number
  lng: number
  label: string
}

type GeofenceBoundsLocationSearchProps = {
  disabled?: boolean
  onFromOnly: (point: GeofenceSearchPoint) => void
  onBoundsFromSearch: (bounds: GeofenceBounds) => void
  onToOnly: (point: GeofenceSearchPoint) => void
}

function boundsFromPoints(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): GeofenceBounds {
  return {
    south_latitude: Math.min(a.lat, b.lat),
    north_latitude: Math.max(a.lat, b.lat),
    west_longitude: Math.min(a.lng, b.lng),
    east_longitude: Math.max(a.lng, b.lng),
  }
}

export function GeofenceBoundsLocationSearch({
  disabled = false,
  onFromOnly,
  onBoundsFromSearch,
  onToOnly,
}: GeofenceBoundsLocationSearchProps) {
  const { t } = useTranslation()
  const [fromQuery, setFromQuery] = useState('')
  const [toQuery, setToQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runApply = useCallback(async () => {
    const fromTrim = fromQuery.trim()
    const toTrim = toQuery.trim()

    if (!fromTrim && !toTrim) {
      setMessage(t('serviceGeofences.form.searchNeedFromOrTo'))
      return
    }

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setLoading(true)
    setMessage(null)

    try {
      if (fromTrim && toTrim) {
        const [fromHit, toHit] = await Promise.all([
          nominatimSearch(fromTrim, ac.signal),
          nominatimSearch(toTrim, ac.signal),
        ])
        if (ac.signal.aborted) return
        if (!fromHit) {
          setMessage(t('serviceGeofences.form.searchFromNotFound'))
          return
        }
        if (!toHit) {
          setMessage(t('serviceGeofences.form.searchToNotFound'))
          return
        }
        const next = boundsFromPoints(fromHit, toHit)
        if (
          parseCoord(next.west_longitude) == null ||
          parseCoord(next.east_longitude) == null ||
          parseCoord(next.south_latitude) == null ||
          parseCoord(next.north_latitude) == null ||
          parseCoord(next.west_longitude)! >= parseCoord(next.east_longitude)! ||
          parseCoord(next.south_latitude)! >= parseCoord(next.north_latitude)!
        ) {
          setMessage(t('serviceGeofences.form.searchSamePoint'))
          return
        }
        onBoundsFromSearch(next)
        return
      }

      if (fromTrim) {
        const fromHit = await nominatimSearch(fromTrim, ac.signal)
        if (ac.signal.aborted) return
        if (!fromHit) {
          setMessage(t('serviceGeofences.form.searchFromNotFound'))
          return
        }
        onFromOnly({ lat: fromHit.lat, lng: fromHit.lng, label: fromTrim })
        return
      }

      const toHit = await nominatimSearch(toTrim, ac.signal)
      if (ac.signal.aborted) return
      if (!toHit) {
        setMessage(t('serviceGeofences.form.searchToNotFound'))
        return
      }
      onToOnly({ lat: toHit.lat, lng: toHit.lng, label: toTrim })
    } catch {
      if (ac.signal.aborted) return
      setMessage(t('locationMap.geocodeFailed'))
    } finally {
      if (!ac.signal.aborted) setLoading(false)
    }
  }, [fromQuery, onBoundsFromSearch, onFromOnly, onToOnly, t, toQuery])

  function handleApplyClick() {
    if (disabled || loading) return
    void runApply()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    handleApplyClick()
  }

  const canApply =
    !disabled &&
    !loading &&
    (fromQuery.trim().length >= 4 || toQuery.trim().length >= 4)

  return (
    <div className="geofence-bounds-location-search" role="search" onMouseDown={(e) => e.stopPropagation()}>
      <div className="geofence-bounds-location-search__fields">
        <div className="field geofence-bounds-location-search__field">
          <label htmlFor="geofence-search-from">{t('serviceGeofences.form.searchFrom')}</label>
          <input
            id="geofence-search-from"
            type="search"
            className="geofence-bounds-location-search__input"
            value={fromQuery}
            onChange={(e) => {
              setFromQuery(e.target.value)
              if (message) setMessage(null)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            autoComplete="off"
          />
        </div>
        <div className="field geofence-bounds-location-search__field">
          <label htmlFor="geofence-search-to">{t('serviceGeofences.form.searchTo')}</label>
          <input
            id="geofence-search-to"
            type="search"
            className="geofence-bounds-location-search__input"
            value={toQuery}
            onChange={(e) => {
              setToQuery(e.target.value)
              if (message) setMessage(null)
            }}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            autoComplete="off"
          />
        </div>
      </div>
      <div className="geofence-bounds-location-search__actions">
        <button
          type="button"
          className="btn btn-secondary geofence-bounds-location-search__button"
          disabled={!canApply}
          aria-busy={loading}
          onClick={handleApplyClick}
        >
          {loading ? t('locationMap.searching') : t('serviceGeofences.form.searchApply')}
        </button>
        <p className="geofence-bounds-location-search__hint">
          {t('serviceGeofences.form.searchHint')}
        </p>
      </div>
      {message ? (
        <p className="geofence-bounds-location-search__message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
