import { resolve } from './core/facts'
import type { FactKey, Place } from './core/types'
import type { EntranceData } from './components/EntrancePreview'

/** Entrance drawing data for any place: what no source says stays null and is drawn as unknown. */
export function entranceData(place: Place, now: Date): EntranceData {
  const v = <K extends FactKey>(key: K) => resolve(place.facts, key, now).best?.value
  return {
    steps: v('entranceSteps') ?? null,
    summary: v('wheelchair') ?? null,
    stepHeightCm: v('stepHeightCm') ?? null,
    handrail: v('handrail') ?? null,
    ramp: v('ramp') === true,
    rampSlopePct: v('rampSlopePct') ?? null,
    platformLift: v('platformLift') === true,
    doorWidthCm: v('doorWidthCm') ?? null,
    automaticDoor: v('automaticDoor') === true,
    tactilePaving: v('tactilePaving') === true,
    cobblestone: v('surface') === 'cobblestone',
  }
}
