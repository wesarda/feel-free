import type { Severity } from '../evaluate.ts'
import { ANY } from '../needs.ts'
import type { Needs, WheelchairTag } from '../types.ts'

/*
 * How OpenStreetMap tags on footways translate into barriers for a given set of needs.
 * Kept separate from the graph code so the rules can be read, tested and tuned on their own.
 */

export type SurfaceClass = 'smooth' | 'cobblestone' | 'rough' | 'unpaved'

const SURFACES: Record<string, SurfaceClass> = {
  asphalt: 'smooth',
  concrete: 'smooth',
  'concrete:plates': 'smooth',
  'concrete:lanes': 'smooth',
  paving_stones: 'smooth',
  'paving_stones:30': 'smooth',
  paved: 'smooth',
  metal: 'smooth',
  wood: 'smooth',
  rubber: 'smooth',
  tartan: 'smooth',
  sett: 'cobblestone',
  cobblestone: 'cobblestone',
  'cobblestone:flattened': 'cobblestone',
  unhewn_cobblestone: 'rough',
  bricks: 'cobblestone',
  grass_paver: 'rough',
  stepping_stones: 'rough',
  pebblestone: 'rough',
  compacted: 'unpaved',
  fine_gravel: 'unpaved',
  gravel: 'rough',
  unpaved: 'unpaved',
  ground: 'unpaved',
  dirt: 'unpaved',
  earth: 'unpaved',
  grass: 'rough',
  sand: 'rough',
  mud: 'rough',
  woodchips: 'rough',
}

export const surfaceClass = (value?: string): SurfaceClass | null => (value ? (SURFACES[value] ?? null) : null)

/** Kerb height in cm from kerb:height or the kerb type (typical values). */
export function kerbHeightCm(tags: Record<string, string>): number | null {
  const explicit = tags['kerb:height']
  if (explicit) {
    const m = explicit.replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(cm|m)?$/)
    if (m) {
      const n = parseFloat(m[1])
      return m[2] === 'cm' || (!m[2] && n >= 1) ? n : Math.round(n * 100)
    }
  }
  switch (tags.kerb) {
    case 'flush':
    case 'no':
      return 0
    case 'lowered':
      return 3
    case 'rolled':
      return 6
    case 'raised':
      return 12
    default:
      return null
  }
}

export const hasKerb = (tags: Record<string, string>) => tags.kerb !== undefined || tags.barrier === 'kerb' || tags['kerb:height'] !== undefined

export function parseIncline(value?: string): number | null | undefined {
  if (!value) return undefined
  const m = value.replace(',', '.').match(/^(-?\d+(?:\.\d+)?)\s*%$/)
  if (m) return Math.abs(parseFloat(m[1]))
  if (value === 'up' || value === 'down' || value === 'yes') return null
  return undefined
}

export function parseWidthM(value?: string): number | undefined {
  if (!value) return undefined
  const m = value.replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(m|cm)?$/)
  if (!m) return undefined
  const n = parseFloat(m[1])
  return m[2] === 'cm' ? n / 100 : n
}

const STEP_RUN_M = 0.3
const PASSABLE_BARRIERS = new Set(['gate', 'lift_gate', 'swing_gate', 'bollard', 'chain', 'block', 'entrance', 'border_control', 'toll_booth', 'height_restrictor', 'sliding_gate', 'wicket_gate'])
const BLOCKING_BARRIERS = new Set(['kissing_gate', 'stile', 'turnstile', 'full-height_turnstile', 'cycle_barrier', 'motorcycle_barrier', 'step', 'log'])

export type IssueKind =
  | 'steps'
  | 'escalator'
  | 'surface'
  | 'smoothness'
  | 'incline'
  | 'narrow'
  | 'wheelchairNo'
  | 'wheelchairLimited'
  | 'noSidewalk'
  | 'kerb'
  | 'kerbUnknown'
  | 'barrier'
  | 'elevator'

export type Issue = {
  kind: IssueKind
  severity: Severity
  /** Steps count, kerb height (cm), incline (%), width (cm), surface or barrier type. */
  value?: number | string | null
  estimated?: boolean
}

export type WayAssessment = {
  issues: Issue[]
  /** Multiplies the length in the route cost. */
  factor: number
  /** Added to the route cost, in metres of walking. */
  penalty: number
  surface: SurfaceClass | null
}

/** Cost of one barrier the route could not avoid: a long detour is better than a barrier. */
export const BARRIER_PENALTY = 4000
const DIFFICULTY_PENALTY = 150
const isWheelchairLike = (needs: Needs) => needs.maxSteps === 0

const WALK_HIGHWAYS = new Set(['footway', 'pedestrian', 'path', 'steps', 'living_street', 'corridor', 'platform', 'bridleway', 'track'])
const ROADS_NEEDING_SIDEWALK = new Set(['primary', 'primary_link', 'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'unclassified', 'road'])

export function assessWay(tags: Record<string, string>, lengthM: number, needs: Needs): WayAssessment {
  const issues: Issue[] = []
  let factor = 1
  let penalty = 0
  // Point-like problems (steps, a narrow passage) cost a fixed detour; stretches (surface) scale with length
  const add = (issue: Issue, pointLike = true) => {
    issues.push(issue)
    if (issue.severity === 'barrier') penalty += BARRIER_PENALTY
    else if (issue.severity === 'difficulty' && pointLike) penalty += DIFFICULTY_PENALTY
  }

  // Steps
  if (tags.highway === 'steps') {
    const known = tags.step_count && /^\d+$/.test(tags.step_count) ? parseInt(tags.step_count, 10) : null
    const count = known ?? Math.max(1, Math.round(lengthM / STEP_RUN_M))
    const wheelchairRamp = tags['ramp:wheelchair'] === 'yes'
    const strollerRamp = wheelchairRamp || tags['ramp:stroller'] === 'yes'
    if (tags.conveying && tags.conveying !== 'no') {
      add({ kind: 'escalator', severity: isWheelchairLike(needs) ? 'barrier' : 'difficulty' })
    } else if ((isWheelchairLike(needs) && wheelchairRamp) || (!isWheelchairLike(needs) && strollerRamp && needs.maxSteps < count)) {
      add({ kind: 'steps', severity: 'ok', value: count, estimated: known === null })
    } else if (needs.maxSteps >= ANY) {
      add({ kind: 'steps', severity: 'info', value: count, estimated: known === null })
    } else {
      add({ kind: 'steps', severity: count <= needs.maxSteps ? 'difficulty' : 'barrier', value: count, estimated: known === null })
    }
  }

  // Wheelchair tag on the way itself
  const wheelchair = tags.wheelchair as WheelchairTag | undefined
  if (wheelchair === 'no' && isWheelchairLike(needs) && tags.highway !== 'steps') add({ kind: 'wheelchairNo', severity: 'barrier' })
  else if (wheelchair === 'limited' && isWheelchairLike(needs)) add({ kind: 'wheelchairLimited', severity: 'difficulty' })

  // Surface and smoothness
  const surface = surfaceClass(tags.surface)
  if (surface === 'cobblestone') {
    if (needs.avoidCobblestones) {
      add({ kind: 'surface', severity: 'difficulty', value: tags.surface }, false)
      factor *= 1.8
    }
  } else if (surface === 'rough' || surface === 'unpaved') {
    const severity = isWheelchairLike(needs) && surface === 'rough' ? 'barrier' : needs.avoidCobblestones ? 'difficulty' : 'info'
    add({ kind: 'surface', severity, value: tags.surface }, false)
    factor *= 2.2
  }
  if (['bad', 'very_bad', 'horrible', 'very_horrible', 'impassable'].includes(tags.smoothness ?? '')) {
    const severity = isWheelchairLike(needs) && tags.smoothness !== 'bad' ? 'barrier' : 'difficulty'
    add({ kind: 'smoothness', severity, value: tags.smoothness }, false)
    factor *= 1.5
  }

  // Incline
  const incline = parseIncline(tags.incline)
  if (typeof incline === 'number' && incline > needs.maxSlopePct && tags.highway !== 'steps') {
    add({ kind: 'incline', severity: incline > needs.maxSlopePct * 1.5 ? 'barrier' : 'difficulty', value: incline })
  }

  // Width of footways
  const width = parseWidthM(tags.width ?? tags['est_width'])
  if (width !== undefined && needs.minWidthCm > 0 && WALK_HIGHWAYS.has(tags.highway)) {
    const cm = Math.round(width * 100)
    if (cm < needs.minWidthCm) add({ kind: 'narrow', severity: 'barrier', value: cm })
    else if (cm < needs.minWidthCm + 20) add({ kind: 'narrow', severity: 'difficulty', value: cm })
  }

  // Walking on a busy road without a sidewalk
  if (ROADS_NEEDING_SIDEWALK.has(tags.highway)) {
    const sidewalk = tags.sidewalk ?? tags['sidewalk:both']
    if (sidewalk === 'no' || sidewalk === 'none') {
      add({ kind: 'noSidewalk', severity: 'difficulty' }, false)
      factor *= 2
    } else if (!sidewalk || sidewalk === 'separate') {
      // A separately mapped sidewalk exists or we do not know: prefer real footways
      factor *= sidewalk === 'separate' ? 1.6 : 1.25
    }
  }

  // Prefer segments whose surface we know
  if (surface === null && WALK_HIGHWAYS.has(tags.highway) && needs.avoidCobblestones) factor *= 1.1

  return { issues, factor, penalty, surface }
}

export type NodeAssessment = { issues: Issue[]; penalty: number }

export function assessNode(tags: Record<string, string>, needs: Needs, { brokenElevator = false } = {}): NodeAssessment {
  const issues: Issue[] = []
  let penalty = 0
  const add = (issue: Issue) => {
    issues.push(issue)
    if (issue.severity === 'barrier') penalty += BARRIER_PENALTY
    else if (issue.severity === 'difficulty') penalty += DIFFICULTY_PENALTY
    else if (issue.severity === 'unknown') penalty += 15
  }

  if (hasKerb(tags)) {
    const h = kerbHeightCm(tags)
    if (h === null) {
      if (needs.maxKerbCm < ANY) add({ kind: 'kerbUnknown', severity: 'unknown' })
    } else if (h <= needs.maxKerbCm) {
      add({ kind: 'kerb', severity: 'ok', value: h })
    } else {
      add({ kind: 'kerb', severity: h <= needs.maxKerbCm * 2 + 2 ? 'difficulty' : 'barrier', value: h })
    }
  }

  const barrier = tags.barrier
  if (barrier && barrier !== 'kerb') {
    if (tags.wheelchair === 'no' && isWheelchairLike(needs)) add({ kind: 'barrier', severity: 'barrier', value: barrier })
    else if (BLOCKING_BARRIERS.has(barrier)) {
      const severity = needs.maxSteps < ANY && (isWheelchairLike(needs) || needs.minWidthCm > 0) ? 'barrier' : 'difficulty'
      add({ kind: 'barrier', severity, value: barrier })
    } else if (!PASSABLE_BARRIERS.has(barrier)) {
      add({ kind: 'barrier', severity: 'unknown', value: barrier })
    }
  }

  if (tags.highway === 'elevator') {
    if (brokenElevator) add({ kind: 'elevator', severity: isWheelchairLike(needs) ? 'barrier' : 'difficulty', value: 'broken' })
    else add({ kind: 'elevator', severity: 'ok' })
  }

  return { issues, penalty }
}
