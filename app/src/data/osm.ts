import type { BBox } from '../core/geo.ts'
import { distanceM } from '../core/geo.ts'
import { addFact } from '../core/facts.ts'
import type { Amenity, AmenityKind, CategoryKey, Fact, FactMap, LngLat, Place, WheelchairTag } from '../core/types.ts'
import type { OverpassElement, OverpassResult } from './overpass.ts'

/*
 * OpenStreetMap adapter: turns OSM tags into facts. Every fact keeps a link to the OSM element and its date:
 * an explicit check_date / survey:date when mappers recorded one (a confirmation), otherwise the last edit.
 * Tag meanings follow the OSM wiki (Key:wheelchair, Key:toilets:wheelchair, Key:entrance, Key:step_count…).
 */

const PUBLIC_AMENITIES =
  'theatre|cinema|arts_centre|townhall|library|pharmacy|hospital|clinic|doctors|post_office|place_of_worship|toilets|bank|university|college|community_centre|courthouse|police|marketplace|social_facility|bus_station'
const FOOD = 'restaurant|cafe|fast_food|bar|pub|ice_cream'
const ACCESS_KEYS = '^(wheelchair|toilets:wheelchair)$'
const ENTRANCE_KEYS = '^(wheelchair|step_count|door:width|width|ramp|ramp:wheelchair|automatic_door|handrail)$'

/** Web address from an OSM tag, only as an http(s) link; anything else is dropped. */
export function webUrl(value: string | undefined): string | undefined {
  const v = value?.split(';')[0].trim()
  if (!v) return undefined
  if (/^https?:\/\/[^\s]+$/i.test(v)) return v
  if (/^[\w-]+(\.[\w-]+)*\.[a-z]{2,}(\/\S*)?$/i.test(v)) return `https://${v}`
  return undefined
}

/** Places, accessible entrances and nearby amenities in a bounding box. */
export function placesQuery(bbox: BBox): string {
  return `[out:json][timeout:90][bbox:${bbox.join(',')}];
(
  nwr[tourism~"^(museum|attraction|gallery|hotel|hostel)$"][name];
  nwr[tourism~"^(guest_house|apartment)$"][name][~"${ACCESS_KEYS}"~"."];
  nwr[amenity~"^(${PUBLIC_AMENITIES})$"];
  nwr[shop~"^(mall|department_store|supermarket)$"][name];
  nwr[railway=station][name];
  nwr[office=government][name];
  nwr[historic~"^(castle|monument|city_gate|church|palace)$"][name];
  nwr[amenity~"^(${FOOD})$"][~"${ACCESS_KEYS}"~"."];
  nwr[shop][name][~"${ACCESS_KEYS}"~"."];
);
out meta center qt;
node[entrance][~"${ENTRANCE_KEYS}"~"."];
out meta qt;
(
  node[amenity=bench];
  node[leisure=picnic_table];
  nwr[amenity=parking_space][parking_space=disabled];
  nwr[amenity=parking]["capacity:disabled"];
  node[highway=elevator];
);
out meta center qt;`
}

export function yesNo(value?: string): boolean | undefined {
  if (value === undefined) return undefined
  const v = value.trim().toLowerCase()
  if (v === 'yes' || v === 'true' || v === '1') return true
  if (v === 'no' || v === 'false' || v === '0') return false
  return undefined
}

export function wheelchairValue(value?: string): WheelchairTag | undefined {
  if (value === 'yes' || value === 'designated') return 'yes'
  if (value === 'limited') return 'limited'
  if (value === 'no') return 'no'
  return undefined
}

/** OSM widths are metres unless a unit is given ("0.9", "90 cm", "0,9 m"). */
export function parseWidthCm(value?: string): number | undefined {
  if (!value) return undefined
  const m = value.replace(',', '.').match(/^\s*(\d+(?:\.\d+)?)\s*(cm|mm|m)?\s*$/i)
  if (!m) return undefined
  const n = parseFloat(m[1])
  const unit = m[2]?.toLowerCase()
  const cm = unit === 'cm' ? n : unit === 'mm' ? n / 10 : unit === 'm' ? n * 100 : n > 10 ? n : n * 100
  return cm > 0 && cm < 1000 ? Math.round(cm) : undefined
}

export function parseCount(value?: string): number | undefined {
  if (!value || !/^\d+$/.test(value.trim())) return undefined
  return parseInt(value, 10)
}

export function categorize(t: Record<string, string>): CategoryKey {
  const a = t.amenity ?? ''
  const tourism = t.tourism ?? ''
  if (tourism === 'museum' || tourism === 'gallery' || a === 'arts_centre') return 'museum'
  if (a === 'place_of_worship') return 'church'
  if (a === 'theatre') return 'theatre'
  if (a === 'cinema') return 'cinema'
  if (a === 'toilets') return 'toilets'
  if (a === 'restaurant' || a === 'fast_food') return 'restaurant'
  if (a === 'cafe' || a === 'ice_cream') return 'cafe'
  if (a === 'bar' || a === 'pub') return 'bar'
  if (['hotel', 'hostel', 'guest_house', 'apartment'].includes(tourism)) return 'hotel'
  if (a === 'pharmacy') return 'pharmacy'
  if (['hospital', 'clinic', 'doctors'].includes(a)) return 'health'
  if (['townhall', 'courthouse', 'police', 'post_office', 'community_centre', 'social_facility'].includes(a) || t.office === 'government')
    return 'office'
  if (a === 'library') return 'library'
  if (t.railway === 'station' || a === 'bus_station') return 'station'
  if (a === 'bank') return 'bank'
  if (['university', 'college'].includes(a)) return 'education'
  if (t.shop === 'mall' || t.shop === 'department_store') return 'mall'
  if (t.shop) return 'shop'
  if (t.historic) return 'monument'
  if (tourism === 'attraction') return 'attraction'
  if (a === 'marketplace') return 'attraction'
  return 'other'
}

export function osmUrl(el: Pick<OverpassElement, 'type' | 'id'>): string {
  return `https://www.openstreetmap.org/${el.type}/${el.id}`
}

/** Source, date and link shared by every fact read from one OSM element. */
function provenance(el: OverpassElement, keys: string[] = []): Pick<Fact, 'source' | 'date' | 'confirmed' | 'url'> {
  const tags = el.tags ?? {}
  for (const key of [...keys.map((k) => `check_date:${k}`), 'check_date', 'survey:date']) {
    if (tags[key] && /^\d{4}(-\d{2}){0,2}$/.test(tags[key])) {
      return { source: 'osm', date: tags[key], confirmed: true, url: osmUrl(el) }
    }
  }
  return { source: 'osm', date: el.timestamp?.slice(0, 10), url: osmUrl(el) }
}

function coordsOf(el: OverpassElement): LngLat | null {
  if (el.lat !== undefined && el.lon !== undefined) return [el.lon, el.lat]
  if (el.center) return [el.center.lon, el.center.lat]
  return null
}

/** Facts stated on the place itself. */
function placeFacts(el: OverpassElement, facts: FactMap) {
  const t = el.tags ?? {}
  const wheelchair = wheelchairValue(t.wheelchair)
  if (wheelchair) {
    const note = t['wheelchair:description:pl'] ?? t['wheelchair:description'] ?? t['wheelchair:description:en']
    addFact(facts, 'wheelchair', { value: wheelchair, note, ...provenance(el, ['wheelchair']) })
    // For a toilet, wheelchair=* describes the toilet itself
    if (t.amenity === 'toilets' && wheelchair !== 'limited') {
      addFact(facts, 'accessibleToilet', { value: wheelchair === 'yes', ...provenance(el, ['wheelchair']) })
    }
  }
  const toilet = yesNo(t['toilets:wheelchair'])
  if (toilet !== undefined) addFact(facts, 'accessibleToilet', { value: toilet, ...provenance(el, ['toilets:wheelchair']) })

  const diaper = t.diaper && /^\d+$/.test(t.diaper) ? Number(t.diaper) > 0 : yesNo(t.diaper)
  const changing = yesNo(t.changing_table) ?? diaper
  if (changing !== undefined) addFact(facts, 'babyChanging', { value: changing, ...provenance(el, ['changing_table']) })

  const levels = t.building ? parseCount(t['building:levels']) : undefined
  if (levels) addFact(facts, 'floors', { value: levels, ...provenance(el) })

  const tactile = yesNo(t.tactile_paving)
  if (tactile !== undefined) addFact(facts, 'tactilePaving', { value: tactile, ...provenance(el, ['tactile_paving']) })

  entranceFacts(el, facts)
}

/** Facts from an entrance node (or entrance tags put directly on the place). */
function entranceFacts(el: OverpassElement, facts: FactMap, derivedFrom?: string) {
  const t = el.tags ?? {}
  const p = { ...provenance(el, ['entrance']), ...(derivedFrom ? { derivedFrom } : {}) }
  const steps = parseCount(t.step_count)
  if (steps !== undefined) addFact(facts, 'entranceSteps', { value: steps, ...p })
  else if (t.entrance && wheelchairValue(t.wheelchair) === 'yes')
    addFact(facts, 'entranceSteps', { value: 0, ...p, derivedFrom: derivedFrom ?? 'entrance + wheelchair=yes' })
  const ramp = yesNo(t['ramp:wheelchair']) ?? yesNo(t.ramp)
  if (ramp !== undefined) addFact(facts, 'ramp', { value: ramp, ...p })
  const width = parseWidthCm(t['door:width'] ?? (t.entrance ? t.width : undefined))
  if (width !== undefined) addFact(facts, 'doorWidthCm', { value: width, ...p })
  const automatic = t.automatic_door
  if (automatic) addFact(facts, 'automaticDoor', { value: automatic !== 'no', ...p })
  const handrail = yesNo(t.handrail)
  if (handrail !== undefined) addFact(facts, 'handrail', { value: handrail, ...p })
}

/** Grid index so "what is near this place" stays fast with thousands of elements. */
class PointIndex<T> {
  private cells = new Map<string, { at: LngLat; item: T }[]>()
  private readonly size = 0.002
  private key(lng: number, lat: number) {
    return `${Math.floor(lng / this.size)}:${Math.floor(lat / this.size)}`
  }
  add(at: LngLat, item: T) {
    const k = this.key(at[0], at[1])
    const list = this.cells.get(k) ?? []
    list.push({ at, item })
    this.cells.set(k, list)
  }
  near(at: LngLat, radiusM: number): { item: T; distance: number }[] {
    const result: { item: T; distance: number }[] = []
    const cx = Math.floor(at[0] / this.size)
    const cy = Math.floor(at[1] / this.size)
    const r = Math.ceil(radiusM / 100) + 1
    for (let x = cx - r; x <= cx + r; x++) {
      for (let y = cy - r; y <= cy + r; y++) {
        for (const entry of this.cells.get(`${x}:${y}`) ?? []) {
          const distance = distanceM(at, entry.at)
          if (distance <= radiusM) result.push({ item: entry.item, distance })
        }
      }
    }
    return result.sort((a, b) => a.distance - b.distance)
  }
}

/** A step-free entrance matters more than the main one: that is the one a wheelchair user will look for. */
function pickEntrance(list: OverpassElement[]): OverpassElement {
  const score = (e: OverpassElement) => {
    const t = e.tags ?? {}
    return (
      (wheelchairValue(t.wheelchair) === 'yes' ? 8 : 0) +
      (t.step_count === '0' ? 4 : 0) +
      (yesNo(t['ramp:wheelchair'] ?? t.ramp) ? 2 : 0) +
      (t.entrance === 'main' ? 1 : 0)
    )
  }
  return [...list].sort((a, b) => score(b) - score(a))[0]
}

const isEntrance = (el: OverpassElement) => el.type === 'node' && el.tags?.entrance !== undefined
const isBench = (el: OverpassElement) => el.tags?.amenity === 'bench' || el.tags?.leisure === 'picnic_table'
const isElevator = (el: OverpassElement) => el.tags?.highway === 'elevator'
const isDisabledParking = (el: OverpassElement) =>
  (el.tags?.amenity === 'parking_space' && el.tags.parking_space === 'disabled') ||
  (el.tags?.amenity === 'parking' && (parseCount(el.tags['capacity:disabled']) ?? 0) > 0)

export function placesFromOsm(result: OverpassResult): Place[] {
  const entrances = new Map<number, OverpassElement>()
  const entranceIndex = new PointIndex<OverpassElement>()
  const benches = new PointIndex<OverpassElement>()
  const parking = new PointIndex<OverpassElement>()
  const pois: OverpassElement[] = []

  for (const el of result.elements) {
    const at = coordsOf(el)
    if (!at || !el.tags) continue
    if (isEntrance(el) && !el.tags.amenity && !el.tags.shop && !el.tags.tourism) {
      entrances.set(el.id, el)
      entranceIndex.add(at, el)
    } else if (isBench(el)) benches.add(at, el)
    else if (isDisabledParking(el)) parking.add(at, el)
    else if (!isElevator(el)) pois.push(el)
  }

  const places: Place[] = []
  const seen = new Set<string>()
  for (const el of pois) {
    const tags = el.tags!
    const at = coordsOf(el)!
    const id = `osm-${el.type}-${el.id}`
    if (seen.has(id)) continue
    seen.add(id)
    const name = tags.name ?? tags['name:pl'] ?? ''
    if (!name && tags.amenity !== 'toilets') continue

    const facts: FactMap = {}
    placeFacts(el, facts)

    // The most accessible entrance on the building outline, or failing that the nearest one
    const own = (el.nodes ?? []).map((n) => entrances.get(n)).filter((e): e is OverpassElement => Boolean(e))
    if (own.length > 0) entranceFacts(pickEntrance(own), facts, own.length > 1 ? `best of ${own.length} entrances` : undefined)
    else {
      const nearest = entranceIndex.near(at, 15)[0]
      if (nearest) entranceFacts(nearest.item, facts, 'entrance ≤ 15 m')
    }

    const bench = benches.near(at, 50)[0]
    if (bench) addFact(facts, 'seating', { value: true, ...provenance(bench.item), derivedFrom: `bench ${Math.round(bench.distance)} m` })
    const spot = parking.near(at, 150)[0]
    if (spot)
      addFact(facts, 'disabledParking', {
        value: true,
        ...provenance(spot.item),
        derivedFrom: `parking ${Math.round(spot.distance)} m`,
      })

    const street = tags['addr:street'] ?? tags['addr:place']
    const media = {
      image: tags.image,
      commons: tags.wikimedia_commons,
      wikidata: /^Q\d+$/.test(tags.wikidata ?? '') ? tags.wikidata : undefined,
    }
    const website = webUrl(tags.website ?? tags['contact:website'] ?? tags.url)
    const phone = (tags.phone ?? tags['contact:phone'])?.split(';')[0].trim() || undefined
    places.push({
      id,
      name,
      altNames: tags['name:en'] ? { en: tags['name:en'] } : undefined,
      category: categorize(tags),
      address: street ? `${street} ${tags['addr:housenumber'] ?? ''}`.trim() : undefined,
      coords: at,
      facts,
      origin: 'osm',
      osm: { type: el.type, id: el.id },
      ...(media.image || media.commons || media.wikidata ? { media } : {}),
      ...(website || phone ? { contact: { website, phone } } : {}),
      ...(tags.opening_hours ? { openingHours: tags.opening_hours } : {}),
    })
  }
  return places
}

/** Benches, disabled parking spaces and elevators, shown on the map next to the places. */
export function amenitiesFromOsm(result: OverpassResult): Amenity[] {
  const out: Amenity[] = []
  for (const el of result.elements) {
    const at = coordsOf(el)
    if (!at || !el.tags) continue
    const kind: AmenityKind | null = isBench(el) ? 'bench' : isDisabledParking(el) ? 'parking' : isElevator(el) ? 'elevator' : null
    if (!kind) continue
    // A broken or locked elevator is not an amenity
    if (kind === 'elevator' && (el.tags.disused === 'yes' || el.tags.access === 'private' || el.tags.access === 'no')) continue
    out.push({ id: `${el.type}-${el.id}`, kind, coords: at, date: el.timestamp?.slice(0, 10), url: osmUrl(el) })
  }
  return out
}
