import { describe, expect, it } from 'vitest'
import { evaluatePlace } from '../core/evaluate.ts'
import { resolve } from '../core/facts.ts'
import { PRESETS } from '../core/needs.ts'
import { mergeSample, similarNames } from './merge.ts'
import { parseWidthCm, placesFromOsm } from './osm.ts'
import type { OverpassResult } from './overpass.ts'
import { samplePlaces } from './sample.ts'

const now = new Date('2026-10-03T12:00:00Z')

const fixture: OverpassResult = {
  osm3s: { timestamp_osm_base: '2026-10-03T10:00:00Z' },
  elements: [
    {
      type: 'way',
      id: 100,
      center: { lat: 50.0617, lon: 19.9373 },
      nodes: [1, 2, 3, 4, 1],
      timestamp: '2024-05-01T10:00:00Z',
      tags: { name: 'Muzeum Testowe', tourism: 'museum', building: 'yes', 'building:levels': '3', 'toilets:wheelchair': 'yes' },
    },
    {
      type: 'node',
      id: 2,
      lat: 50.0616,
      lon: 19.9372,
      timestamp: '2025-02-02T10:00:00Z',
      tags: { entrance: 'main', step_count: '3' },
    },
    {
      type: 'node',
      id: 3,
      lat: 50.0618,
      lon: 19.9374,
      timestamp: '2023-03-03T10:00:00Z',
      tags: { entrance: 'yes', wheelchair: 'yes', 'door:width': '0.9', automatic_door: 'yes', check_date: '2026-06-01' },
    },
    {
      type: 'node',
      id: 200,
      lat: 50.062,
      lon: 19.94,
      timestamp: '2022-01-01T10:00:00Z',
      tags: { name: 'Bistro', amenity: 'restaurant', wheelchair: 'limited', 'toilets:wheelchair': 'no', changing_table: 'yes' },
    },
    { type: 'node', id: 300, lat: 50.0619, lon: 19.9375, timestamp: '2021-01-01T10:00:00Z', tags: { amenity: 'bench' } },
    { type: 'node', id: 400, lat: 50.05, lon: 19.95, timestamp: '2025-05-05T10:00:00Z', tags: { amenity: 'toilets', wheelchair: 'yes' } },
  ],
}

describe('placesFromOsm', () => {
  const places = placesFromOsm(fixture)
  const museum = places.find((p) => p.name === 'Muzeum Testowe')!

  it('creates places with OSM provenance and skips entrances and benches', () => {
    expect(places.map((p) => p.id).sort()).toEqual(['osm-node-200', 'osm-node-400', 'osm-way-100'])
    expect(museum.osm).toEqual({ type: 'way', id: 100 })
    expect(museum.category).toBe('museum')
  })

  it('uses the step-free entrance of the building and keeps its confirmation date', () => {
    const steps = resolve(museum.facts, 'entranceSteps', now).best!
    expect(steps.value).toBe(0)
    expect(steps.date).toBe('2026-06-01')
    expect(steps.confirmed).toBe(true)
    expect(steps.url).toBe('https://www.openstreetmap.org/node/3')
    expect(resolve(museum.facts, 'doorWidthCm', now).best?.value).toBe(90)
    expect(resolve(museum.facts, 'floors', now).best?.value).toBe(3)
  })

  it('finds a bench nearby as a place to rest', () => {
    const seating = resolve(museum.facts, 'seating', now).best!
    expect(seating.value).toBe(true)
    expect(seating.derivedFrom).toMatch(/^bench \d+ m$/)
  })

  it('maps toilet and changing table tags', () => {
    const bistro = places.find((p) => p.name === 'Bistro')!
    expect(resolve(bistro.facts, 'accessibleToilet', now).best?.value).toBe(false)
    expect(resolve(bistro.facts, 'babyChanging', now).best?.value).toBe(true)
    const toilet = places.find((p) => p.id === 'osm-node-400')!
    expect(toilet.category).toBe('toilets')
    expect(resolve(toilet.facts, 'accessibleToilet', now).best?.value).toBe(true)
  })

  it('feeds the evaluation without inventing missing data', () => {
    const result = evaluatePlace(museum, PRESETS.wheelchair, { now })
    expect(result.verdict).toBe('unknown') // elevator for 3 floors is not in the data
    expect(result.findings.find((f) => f.msg.key === 'elevatorUnknown')?.required).toBe(true)
  })
})

describe('helpers', () => {
  it('parses OSM widths', () => {
    expect(parseWidthCm('0.9')).toBe(90)
    expect(parseWidthCm('90 cm')).toBe(90)
    expect(parseWidthCm('0,85 m')).toBe(85)
    expect(parseWidthCm('85')).toBe(85)
    expect(parseWidthCm('wide')).toBeUndefined()
  })

  it('matches names regardless of diacritics and word endings', () => {
    expect(similarNames('Bazylika Mariacka', 'Kościół Mariacki')).toBe(true)
    expect(similarNames('Muzeum Narodowe – Gmach Główny', 'Muzeum Narodowe w Krakowie')).toBe(true)
    expect(similarNames('Barbakan', 'Brama Floriańska')).toBe(false)
  })

  it('attaches sample facts to the matching real place', () => {
    const real = placesFromOsm({
      elements: [{ type: 'way', id: 1, center: { lat: 50.0617, lon: 19.9374 }, tags: { name: 'Sukiennice', tourism: 'museum' } }],
    })
    const merged = mergeSample(real, samplePlaces)
    const sukiennice = merged.find((p) => p.id === 'osm-way-1')!
    expect(sukiennice.aliases).toContain('sample-sukiennice')
    expect(sukiennice.facts.doorWidthCm?.length).toBe(2)
    expect(merged.some((p) => p.id === 'sample-sukiennice')).toBe(false)
    expect(merged.some((p) => p.id === 'sample-wawel')).toBe(true)
  })
})

describe('coverage', () => {
  it('measures how complete the OSM data is', async () => {
    const { coverage } = await import('../core/coverage.ts')
    const result = coverage(placesFromOsm(fixture), 'osm', now)
    expect(result.places).toBe(3)
    expect(result.anyAccessInfo).toBe(3)
    expect(result.steps).toBe(0) // the museum's 0 steps is inferred from wheelchair=yes at the entrance
    expect(result.doorWidth).toBe(1)
    expect(result.toilet).toBe(3)
    expect(result.recent).toBe(2) // the bistro was last edited in 2022
  })
})

describe('contact data', () => {
  it('keeps only http(s) web addresses', async () => {
    const { webUrl } = await import('./osm.ts')
    expect(webUrl('https://mnk.pl/')).toBe('https://mnk.pl/')
    expect(webUrl('www.wawel.krakow.pl')).toBe('https://www.wawel.krakow.pl')
    expect(webUrl('http://a.pl;https://b.pl')).toBe('http://a.pl')
    expect(webUrl('javascript:alert(1)')).toBeUndefined()
    expect(webUrl('not a link')).toBeUndefined()
    expect(webUrl(undefined)).toBeUndefined()
  })
})

describe('amenities', () => {
  it('lists benches, disabled parking and working public elevators for the map', async () => {
    const { amenitiesFromOsm, placesFromOsm } = await import('./osm.ts')
    const data: OverpassResult = {
      elements: [
        { type: 'node', id: 1, lat: 50.06, lon: 19.93, timestamp: '2024-04-01T10:00:00Z', tags: { amenity: 'bench' } },
        { type: 'node', id: 2, lat: 50.061, lon: 19.931, tags: { amenity: 'parking_space', parking_space: 'disabled' } },
        { type: 'way', id: 3, center: { lat: 50.062, lon: 19.932 }, tags: { amenity: 'parking', 'capacity:disabled': '2' } },
        { type: 'node', id: 4, lat: 50.063, lon: 19.933, tags: { highway: 'elevator' } },
        { type: 'node', id: 5, lat: 50.064, lon: 19.934, tags: { highway: 'elevator', access: 'private' } },
        { type: 'way', id: 6, center: { lat: 50.065, lon: 19.935 }, tags: { amenity: 'parking', 'capacity:disabled': '0' } },
      ],
    }
    const list = amenitiesFromOsm(data)
    expect(list.map((a) => `${a.id}:${a.kind}`)).toEqual(['node-1:bench', 'node-2:parking', 'way-3:parking', 'node-4:elevator'])
    expect(list[0]).toMatchObject({ coords: [19.93, 50.06], date: '2024-04-01', url: 'https://www.openstreetmap.org/node/1' })
    // Elevators are not places
    expect(placesFromOsm(data)).toEqual([])
  })
})
