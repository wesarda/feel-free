import type { Fact, FactKey, FactMap, FactValues, Reliability } from './types.ts'
import { RELIABILITY_RANK, getSource } from './sources.ts'

/** Structural facts (steps, doors) older than this are shown as possibly outdated. */
export const STALE_AFTER_YEARS = 3

export type Resolved<K extends FactKey = FactKey> = {
  key: K
  /** The fact we rely on: most reliable source, then the most recent. */
  best: Fact<K> | null
  /** Facts from other sources whose value disagrees with `best`. */
  conflicts: Fact<K>[]
  /** Every fact about this attribute, best first. */
  all: Fact<K>[]
  stale: boolean
}

const ms = (date?: string) => (date ? Date.parse(date) : NaN)

export function factRank(fact: Fact): number {
  // Explicit statements beat values inferred from a summary tag of the same reliability
  return RELIABILITY_RANK[getSource(fact.source).reliability] * 2 + (fact.derivedFrom ? 0 : 1)
}

export function compareFacts(a: Fact, b: Fact): number {
  const rank = factRank(b) - factRank(a)
  if (rank !== 0) return rank
  const da = ms(a.date)
  const db = ms(b.date)
  if (Number.isNaN(da)) return Number.isNaN(db) ? 0 : 1
  if (Number.isNaN(db)) return -1
  return db - da
}

/** Whether two values of the same attribute tell the user something different. */
export function valuesDisagree<K extends FactKey>(key: K, a: FactValues[K], b: FactValues[K]): boolean {
  if (typeof a === 'number' && typeof b === 'number') {
    switch (key) {
      case 'entranceSteps':
        return (a === 0) !== (b === 0) || Math.abs(a - b) >= 2
      case 'doorWidthCm':
        return Math.abs(a - b) >= 10
      case 'stepHeightCm':
        return Math.abs(a - b) >= 5
      case 'rampSlopePct':
        return Math.abs(a - b) >= 3
      case 'thresholdCm':
        return Math.abs(a - b) >= 2
      default:
        return a !== b
    }
  }
  return a !== b
}

export function isStale(fact: Pick<Fact, 'date'>, now: Date): boolean {
  const time = ms(fact.date)
  if (Number.isNaN(time)) return false
  const limit = new Date(now)
  limit.setFullYear(limit.getFullYear() - STALE_AFTER_YEARS)
  return time < limit.getTime()
}

export function resolve<K extends FactKey>(facts: FactMap, key: K, now: Date): Resolved<K> {
  const all = [...((facts[key] ?? []) as Fact<K>[])].sort(compareFacts)
  const best = all[0] ?? null
  const conflicts = best
    ? all.filter((f) => f.source !== best.source && valuesDisagree(key, best.value, f.value))
    : []
  return { key, best, conflicts, all, stale: best ? isStale(best, now) : false }
}

export function reliabilityOf(fact: Fact): Reliability {
  return getSource(fact.source).reliability
}

export function addFact<K extends FactKey>(facts: FactMap, key: K, fact: Fact<K>): void {
  const list = (facts[key] ?? []) as Fact<K>[]
  list.push(fact)
  ;(facts as Record<K, Fact<K>[]>)[key] = list
}

/** ISO date (YYYY-MM-DD) part of a timestamp. */
export function isoDay(value: string | Date): string {
  return (typeof value === 'string' ? value : value.toISOString()).slice(0, 10)
}
