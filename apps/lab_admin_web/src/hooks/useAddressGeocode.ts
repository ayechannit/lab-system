import { useEffect, useState } from 'react'
import i18n from '../i18n'
import { nominatimSearch } from '../services/nominatimGeocode'

export const ADDRESS_GEOCODE_DEBOUNCE_MS = 900
export const ADDRESS_GEOCODE_MIN_LEN = 4

export type UseAddressGeocodeOptions = {
  /** When false, geocoding is paused (e.g. modal closed). */
  enabled?: boolean
  address: string
  onCoords: (lat: number, lng: number) => void
  /** Skip lookup while address matches loaded baseline (edit forms). */
  baselineAddress?: string
  minLength?: number
  debounceMs?: number
}

/**
 * Debounced forward geocode: typed address → latitude/longitude for map + save.
 */
export function useAddressGeocode({
  enabled = true,
  address,
  onCoords,
  baselineAddress,
  minLength = ADDRESS_GEOCODE_MIN_LEN,
  debounceMs = ADDRESS_GEOCODE_DEBOUNCE_MS,
}: UseAddressGeocodeOptions): string | null {
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) {
      setHint(null)
      return
    }

    const trimmed = address.trim()
    if (trimmed.length < minLength) {
      setHint(null)
      return
    }

    if (baselineAddress != null && trimmed === baselineAddress.trim()) {
      setHint(null)
      return
    }

    let alive = true
    const ac = new AbortController()
    const timer = window.setTimeout(() => {
      setHint(i18n.t('locationMap.lookingUpAddress'))
      void (async () => {
        try {
          const hit = await nominatimSearch(trimmed, ac.signal)
          if (!alive || ac.signal.aborted) return
          if (hit) {
            onCoords(hit.lat, hit.lng)
            setHint(null)
          } else {
            setHint(i18n.t('locationMap.noAddressMatch'))
          }
        } catch {
          if (!alive || ac.signal.aborted) return
          setHint(i18n.t('locationMap.geocodeFailed'))
        }
      })()
    }, debounceMs)

    return () => {
      alive = false
      ac.abort()
      window.clearTimeout(timer)
    }
  }, [enabled, address, baselineAddress, minLength, debounceMs, onCoords])

  return hint
}
