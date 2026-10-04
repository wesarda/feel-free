import type { CityConfig } from '../cities/types.ts'
import { bboxAround, bboxContains, type BBox } from '../core/geo.ts'
import { buildGraph, type Graph, type OsmElement } from '../core/route/graph.ts'
import type { LngLat } from '../core/types.ts'
import { SourceUnavailableError, overpass } from './overpass.ts'

const HIGHWAYS =
  'footway|pedestrian|path|steps|living_street|residential|service|unclassified|tertiary|tertiary_link|secondary|secondary_link|primary|primary_link|cycleway|track|corridor|platform|bridleway|road'

/** Walkable ways with geometry, the accessibility-relevant nodes on them, and benches/toilets/elevators. */
export function networkQuery(bbox: BBox): string {
  return `[out:json][timeout:90][bbox:${bbox.join(',')}];
way[highway~"^(${HIGHWAYS})$"];
out meta geom qt;
node(w)[~"^(kerb|kerb:height|barrier|highway|crossing|wheelchair)$"~"."];
out meta qt;
(
  node[amenity=bench];
  node[leisure=picnic_table];
  nwr[amenity=toilets];
);
out meta center qt;`
}

/** Raw network as saved by the data pipeline (`npm run data:fetch`). */
export type NetworkSnapshot = { city: string; fetchedAt: string; bbox: BBox; elements: OsmElement[] }

export type NetworkLoad =
  | { state: 'live' | 'cached'; graph: Graph; fetchedAt: string; detail?: string }
  | { state: 'unavailable'; detail: string }

/** How long a route waits for live data when the saved copy covers it; public Overpass servers are often busy. */
const LIVE_LIMIT_WITH_COPY_MS = 2500
/** After live data did not come, routes inside the saved area use the copy at once for this long instead of waiting again. */
const RETRY_LIVE_AFTER_MS = 120000
let liveFailed: { at: number; detail: string } | null = null

/** The user asked to try again: the next route asks the live servers whatever happened before. */
export function retryLiveNetwork(): void {
  liveFailed = null
}

const memory: { bbox: BBox; graph: Graph; fetchedAt: string; state: 'live' | 'cached' }[] = []
const snapshots = new Map<string, Promise<NetworkSnapshot | null>>()

/** Read once per city, and only when live data did not come: the file is about 10 MB. */
function readSnapshot(city: CityConfig): Promise<NetworkSnapshot | null> {
  let snapshot = snapshots.get(city.id)
  if (!snapshot) {
    snapshot = fetchSnapshot(city)
    snapshots.set(city.id, snapshot)
  }
  return snapshot
}

async function fetchSnapshot(city: CityConfig): Promise<NetworkSnapshot | null> {
  if (!city.networkSnapshotUrl) return null
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${city.networkSnapshotUrl}`)
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null
    const data = (await response.json()) as NetworkSnapshot
    return Array.isArray(data.elements) ? data : null
  } catch {
    return null
  }
}

/** Footway network around two points: live from OpenStreetMap, else a saved copy covering the area. */
export async function loadNetwork(
  city: CityConfig,
  from: LngLat,
  to: LngLat,
  { signal, simulateOutage = false }: { signal?: AbortSignal; simulateOutage?: boolean } = {},
): Promise<NetworkLoad> {
  const bbox = bboxAround([from, to], 350)
  // The data pipeline saves the network for this area, so the config tells whether the copy covers
  // the route without downloading it
  const savedArea = city.networkSnapshotUrl ? (city.networkBbox ?? city.bbox) : null
  const covered = savedArea !== null && bboxContains(savedArea, bbox)
  // The servers did not answer a moment ago: no point making every next route wait for them again
  const waited = covered && liveFailed !== null && Date.now() - liveFailed.at < RETRY_LIVE_AFTER_MS ? liveFailed : null
  const offline = simulateOutage || waited !== null

  const reuse = memory.find((m) => bboxContains(m.bbox, bbox) && (m.state === 'live' ? !simulateOutage : offline))
  if (reuse) return { state: reuse.state, graph: reuse.graph, fetchedAt: reuse.fetchedAt, detail: reuse.state === 'cached' ? waited?.detail : undefined }

  let detail = ''
  if (simulateOutage) {
    detail = 'simulated outage (demo)'
  } else if (waited) {
    detail = waited.detail
  } else {
    try {
      const { data } = await overpass(networkQuery(bbox), { signal, deadlineMs: covered ? LIVE_LIMIT_WITH_COPY_MS : undefined })
      const entry = { bbox, graph: buildGraph(data.elements), fetchedAt: new Date().toISOString(), state: 'live' as const }
      memory.push(entry)
      liveFailed = null
      return { state: 'live', graph: entry.graph, fetchedAt: entry.fetchedAt }
    } catch (error) {
      if (signal?.aborted) throw error
      detail = error instanceof SourceUnavailableError ? error.attempts.join('; ') : String(error)
      liveFailed = { at: Date.now(), detail }
    }
  }

  const snapshot = covered ? await readSnapshot(city) : null
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  if (snapshot && bboxContains(snapshot.bbox, bbox)) {
    const entry = { bbox: snapshot.bbox, graph: buildGraph(snapshot.elements), fetchedAt: snapshot.fetchedAt, state: 'cached' as const }
    memory.push(entry)
    return { state: 'cached', graph: entry.graph, fetchedAt: entry.fetchedAt, detail }
  }
  return { state: 'unavailable', detail }
}
