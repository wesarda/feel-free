import { describe, expect, it } from 'vitest'
import { evaluatePlace } from './evaluate.ts'
import { resolve } from './facts.ts'
import { PRESETS } from './needs.ts'
import type { Place } from './types.ts'
import { samplePlaces, sampleReports } from '../data/sample.ts'

const now = new Date('2026-10-03T12:00:00Z')
const sample = (id: string) => samplePlaces.find((p) => p.id === `sample-${id}`)!
const keys = (place: Place, preset: keyof typeof PRESETS) =>
  evaluatePlace(place, PRESETS[preset], { now }).findings.map((f) => `${f.severity}:${f.msg.key}`)

describe('evaluatePlace', () => {
  it('reports steps without ramp or lift as a barrier for a wheelchair user', () => {
    const result = evaluatePlace(sample('mariacki'), PRESETS.wheelchair, { now })
    expect(result.verdict).toBe('mismatch')
    expect(result.findings[0]).toMatchObject({
      severity: 'barrier',
      msg: { key: 'stepsBlocking', n: 3, alternative: 'none' },
    })
  })

  it('accepts a ramp within the slope limit', () => {
    expect(keys(sample('sukiennice'), 'wheelchair')).toContain('ok:stepsRamp')
  })

  it('flags a ramp steeper than the limit', () => {
    expect(keys(sample('wawel'), 'wheelchair')).toContain('difficulty:rampTooSteep')
  })

  it('keeps the more reliable source but shows the disagreeing one', () => {
    const result = evaluatePlace(sample('sukiennice'), PRESETS.wheelchair, { now })
    const door = result.findings.find((f) => f.aspect === 'door')!
    expect(door.msg).toMatchObject({ key: 'doorOk', cm: 120 })
    expect(door.conflicts.map((f) => f.value)).toEqual([75])
    expect(result.conflicts).toBeGreaterThan(0)
  })

  it('never turns missing data into "meets your needs"', () => {
    const empty: Place = { id: 'x', name: 'X', category: 'other', coords: [19.9, 50], facts: {}, origin: 'osm' }
    const result = evaluatePlace(empty, PRESETS.wheelchair, { now })
    expect(result.verdict).toBe('unknown')
    expect(result.missing).toBeGreaterThan(0)
  })

  it('uses the summary tag only when detailed facts are missing, and still requires the toilet', () => {
    const result = evaluatePlace(sample('schindler'), PRESETS.wheelchair, { now })
    expect(result.findings.map((f) => f.msg.key)).toEqual(expect.arrayContaining(['summaryYes', 'doorAssumed']))
    expect(result.verdict).toBe('unknown')
  })

  it('treats a few steps as a difficulty for a stroller, too many as a barrier', () => {
    expect(keys(sample('collegium-maius'), 'stroller')).toContain('difficulty:stepsManageable')
    expect(evaluatePlace(sample('barbakan'), PRESETS.stroller, { now }).verdict).toBe('mismatch')
  })

  it('marks old data as possibly outdated', () => {
    expect(evaluatePlace(sample('collegium-maius'), PRESETS.walking, { now }).stale).toBe(true)
    expect(evaluatePlace(sample('galeria-krakowska'), PRESETS.walking, { now }).stale).toBe(false)
  })

  it('matches a place that has everything the user needs', () => {
    const result = evaluatePlace(sample('galeria-krakowska'), PRESETS.wheelchair, { now })
    expect(result.verdict).toBe('match')
    expect(result.usesSample).toBe(true)
    expect(result.weakest).toBe('official')
  })

  it('shows active user alerts as unverified difficulties and ignores expired ones', () => {
    const alerts = sampleReports(now).filter((r) => r.kind === 'alert' && r.placeId === 'sample-dworzec-glowny')
    const active = evaluatePlace(sample('dworzec-glowny'), PRESETS.wheelchair, { now, alerts: alerts as never })
    expect(active.verdict).toBe('partial')
    const later = new Date(now.getTime() + 30 * 86400000)
    const expired = evaluatePlace(sample('dworzec-glowny'), PRESETS.wheelchair, { now: later, alerts: alerts as never })
    expect(expired.verdict).toBe('match')
  })
})

describe('resolve', () => {
  it('does not report a conflict when sources agree', () => {
    const place: Place = {
      ...sample('galeria-krakowska'),
      facts: {
        doorWidthCm: [
          { value: 200, source: 'sample-owner', date: '2026-01-15' },
          { value: 195, source: 'osm', date: '2025-01-01' },
        ],
      },
    }
    expect(resolve(place.facts, 'doorWidthCm', now).conflicts).toEqual([])
  })

  it('prefers explicit facts over derived ones of the same reliability', () => {
    const result = resolve(
      {
        entranceSteps: [
          { value: 0, source: 'osm', date: '2026-01-01', derivedFrom: 'wheelchair=yes' },
          { value: 2, source: 'osm', date: '2020-01-01' },
        ],
      },
      'entranceSteps',
      now,
    )
    expect(result.best?.value).toBe(2)
  })
})
