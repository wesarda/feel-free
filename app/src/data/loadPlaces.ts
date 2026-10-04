import type { CityConfig } from '../cities/types.ts'
import type { Amenity, Place } from '../core/types.ts'
import { amenitiesFromOsm, placesFromOsm, placesQuery } from './osm.ts'
import { SourceUnavailableError, overpass } from './overpass.ts'
import type { SourceState } from './status.ts'

/** Normalised places as stored in the browser cache and in the prebuilt snapshot file. */
export type PlacesSnapshot = {
  city: string
  /** When the copy was fetched from OpenStreetMap. */
  fetchedAt: string
  /** OpenStreetMap database timestamp reported by Overpass. */
  osmBase?: string
  endpoint?: string
  places: Place[]
  /** Benches, disabled parking, elevators; missing in copies made before they were added. */
  amenities?: Amenity[]
}

export type PlacesLoad = {
  state: SourceState
  places: Place[]
  amenities?: Amenity[]
  fetchedAt?: string
  osmBase?: string
  detail?: string
}

const CACHE = 'kbb-osm-v1'
const cacheKey = (city: string) => `/__kbb-cache/${city}-places.json`

async function saveToCache(snapshot: PlacesSnapshot) {
  try {
    const cache = await caches.open(CACHE)
    await cache.put(cacheKey(snapshot.city), new Response(JSON.stringify(snapshot), { headers: { 'Content-Type': 'application/json' } }))
  } catch {
    // Cache Storage needs a secure context; without it we simply have no offline copy
  }
}

async function readCache(city: string): Promise<PlacesSnapshot | null> {
  try {
    const cache = await caches.open(CACHE)
    const response = await cache.match(cacheKey(city))
    return response ? ((await response.json()) as PlacesSnapshot) : null
  } catch {
    return null
  }
}

async function readSnapshot(city: CityConfig, signal?: AbortSignal): Promise<PlacesSnapshot | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${city.snapshotUrl}`, { signal })
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null
    const data = (await response.json()) as PlacesSnapshot
    return Array.isArray(data.places) ? data : null
  } catch {
    return null
  }
}

const newer = (a: PlacesSnapshot | null, b: PlacesSnapshot | null) =>
  !a ? b : !b ? a : Date.parse(a.fetchedAt) >= Date.parse(b.fetchedAt) ? a : b

/** The newest saved copy, shown while the live request runs (it can take a minute on a busy server). */
export async function loadSavedPlaces(city: CityConfig, signal?: AbortSignal): Promise<PlacesSnapshot | null> {
  return newer(await readCache(city.id), await readSnapshot(city, signal))
}

/**
 * Live OpenStreetMap first; if it is unavailable, the newest saved copy (browser cache or the
 * nightly snapshot); if there is none, nothing — the UI then says so instead of pretending.
 */
export async function loadOsmPlaces(
  city: CityConfig,
  { signal, simulateOutage = false }: { signal?: AbortSignal; simulateOutage?: boolean } = {},
): Promise<PlacesLoad> {
  try {
    if (simulateOutage) throw new SourceUnavailableError(['simulated outage (demo)'])
    const { data, endpoint } = await overpass(placesQuery(city.bbox), { signal })
    const snapshot: PlacesSnapshot = {
      city: city.id,
      fetchedAt: new Date().toISOString(),
      osmBase: data.osm3s?.timestamp_osm_base,
      endpoint,
      places: placesFromOsm(data),
      amenities: amenitiesFromOsm(data),
    }
    void saveToCache(snapshot)
    return { state: 'live', places: snapshot.places, amenities: snapshot.amenities, fetchedAt: snapshot.fetchedAt, osmBase: snapshot.osmBase }
  } catch (error) {
    if (signal?.aborted) throw error
    const detail = error instanceof SourceUnavailableError ? error.attempts.join('; ') : String(error)
    const saved = await loadSavedPlaces(city, signal)
    if (saved)
      return { state: 'cached', places: saved.places, amenities: saved.amenities ?? [], fetchedAt: saved.fetchedAt, osmBase: saved.osmBase, detail }
    return { state: 'unavailable', places: [], detail }
  }
}
