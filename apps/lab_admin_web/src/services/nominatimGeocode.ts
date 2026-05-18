/** Forward geocoding via OSM Nominatim (no API key). Respect their usage policy in production. */

export type GeocodeHit = { lat: number; lng: number }

type NominatimRow = { lat?: string; lon?: string }

export async function nominatimSearch(query: string, signal?: AbortSignal): Promise<GeocodeHit | null> {
  const q = query.trim()
  if (q.length < 4) return null

  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('q', q)

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'MedLabSmartAdmin/1.0 (lab_admin_web)',
    },
  })

  if (!res.ok) return null

  const data = (await res.json()) as NominatimRow[]
  if (!Array.isArray(data) || data.length === 0) return null

  const lat = Number.parseFloat(String(data[0].lat ?? ''))
  const lng = Number.parseFloat(String(data[0].lon ?? ''))
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  return { lat, lng }
}

/** Reverse geocoding: coordinates → single-line address (`display_name`). */
export async function nominatimReverse(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<string | null> {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null

  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('format', 'json')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))

  const res = await fetch(url.toString(), {
    signal,
    headers: {
      Accept: 'application/json',
      'Accept-Language': 'en',
      'User-Agent': 'MedLabSmartAdmin/1.0 (lab_admin_web)',
    },
  })

  if (!res.ok) return null

  const data = (await res.json()) as { display_name?: string }
  const line = typeof data.display_name === 'string' ? data.display_name.trim() : ''
  return line || null
}
