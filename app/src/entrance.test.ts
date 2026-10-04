import { describe, expect, it } from 'vitest'
import type { FactMap, Place } from './core/types.ts'
import { entranceData } from './entrance.ts'

const NOW = new Date('2026-10-03')
const place = (facts: FactMap): Place => ({ id: 'p', name: 'Test', category: 'cafe', coords: [19.937, 50.061], facts, origin: 'osm' })
const osm = <T>(value: T) => [{ value, source: 'osm', date: '2026-01-01' }]

describe('entranceData', () => {
  it('draws every place, leaving what no source says unknown', () => {
    expect(entranceData(place({}), NOW)).toMatchObject({ steps: null, summary: null, doorWidthCm: null, ramp: false })
  })

  it('never turns a summary tag into a number of steps', () => {
    expect(entranceData(place({ wheelchair: osm('yes') }), NOW)).toMatchObject({ steps: null, summary: 'yes' })
    expect(entranceData(place({ wheelchair: osm('no') }), NOW)).toMatchObject({ steps: null, summary: 'no' })
  })

  it('uses the recorded steps and measurements', () => {
    const data = entranceData(place({ entranceSteps: osm(3), stepHeightCm: osm(16), ramp: osm(true), doorWidthCm: osm(85) }), NOW)
    expect(data).toMatchObject({ steps: 3, stepHeightCm: 16, ramp: true, doorWidthCm: 85 })
  })

  it('keeps a step-free entrance apart from an unknown one', () => {
    expect(entranceData(place({ entranceSteps: osm(0) }), NOW).steps).toBe(0)
  })
})
