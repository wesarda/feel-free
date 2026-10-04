import { CITIES } from '../cities/krakow.ts'
import type { Place } from '../core/types.ts'
import { mergeSample } from './merge.ts'
import { placesFromOsm } from './osm.ts'
import type { OverpassElement } from './overpass.ts'
import { samplePlaces } from './sample.ts'
import { fetchStop } from './ztp.ts'

const OSM_API = 'https://api.openstreetmap.org/api/0.6'

export type SinglePlaceLoad = { state: 'ok'; place: Place } | { state: 'not-found' } | { state: 'unavailable' }

/**
 * One place by id, for the embeddable card: reads the element straight from the OpenStreetMap API
 * (fast, includes the building's entrances), so a hotel page does not load the whole city.
 * A public transport stop is read the same way from the city's open layer.
 */
export async function loadSinglePlace(id: string, signal?: AbortSignal): Promise<SinglePlaceLoad> {
  const sample = samplePlaces.find((p) => p.id === id)
  if (sample) return { state: 'ok', place: sample }
  const stop = id.match(/^ztp-([\w-]+)$/)
  if (stop) {
    try {
      for (const city of Object.values(CITIES)) {
        const place = city.stops ? await fetchStop(city.stops.serviceUrl, stop[1], signal) : null
        if (place) return { state: 'ok', place }
      }
      return { state: 'not-found' }
    } catch {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
      return { state: 'unavailable' }
    }
  }
  const m = id.match(/^osm-(node|way)-(\d+)$/)
  if (!m) return { state: 'not-found' }
  const [, type, osmId] = m
  try {
    const url = type === 'node' ? `${OSM_API}/node/${osmId}.json` : `${OSM_API}/way/${osmId}/full.json`
    const response = await fetch(url, { signal })
    if (response.status === 404 || response.status === 410) return { state: 'not-found' }
    if (!response.ok) return { state: 'unavailable' }
    const { elements } = (await response.json()) as { elements: OverpassElement[] }
    const main = elements.find((e) => e.type === type && e.id === Number(osmId))
    if (!main) return { state: 'not-found' }
    if (type === 'way') {
      const nodes = elements.filter((e) => e.type === 'node' && e.lat !== undefined)
      main.center = {
        lat: nodes.reduce((s, n) => s + n.lat!, 0) / Math.max(1, nodes.length),
        lon: nodes.reduce((s, n) => s + n.lon!, 0) / Math.max(1, nodes.length),
      }
    }
    const place = mergeSample(placesFromOsm({ elements }), samplePlaces).find((p) => p.id === id)
    return place ? { state: 'ok', place } : { state: 'not-found' }
  } catch {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    return { state: 'unavailable' }
  }
}
