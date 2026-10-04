import type { Needs, PresetId } from './types.ts'

export const ANY = 99

/**
 * Starting points for the needs form. Presets describe how someone moves (wheelchair, stroller),
 * not a diagnosis, and every value can be changed afterwards.
 */
export const PRESETS: Record<PresetId, Needs> = {
  wheelchair: {
    maxSteps: 0,
    // A lowered kerb is up to about 3 cm
    maxKerbCm: 3,
    minWidthCm: 80,
    maxSlopePct: 8,
    avoidCobblestones: true,
    needElevator: true,
    needAccessibleToilet: true,
    needBabyChanging: false,
    needRestPlaces: false,
    walkingSpeedKmh: 3.6,
  },
  stroller: {
    maxSteps: 2,
    maxKerbCm: 7,
    minWidthCm: 70,
    maxSlopePct: 10,
    avoidCobblestones: true,
    needElevator: true,
    needAccessibleToilet: false,
    needBabyChanging: true,
    needRestPlaces: false,
    walkingSpeedKmh: 4,
  },
  walking: {
    maxSteps: 3,
    maxKerbCm: 10,
    minWidthCm: 0,
    maxSlopePct: 8,
    avoidCobblestones: true,
    needElevator: true,
    needAccessibleToilet: false,
    needBabyChanging: false,
    needRestPlaces: true,
    walkingSpeedKmh: 3,
  },
}

export const PRESET_ORDER: PresetId[] = ['wheelchair', 'stroller', 'walking']

/** Walking speed used for plain walking (the "shortest route" comparison). */
export const DEFAULT_SPEED_KMH = 4.5

export function samePreset(needs: Needs): PresetId | null {
  for (const id of PRESET_ORDER) {
    const preset = PRESETS[id]
    if ((Object.keys(preset) as (keyof Needs)[]).every((k) => preset[k] === needs[k])) return id
  }
  return null
}

/** Accepts needs saved by an older version and fills in anything missing. */
export function normalizeNeeds(value: unknown): Needs | null {
  if (!value || typeof value !== 'object') return null
  const base = PRESETS.wheelchair
  const result = { ...base }
  for (const key of Object.keys(base) as (keyof Needs)[]) {
    const v = (value as Record<string, unknown>)[key]
    if (typeof v === typeof base[key]) (result as Record<string, unknown>)[key] = v
  }
  return result
}
