/*
 * Data pipeline: fetches open data, normalises it and writes static snapshot files that the app
 * falls back to when a live source is unavailable. Runs nightly in GitHub Actions or by hand:
 *
 *   npm run data:fetch            # Kraków
 *   npm run data:fetch -- krakow  # any city defined in src/cities
 *
 * A failing source never deletes the previous snapshot: the old file stays and meta.json records
 * the failure, so the app keeps showing the last good copy with its date.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { CITIES } from '../src/cities/krakow.ts'
import { coverage, type Coverage } from '../src/core/coverage.ts'
import type { OsmElement } from '../src/core/route/graph.ts'
import { networkQuery } from '../src/data/network.ts'
import { amenitiesFromOsm, placesFromOsm, placesQuery } from '../src/data/osm.ts'
import { overpass } from '../src/data/overpass.ts'
import { fetchStops } from '../src/data/ztp.ts'

type SourceRun = {
  id: string
  status: 'ok' | 'failed'
  fetchedAt?: string
  lastSuccess?: string
  count?: number
  endpoint?: string
  error?: string
  /** For places: how complete the data is (see docs/biznes.md, launching in a new city). */
  coverage?: Coverage
}

const USER_AGENT = 'FeelFree-data-pipeline/0.1 (+https://github.com/wesarda/feel-free)'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cityId = process.argv.slice(2).find((a) => !a.startsWith('-')) ?? 'krakow'
const city = CITIES[cityId]
if (!city) {
  console.error(`Unknown city "${cityId}". Known: ${Object.keys(CITIES).join(', ')}`)
  process.exit(2)
}
const outDir = join(root, 'public', 'data', city.id)

// Only what the app reads, to keep the snapshot small
const WAY_KEYS = new Set([
  'highway', 'footway', 'sidewalk', 'sidewalk:both', 'surface', 'smoothness', 'incline', 'width', 'est_width',
  'step_count', 'ramp', 'ramp:wheelchair', 'ramp:stroller', 'handrail', 'conveying', 'wheelchair', 'foot',
  'access', 'area', 'name', 'crossing', 'check_date', 'survey:date',
])
const NODE_KEYS = new Set([
  'kerb', 'kerb:height', 'barrier', 'highway', 'crossing', 'wheelchair', 'tactile_paving', 'amenity', 'leisure',
  'name', 'check_date', 'survey:date',
])

const pick = (tags: Record<string, string> | undefined, keys: Set<string>) =>
  Object.fromEntries(Object.entries(tags ?? {}).filter(([k]) => keys.has(k)))
const round = (n: number) => Math.round(n * 1e6) / 1e6

function slimNetwork(elements: OsmElement[]): OsmElement[] {
  return elements.map((el) => ({
    type: el.type,
    id: el.id,
    ...(el.lat !== undefined && el.lon !== undefined ? { lat: round(el.lat), lon: round(el.lon) } : {}),
    ...(el.center ? { center: { lat: round(el.center.lat), lon: round(el.center.lon) } } : {}),
    ...(el.nodes ? { nodes: el.nodes } : {}),
    ...(el.geometry ? { geometry: el.geometry.map((g) => ({ lat: round(g.lat), lon: round(g.lon) })) } : {}),
    tags: pick(el.tags, el.type === 'way' && el.nodes ? WAY_KEYS : NODE_KEYS),
    ...(el.timestamp ? { timestamp: el.timestamp.slice(0, 10) } : {}),
  }))
}

async function previousMeta(): Promise<Record<string, SourceRun>> {
  try {
    const meta = JSON.parse(await readFile(join(outDir, 'meta.json'), 'utf8')) as { sources: SourceRun[] }
    return Object.fromEntries(meta.sources.map((s) => [s.id, s]))
  } catch {
    return {}
  }
}

async function run(id: string, previous: SourceRun | undefined, task: () => Promise<Omit<SourceRun, 'id' | 'status'>>): Promise<SourceRun> {
  const started = Date.now()
  try {
    const result = await task()
    console.log(`✓ ${id}: ${result.count ?? 0} items in ${((Date.now() - started) / 1000).toFixed(1)} s`)
    return { id, status: 'ok', ...result, lastSuccess: result.fetchedAt }
  } catch (error) {
    console.error(`✗ ${id}: ${(error as Error).message}`)
    return { id, status: 'failed', error: (error as Error).message, lastSuccess: previous?.lastSuccess }
  }
}

await mkdir(outDir, { recursive: true })
const previous = await previousMeta()

const places = await run('osm-places', previous['osm-places'], async () => {
  const { data, endpoint } = await overpass(placesQuery(city.bbox), { timeoutMs: 180000, userAgent: USER_AGENT })
  const fetchedAt = new Date().toISOString()
  const list = placesFromOsm(data)
  const amenities = amenitiesFromOsm(data)
  await writeFile(
    join(outDir, 'places.json'),
    JSON.stringify({ city: city.id, fetchedAt, osmBase: data.osm3s?.timestamp_osm_base, endpoint, places: list, amenities }),
  )
  const stats = coverage(list, 'osm', new Date())
  const pct = (n: number) => `${Math.round((n / Math.max(1, stats.places)) * 100)}%`
  console.log(
    `  coverage: access info ${pct(stats.anyAccessInfo)}, steps ${pct(stats.steps)}, door width ${pct(stats.doorWidth)}, ` +
      `toilet ${pct(stats.toilet)}, changing table ${pct(stats.babyChanging)}, recent ${pct(stats.recent)}`,
  )
  return { fetchedAt, count: list.length, endpoint, coverage: stats }
})

const network = await run('osm-network', previous['osm-network'], async () => {
  const bbox = city.networkBbox ?? city.bbox
  const { data, endpoint } = await overpass(networkQuery(bbox), { timeoutMs: 180000, userAgent: USER_AGENT })
  const fetchedAt = new Date().toISOString()
  const elements = slimNetwork(data.elements)
  await writeFile(join(outDir, 'network.json'), JSON.stringify({ city: city.id, fetchedAt, bbox, elements }))
  return { fetchedAt, count: elements.length, endpoint }
})

// City data: public transport stops from the transport authority's open layer
const stops = city.stops
  ? await run('ztp-stops', previous['ztp-stops'], async () => {
      const list = await fetchStops(city.stops!.serviceUrl, city.bbox, { timeoutMs: 60000 })
      const fetchedAt = new Date().toISOString()
      await writeFile(join(outDir, 'stops.json'), JSON.stringify({ city: city.id, fetchedAt, places: list }))
      return { fetchedAt, count: list.length, endpoint: city.stops!.serviceUrl }
    })
  : null

const sources = [places, network, ...(stops ? [stops] : [])]
await writeFile(join(outDir, 'meta.json'), `${JSON.stringify({ city: city.id, generatedAt: new Date().toISOString(), sources }, null, 2)}\n`)

if (sources.every((s) => s.status === 'failed')) {
  console.error('All sources failed; previous snapshots were kept.')
  process.exit(1)
}
