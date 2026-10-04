import { describe, expect, it } from 'vitest'
import { evaluatePlace } from './core/evaluate.ts'
import { PRESETS } from './core/needs.ts'
import { usualRoute, type RoutePlan, type RouteReport } from './core/route/plan.ts'
import type { FactMap, Place } from './core/types.ts'
import { en } from './i18n/en.ts'
import { pl } from './i18n/pl.ts'
import { placeSpeech, routeSpeech } from './speechText.ts'

const NOW = new Date('2026-10-03')
const osm = <T>(value: T) => [{ value, source: 'osm', date: '2026-01-01' }]
const place = (facts: FactMap): Place => ({ id: 'p', name: 'Kawiarnia Testowa', category: 'cafe', coords: [19.937, 50.061], address: 'Rynek 1', facts, origin: 'osm' })
const metres = (m: number) => `${Math.round(m)} m`

describe('placeSpeech', () => {
  it('asks for needs instead of reading a rating that does not exist', () => {
    expect(placeSpeech(place({}), null, en, 'en')).toEqual(['Kawiarnia Testowa', 'Café, Rynek 1', en.vision.noNeeds])
  })

  it('reads the rating first, then the reasons with the barrier before everything else', () => {
    const p = place({ entranceSteps: osm(3), ramp: osm(false), platformLift: osm(false), accessibleToilet: osm(true) })
    const lines = placeSpeech(p, evaluatePlace(p, PRESETS.wheelchair, { now: NOW }), en, 'en')
    expect(lines[2]).toBe(`${en.verdict.mismatch}.`)
    expect(lines[3]).toMatch(/^Barrier: .*3 steps/)
    expect(lines.some((l) => l.startsWith(`${en.severity.info}:`))).toBe(false)
  })

  it('speaks Polish when the app does', () => {
    const p = place({ entranceSteps: osm(0) })
    const lines = placeSpeech(p, evaluatePlace(p, PRESETS.wheelchair, { now: NOW }), pl, 'pl')
    expect(lines[1]).toBe(`${pl.categories.cafe}, Rynek 1`)
    expect(lines).toContain(`${pl.severity.ok}: ${pl.findings.levelEntrance({})}`)
  })
})

describe('routeSpeech', () => {
  const route = {
    verdict: 'partial',
    length: 420,
    durationMin: 7,
    events: [
      { kind: 'kerb', severity: 'difficulty', at: 120, value: 6, street: 'Floriańska' },
      { kind: 'bench', severity: 'info', at: 200 },
    ],
    legs: [
      { name: 'Floriańska', kind: 'street', length: 300 },
      { name: '', kind: 'crossing', length: 3 },
    ],
  } as unknown as RouteReport
  const plan: RoutePlan = { accessible: route, shortest: null, notOnNetwork: false }

  it('reads the rating and length, what is on the way in order, then the directions', () => {
    const lines = routeSpeech(plan, en, metres)
    expect(lines[0]).toBe(`${en.verdict.partial}. ${en.route.distance('420 m', 7)}`)
    expect(lines).toContain(`After 120 m: Difficulty. ${en.route.events.kerb(6)}, Floriańska`)
    expect(lines.at(-1)).toBe(en.route.leg('Floriańska', '300 m'))
    // Benches are information, not something to be warned about; stubs of a few metres are not directions
    expect(lines.join(' ')).not.toContain(en.route.events.bench())
    expect(lines).toContain(en.route.sameAsShortest)
    expect(lines).toHaveLength(7)
  })

  it('starts with the usual route and what is in the way on it, then offers the easier one', () => {
    const usual = {
      verdict: 'mismatch',
      length: 350,
      durationMin: 5,
      events: [
        { kind: 'steps', severity: 'barrier', at: 80, value: 4 },
        { kind: 'bench', severity: 'ok', at: 90 },
      ],
      legs: [],
      summary: { barriers: 1, difficulties: 0 },
    } as unknown as RouteReport
    const lines = routeSpeech({ ...plan, shortest: usual }, en, metres)
    expect(lines.slice(0, 5)).toEqual([
      `${en.route.usual}, 350 m: ${en.verdict.mismatch}.`,
      en.route.usualObstacles(1, 0),
      `${en.route.easier}.`,
      `${en.verdict.partial}. ${en.route.distance('420 m', 7)}`,
      en.route.easierLonger('70 m'),
    ])
    expect(usualRoute({ ...plan, shortest: usual })?.obstacles.map((e) => e.kind)).toEqual(['steps'])
  })

  it('does not present a second route when the usual one is the planned one', () => {
    expect(usualRoute({ ...plan, shortest: { ...route, length: 418 } })).toBeNull()
    expect(usualRoute(plan)).toBeNull()
  })

  it('says so when there is no route', () => {
    expect(routeSpeech({ accessible: null, shortest: null, notOnNetwork: false }, en, metres)).toEqual([en.route.noRoute])
    expect(routeSpeech({ accessible: null, shortest: null, notOnNetwork: true }, en, metres)).toEqual([en.route.notOnNetwork])
  })
})
