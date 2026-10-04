import { useEffect, useMemo, useState } from 'react'
import type { CityConfig } from '../cities/types'
import type { Amenity, Place } from '../core/types'
import { loadOsmPlaces, loadSavedPlaces, type PlacesLoad, type PlacesSnapshot } from './loadPlaces'
import { mergeSample } from './merge'
import { samplePlaces } from './sample'
import type { SourceStatus } from './status'
import { loadStops, type StopsLoad } from './ztp'

export type PlacesData = {
  places: Place[]
  amenities: Amenity[]
  osm: PlacesLoad
  statuses: SourceStatus[]
  retry: () => void
}

/** Combines live OpenStreetMap data (or its saved copy) with the city's own data and labelled sample data. */
export function usePlacesData(
  city: CityConfig,
  { simulateOutage, showSample }: { simulateOutage: boolean; showSample: boolean },
): PlacesData {
  const [attempt, setAttempt] = useState(0)
  const key = `${city.id}|${simulateOutage}|${attempt}`
  const [result, setResult] = useState<{ key: string; load: PlacesLoad } | null>(null)
  const [saved, setSaved] = useState<PlacesSnapshot | null>(null)
  const [stops, setStops] = useState<{ key: string; load: StopsLoad | null } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadSavedPlaces(city, controller.signal).then((copy) => {
      if (copy?.city === city.id) setSaved(copy)
    })
    loadOsmPlaces(city, { signal: controller.signal, simulateOutage })
      .then((load) => setResult({ key, load }))
      .catch(() => {
        // aborted: a newer request replaced this one
      })
    loadStops(city, { signal: controller.signal, simulateOutage })
      .then((load) => setStops({ key, load }))
      .catch(() => {
        // aborted
      })
    return () => controller.abort()
  }, [city, simulateOutage, key])

  // While a new request runs, keep showing the previous places, or the saved copy on first load
  const osm: PlacesLoad = useMemo(() => {
    if (result?.key === key) return result.load
    if (result?.load.places.length)
      return { places: result.load.places, amenities: result.load.amenities, fetchedAt: result.load.fetchedAt, osmBase: result.load.osmBase, state: 'loading' }
    if (saved?.city === city.id)
      return { places: saved.places, amenities: saved.amenities, fetchedAt: saved.fetchedAt, osmBase: saved.osmBase, state: 'loading' }
    return { places: [], state: 'loading' }
  }, [result, key, saved, city.id])

  // Sample data complements real places. Until the first of them arrive it stays out: alone it would
  // flash as a list of ten sample places on every reload.
  const waiting = osm.state === 'loading' && osm.places.length === 0
  // The city's stops join them the same way: next to the places, never as a list of their own
  const stopPlaces = stops?.load?.places
  const places = useMemo(
    () => (waiting ? [] : [...mergeSample(osm.places, showSample ? samplePlaces : []), ...(stopPlaces ?? [])]),
    [osm.places, showSample, waiting, stopPlaces],
  )
  const ztp: SourceStatus | null = useMemo(() => {
    if (!city.stops) return null
    if (stops?.key !== key || !stops.load) return { source: 'ztp', state: 'loading' }
    const { state, fetchedAt, places: list, detail } = stops.load
    return { source: 'ztp', state, fetchedAt, count: list.length || undefined, detail }
  }, [city.stops, stops, key])

  const statuses: SourceStatus[] = useMemo(
    () => [
      { source: 'osm', state: osm.state, fetchedAt: osm.fetchedAt, count: osm.places.length || undefined, detail: osm.detail },
      ...(ztp ? [ztp] : []),
      { source: 'reports', state: 'local' },
      ...(showSample
        ? (['sample-owner', 'sample-audit', 'sample-community', 'sample-reports'] as const).map(
            (source): SourceStatus => ({ source, state: 'sample' }),
          )
        : []),
    ],
    [osm, ztp, showSample],
  )

  const amenities = useMemo(() => osm.amenities ?? [], [osm.amenities])

  return { places, amenities, osm, statuses, retry: () => setAttempt((n) => n + 1) }
}
