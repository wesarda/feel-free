import { STALE_AFTER_YEARS } from './facts.ts'
import type { FactKey, Place } from './types.ts'

/** How complete the data from one source is: the first thing to check before launching in a city. */
export type Coverage = {
  places: number
  /** Any information about getting in: the wheelchair summary tag or entrance details. */
  anyAccessInfo: number
  steps: number
  doorWidth: number
  toilet: number
  babyChanging: number
  /** At least one fact edited or confirmed within the freshness window. */
  recent: number
}

export const COVERAGE_KEYS = ['anyAccessInfo', 'steps', 'doorWidth', 'toilet', 'babyChanging', 'recent'] as const

export function coverage(places: Place[], source: string, now: Date): Coverage {
  const limit = new Date(now)
  limit.setFullYear(limit.getFullYear() - STALE_AFTER_YEARS)
  const result: Coverage = { places: 0, anyAccessInfo: 0, steps: 0, doorWidth: 0, toilet: 0, babyChanging: 0, recent: 0 }
  for (const place of places) {
    if (place.origin !== source) continue
    result.places++
    const has = (key: FactKey, explicit = false) =>
      (place.facts[key] ?? []).some((f) => f.source === source && (!explicit || !f.derivedFrom))
    if (has('wheelchair') || has('entranceSteps') || has('ramp')) result.anyAccessInfo++
    if (has('entranceSteps', true)) result.steps++
    if (has('doorWidthCm')) result.doorWidth++
    if (has('accessibleToilet')) result.toilet++
    if (has('babyChanging')) result.babyChanging++
    const fresh = Object.values(place.facts).some((list) =>
      list?.some((f) => f.source === source && f.date && Date.parse(f.date) >= limit.getTime()),
    )
    if (fresh) result.recent++
  }
  return result
}
