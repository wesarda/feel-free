import type { CityConfig } from '../cities/types.ts'
import { addFact, isoDay } from '../core/facts.ts'
import type { BBox } from '../core/geo.ts'
import type { BoardingKerb, Fact, FactMap, Place, SurfaceKind } from '../core/types.ts'
import type { SourceState } from './status.ts'

/*
 * City data adapter: the register of public transport stops kept by Zarząd Transportu Publicznego w Krakowie,
 * published in the Kraków Open Data portal as a public ArcGIS layer. Every stop post becomes a place whose
 * facts (platform kerb, platform surface, shelter, benches) carry the source, the date of the last edit in the
 * register and the "official" reliability level. Nothing is guessed: an empty field gives no fact.
 */

/** One record of the layer, with the fields the adapter reads. */
export type ZtpStop = {
  kod_busman?: string | null
  Nazwa_przystanku_nr?: string | null
  Typ_przystanku?: string | null
  Nawierzchnia_peronu?: string | null
  Krawężnik_peronowy?: string | null
  Ławki_poza_wiatą?: number | null
  Ławki_inne_poza_wiatą?: number | null
  Inne_do_siedzenia?: number | null
  Wiata_liczba?: number | null
  EditDate?: number | null
  validUntil?: number | null
  Grupa?: string | null
}

export type ZtpFeature = { geometry: { type: string; coordinates: number[] } | null; properties: ZtpStop | null }
export type ZtpResult = { features: ZtpFeature[]; exceededTransferLimit?: boolean; properties?: { exceededTransferLimit?: boolean } }

const FIELDS: (keyof ZtpStop)[] = [
  'kod_busman',
  'Nazwa_przystanku_nr',
  'Typ_przystanku',
  'Nawierzchnia_peronu',
  'Krawężnik_peronowy',
  'Ławki_poza_wiatą',
  'Ławki_inne_poza_wiatą',
  'Inne_do_siedzenia',
  'Wiata_liczba',
  'EditDate',
  'validUntil',
  'Grupa',
]

const DATASET_URL = 'https://otwartedane.um.krakow.pl/zbiory-danych/komunikacja-miejska-w-krakowie-kmk'

/** Stops in use today; planned, temporary and other operators' stops have a prefix or another group. */
const VEHICLES: Record<string, string> = { A: 'autobus', T: 'tramwaj', TA: 'tramwaj i autobus' }

const KERBS: Record<string, BoardingKerb> = { 'kassel-kerb': 'raised', tak: 'standard', nie: 'none' }

// „kostka” on a platform is concrete paving blocks, not historic cobblestones
const SURFACES: Record<string, SurfaceKind> = {
  kostka: 'paving',
  płyty_chodnikowe: 'paving',
  asfalt: 'smooth',
  beton: 'smooth',
  nieutwardzne_inne: 'unpaved',
}

/** Request for the stops inside a bounding box ([south, west, north, east]), as GeoJSON. */
export function stopsUrl(serviceUrl: string, bbox: BBox): string {
  const [south, west, north, east] = bbox
  const params = new URLSearchParams({
    where: '1=1',
    outFields: FIELDS.join(','),
    geometry: `${west},${south},${east},${north}`,
    geometryType: 'esriGeometryEnvelope',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outSR: '4326',
    f: 'geojson',
  })
  return `${serviceUrl}/query?${params}`
}

/** Request for one stop by the code that is part of its place id (`ztp-<code>`). */
export function stopUrl(serviceUrl: string, code: string): string {
  const params = new URLSearchParams({ where: `kod_busman='${code}'`, outFields: FIELDS.join(','), outSR: '4326', f: 'geojson' })
  return `${serviceUrl}/query?${params}`
}

export function placesFromZtp(result: ZtpResult, now: Date): Place[] {
  const places: Place[] = []
  const seen = new Set<string>()
  for (const { geometry, properties: p } of result.features) {
    const [lng, lat] = geometry?.coordinates ?? []
    if (!p || typeof lng !== 'number' || typeof lat !== 'number') continue
    const vehicle = VEHICLES[p.Typ_przystanku ?? '']
    if (!vehicle || p.Grupa !== 'KMK' || !p.kod_busman || !p.Nazwa_przystanku_nr) continue
    if (p.validUntil && p.validUntil < now.getTime()) continue
    const id = `ztp-${p.kod_busman}`
    if (seen.has(id)) continue
    seen.add(id)

    const from: Pick<Fact, 'source' | 'date' | 'url'> = {
      source: 'ztp',
      date: p.EditDate ? isoDay(new Date(p.EditDate)) : undefined,
      url: DATASET_URL,
    }
    const facts: FactMap = {}

    const kerb = KERBS[p.Krawężnik_peronowy ?? '']
    if (kerb) addFact(facts, 'boardingKerb', { value: kerb, ...from })

    const surface = SURFACES[p.Nawierzchnia_peronu ?? '']
    if (surface) addFact(facts, 'surface', { value: surface, ...from })

    if (typeof p.Wiata_liczba === 'number') addFact(facts, 'shelter', { value: p.Wiata_liczba > 0, ...from })

    // The register counts the benches standing outside the shelter; whether the shelter itself has a
    // seat is not recorded, so a stop with a shelter and no other bench says nothing about seating
    const counts = [p.Ławki_poza_wiatą, p.Ławki_inne_poza_wiatą, p.Inne_do_siedzenia]
    if (counts.every((n) => typeof n === 'number')) {
      const benches = (p.Ławki_poza_wiatą ?? 0) + (p.Ławki_inne_poza_wiatą ?? 0)
      const leaning = p.Inne_do_siedzenia ?? 0
      const note = [benches > 0 ? `ławki: ${benches}` : '', leaning > 0 ? `barierosiedziska: ${leaning}` : ''].filter(Boolean).join(', ')
      if (benches + leaning > 0) addFact(facts, 'seating', { value: true, ...from, note })
      else if (p.Wiata_liczba === 0) addFact(facts, 'seating', { value: false, ...from })
    }

    places.push({
      id,
      name: `Przystanek ${p.Nazwa_przystanku_nr}`,
      altNames: { en: `${p.Nazwa_przystanku_nr} stop` },
      category: 'stop',
      address: vehicle,
      coords: [lng, lat],
      facts,
      origin: 'ztp',
    })
  }
  return places
}

/** Normalised stops as stored in the nightly snapshot file. */
export type StopsSnapshot = { city: string; fetchedAt: string; places: Place[] }

export type StopsLoad = { state: SourceState; places: Place[]; fetchedAt?: string; detail?: string }

/** How long the city's server may take before the saved copy is shown instead. */
const LIVE_LIMIT_MS = 8000

async function request(url: string, { signal, timeoutMs = LIVE_LIMIT_MS }: { signal?: AbortSignal; timeoutMs?: number }): Promise<Place[]> {
  const limit = AbortSignal.timeout(timeoutMs)
  const response = await fetch(url, { signal: signal ? AbortSignal.any([signal, limit]) : limit })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = (await response.json()) as ZtpResult & { error?: { message?: string } }
  // ArcGIS reports its own errors with status 200
  if (!Array.isArray(data.features)) throw new Error(data.error?.message ?? 'invalid response')
  if (data.exceededTransferLimit || data.properties?.exceededTransferLimit) throw new Error('more stops than one request returns')
  return placesFromZtp(data, new Date())
}

export function fetchStops(serviceUrl: string, bbox: BBox, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<Place[]> {
  return request(stopsUrl(serviceUrl, bbox), options)
}

/** One stop for the embeddable card; null when the register has no such stop in use. */
export async function fetchStop(serviceUrl: string, code: string, signal?: AbortSignal): Promise<Place | null> {
  return (await request(stopUrl(serviceUrl, code), { signal }))[0] ?? null
}

async function readSnapshot(city: CityConfig, signal?: AbortSignal): Promise<StopsSnapshot | null> {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${city.stops!.snapshotUrl}`, { signal })
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null
    const data = (await response.json()) as StopsSnapshot
    return Array.isArray(data.places) ? data : null
  } catch {
    return null
  }
}

/** The city's live layer first; if it does not answer, the nightly copy with its date; otherwise nothing. */
export async function loadStops(
  city: CityConfig,
  { signal, simulateOutage = false }: { signal?: AbortSignal; simulateOutage?: boolean } = {},
): Promise<StopsLoad | null> {
  if (!city.stops) return null
  try {
    if (simulateOutage) throw new Error('simulated outage (demo)')
    const places = await fetchStops(city.stops.serviceUrl, city.bbox, { signal })
    return { state: 'live', places, fetchedAt: new Date().toISOString() }
  } catch (error) {
    if (signal?.aborted) throw error
    const detail = error instanceof Error ? (error.name === 'TimeoutError' ? 'timeout' : error.message) : String(error)
    const saved = await readSnapshot(city, signal)
    if (saved) return { state: 'cached', places: saved.places, fetchedAt: saved.fetchedAt, detail }
    return { state: 'unavailable', places: [], detail }
  }
}
