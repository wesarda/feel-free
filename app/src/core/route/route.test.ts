import { describe, expect, it } from 'vitest'
import { PRESETS } from '../needs.ts'
import type { AlertReport, LngLat } from '../types.ts'
import { buildGraph, type OsmElement } from './graph.ts'
import { planRoute } from './plan.ts'
import { assessNode, assessWay, kerbHeightCm } from './rules.ts'

// A tiny network: the direct path (A–S1–S2–B) has a flight of 6 steps, the detour (A–C–X–D–B)
// is step-free but crosses a street without kerb data and has a stretch of cobblestones.
const coords: Record<number, LngLat> = {
  1: [19.93, 50.06],
  2: [19.9313, 50.06],
  3: [19.9327, 50.06],
  4: [19.934, 50.06],
  5: [19.93, 50.0612],
  8: [19.932, 50.0612],
  6: [19.934, 50.0612],
}
const way = (id: number, nodes: number[], tags: Record<string, string>): OsmElement => ({
  type: 'way',
  id,
  nodes,
  geometry: nodes.map((n) => ({ lon: coords[n][0], lat: coords[n][1] })),
  tags,
  timestamp: '2025-04-01T00:00:00Z',
})
const elements: OsmElement[] = [
  way(10, [1, 2], { highway: 'footway', surface: 'asphalt' }),
  way(11, [2, 3], { highway: 'steps', step_count: '6' }),
  way(12, [3, 4], { highway: 'footway', surface: 'asphalt' }),
  way(13, [1, 5], { highway: 'footway', surface: 'asphalt' }),
  way(14, [5, 8], { highway: 'footway', footway: 'crossing', surface: 'asphalt' }),
  way(15, [8, 6], { highway: 'footway', surface: 'sett', name: 'Kanonicza' }),
  way(16, [6, 4], { highway: 'footway', surface: 'asphalt' }),
  way(17, [1, 4], { highway: 'cycleway' }),
  { type: 'node', id: 9, lat: 50.0613, lon: 19.933, tags: { amenity: 'bench' }, timestamp: '2024-01-01T00:00:00Z' },
  { type: 'node', id: 30, lat: 50.0614, lon: 19.9335, tags: { amenity: 'toilets', wheelchair: 'yes' } },
]
const A = coords[1]
const B = coords[4]

describe('planRoute', () => {
  const graph = buildGraph(elements)

  it('ignores ways pedestrians may not use', () => {
    expect(graph.ways.map((w) => w.id)).not.toContain(17)
  })

  it('takes the step-free detour for a wheelchair and explains what is on it', () => {
    const plan = planRoute(graph, A, B, PRESETS.wheelchair)
    const route = plan.accessible!
    expect(route.events.some((e) => e.kind === 'steps')).toBe(false)
    expect(route.summary.kerbsUnknown).toBe(1)
    expect(route.summary.cobblestoneM).toBeGreaterThan(100)
    expect(route.events.find((e) => e.kind === 'surface')).toMatchObject({ severity: 'difficulty', street: 'Kanonicza' })
    expect(route.summary.benches).toBe(1)
    expect(route.summary.accessibleToilets).toBe(1)
    expect(route.verdict).toBe('partial')
    expect(route.legs.map((l) => l.kind)).toContain('crossing')
  })

  it('shows that the shortest route has a barrier for the same needs', () => {
    const plan = planRoute(graph, A, B, PRESETS.wheelchair)
    expect(plan.shortest!.length).toBeLessThan(plan.accessible!.length)
    expect(plan.shortest!.summary.steps).toBe(6)
    expect(plan.shortest!.verdict).toBe('mismatch')
  })

  it('lets someone who manages steps take them', () => {
    const route = planRoute(graph, A, B, { ...PRESETS.walking, maxSteps: 10 }).accessible!
    expect(route.events.find((e) => e.kind === 'steps')?.severity).toBe('difficulty')
  })

  it('avoids a reported obstacle when there is an alternative', () => {
    const alert: AlertReport = {
      id: 'a',
      kind: 'alert',
      alertType: 'blockedSidewalk',
      coords: coords[8],
      comment: '',
      createdAt: '2026-10-01T00:00:00Z',
      expiresAt: '2026-10-15T00:00:00Z',
      confirmations: [],
      source: 'reports',
    }
    const route = planRoute(graph, A, B, { ...PRESETS.walking, maxSteps: 10 }, [alert]).accessible!
    expect(route.events.some((e) => e.kind === 'alert')).toBe(false)
  })

  it('reports when a point is far from any footway', () => {
    expect(planRoute(graph, [19.99, 50.1], B, PRESETS.wheelchair).notOnNetwork).toBe(true)
  })
})

describe('rules', () => {
  it('reads kerb heights', () => {
    expect(kerbHeightCm({ kerb: 'lowered' })).toBe(3)
    expect(kerbHeightCm({ kerb: 'raised' })).toBe(12)
    expect(kerbHeightCm({ 'kerb:height': '0.02' })).toBe(2)
    expect(kerbHeightCm({ 'kerb:height': '4 cm' })).toBe(4)
    expect(kerbHeightCm({ barrier: 'kerb' })).toBeNull()
  })

  it('treats a raised kerb as a barrier for a wheelchair but a difficulty with a stroller', () => {
    expect(assessNode({ kerb: 'raised' }, PRESETS.wheelchair).issues[0].severity).toBe('barrier')
    expect(assessNode({ kerb: 'raised' }, PRESETS.stroller).issues[0].severity).toBe('difficulty')
    expect(assessNode({ kerb: 'yes' }, PRESETS.wheelchair).issues[0].kind).toBe('kerbUnknown')
  })

  it('accepts steps with a wheelchair ramp', () => {
    const a = assessWay({ highway: 'steps', step_count: '4', 'ramp:wheelchair': 'yes' }, 2, PRESETS.wheelchair)
    expect(a.issues[0]).toMatchObject({ kind: 'steps', severity: 'ok' })
    expect(a.penalty).toBe(0)
  })

  it('estimates the number of steps from the length when step_count is missing', () => {
    const a = assessWay({ highway: 'steps' }, 3, PRESETS.stroller)
    expect(a.issues[0]).toMatchObject({ value: 10, estimated: true, severity: 'barrier' })
  })
})
