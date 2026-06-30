import { type KeyboardEvent, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { nominatimSearch } from '../../services/nominatimGeocode'

type MapLocationSearchProps = {
  onLocationFound: (lat: number, lng: number) => void
  disabled?: boolean
  className?: string
}

export function MapLocationSearch({
  onLocationFound,
  disabled = false,
  className,
}: MapLocationSearchProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const runSearch = useCallback(
    async (raw: string) => {
      const trimmed = raw.trim()
      if (trimmed.length < 4) {
        setMessage(t('locationMap.searchTooShort'))
        return
      }
      abortRef.current?.abort()
      const ac = new AbortController()
      abortRef.current = ac
      setLoading(true)
      setMessage(null)
      try {
        const hit = await nominatimSearch(trimmed, ac.signal)
        if (ac.signal.aborted) return
        if (hit) {
          onLocationFound(hit.lat, hit.lng)
          setMessage(null)
        } else {
          setMessage(t('locationMap.noAddressMatch'))
        }
      } catch {
        if (ac.signal.aborted) return
        setMessage(t('locationMap.geocodeFailed'))
      } finally {
        if (!ac.signal.aborted) setLoading(false)
      }
    },
    [onLocationFound, t],
  )

  function handleSearchClick() {
    if (disabled || loading) return
    void runSearch(query)
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()
    if (disabled || loading) return
    void runSearch(query)
  }

  return (
    <div className={['map-location-search', className].filter(Boolean).join(' ')}>
      <div className="map-location-search__form" role="search">
        <input
          type="search"
          className="map-location-search__input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (message) setMessage(null)
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={t('locationMap.searchPlaceholder')}
          disabled={disabled || loading}
          autoComplete="off"
          aria-label={t('locationMap.searchPlaceholder')}
        />
        <button
          type="button"
          className="btn btn-secondary map-location-search__button"
          disabled={disabled || loading || query.trim().length < 4}
          aria-busy={loading}
          onClick={handleSearchClick}
        >
          {loading ? t('locationMap.searching') : t('locationMap.search')}
        </button>
      </div>
      {message ? (
        <p className="map-location-search__message" role="status">
          {message}
        </p>
      ) : null}
    </div>
  )
}
