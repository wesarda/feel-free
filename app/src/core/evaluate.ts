import type { AlertReport, AlertType, BoardingKerb, Fact, FactKey, Needs, Place, Reliability, SurfaceKind } from './types.ts'
import { reliabilityOf, resolve, type Resolved } from './facts.ts'
import { ANY } from './needs.ts'
import { RELIABILITY_RANK, getSource } from './sources.ts'

/** How a single fact affects the user. `unknown` = data missing; `info` = shown but irrelevant to the needs. */
export type Severity = 'barrier' | 'difficulty' | 'unknown' | 'ok' | 'info'
export type Aspect = 'platform' | 'entrance' | 'door' | 'inside' | 'toilet' | 'babyChanging' | 'surroundings' | 'rest'
export type Verdict = 'match' | 'partial' | 'mismatch' | 'unknown'

type None = object

/** Messages are data, so the same evaluation can be shown in any language. */
export type MsgParams = {
  levelEntrance: None
  stepsRamp: { n: number; slope: number | null }
  rampTooSteep: { n: number; slope: number; max: number }
  rampSlopeUnknown: { n: number }
  stepsLift: { n: number }
  stepsBlocking: { n: number; height: number | null; alternative: 'none' | 'unknown' }
  stepsManageable: { n: number; height: number | null; max: number }
  steps: { n: number; height: number | null }
  handrail: { value: boolean | null }
  entranceUnknown: None
  summaryYes: None
  summaryLimited: None
  summaryNo: None
  summaryConflict: { n: number; summary: string }
  threshold: { cm: number; max: number }
  thresholdUnknown: None
  automaticDoor: None
  doorOk: { cm: number }
  doorTight: { cm: number; min: number }
  doorTooNarrow: { cm: number; min: number }
  doorUnknown: { min: number }
  doorAssumed: None
  singleFloor: None
  elevator: { floors: number | null }
  noElevator: { floors: number }
  elevatorUnknown: { floors: number }
  toilet: None
  noToilet: None
  toiletUnknown: None
  changing: None
  noChanging: None
  changingUnknown: None
  surface: { kind: SurfaceKind }
  surfaceUnknown: None
  boardingKerb: { kind: BoardingKerb }
  boardingKerbUnknown: None
  platformSurface: { kind: SurfaceKind }
  shelter: { value: boolean }
  parking: None
  tactile: None
  seating: None
  noSeating: None
  seatingUnknown: None
  alert: { type: AlertType; date: string; confirmations: number }
}
export type MsgKey = keyof MsgParams
export type Msg = { [K in MsgKey]: { key: K } & MsgParams[K] }[MsgKey]

/** A fact together with the attribute it describes, so it can be labelled and formatted. */
export type KeyedFact = Fact & { key: FactKey }

export type Finding = {
  aspect: Aspect
  severity: Severity
  msg: Msg
  /** Facts the finding is based on, shown with their source, date and reliability. */
  facts: KeyedFact[]
  /** Facts from other sources that disagree. */
  conflicts: KeyedFact[]
  stale: boolean
  /** Missing or conflicting data here prevents a "meets your needs" verdict. */
  required: boolean
  alert?: AlertReport
}

export type Evaluation = {
  verdict: Verdict
  findings: Finding[]
  /** Worst severity per aspect, for compact summaries. Missing aspects are not relevant. */
  aspects: Partial<Record<Aspect, Severity>>
  /** Least reliable source the verdict depends on. */
  weakest: Reliability | null
  usesSample: boolean
  stale: boolean
  conflicts: number
  missing: number
}

export const SEVERITY_ORDER: Severity[] = ['barrier', 'difficulty', 'unknown', 'ok', 'info']
export const ASPECT_ORDER: Aspect[] = ['platform', 'entrance', 'door', 'inside', 'toilet', 'babyChanging', 'rest', 'surroundings']

const ALERT_ASPECT: Record<AlertType, Aspect> = {
  elevatorOutOfOrder: 'inside',
  rampBlocked: 'entrance',
  steps: 'entrance',
  narrowPassage: 'door',
  construction: 'surroundings',
  blockedSidewalk: 'surroundings',
  badSurface: 'surroundings',
  other: 'surroundings',
}

export function evaluatePlace(
  place: Place,
  needs: Needs,
  { now, alerts = [] }: { now: Date; alerts?: AlertReport[] },
): Evaluation {
  const findings: Finding[] = []
  const r = <K extends FactKey>(key: K): Resolved<K> => resolve(place.facts, key, now)

  const add = (
    aspect: Aspect,
    severity: Severity,
    msg: Msg,
    resolved: Resolved[],
    { required = false, extraConflicts = [] as KeyedFact[] } = {},
  ) => {
    const used = resolved.filter((x) => x.best)
    findings.push({
      aspect,
      severity,
      msg,
      facts: used.map((x) => ({ ...(x.best as Fact), key: x.key })),
      conflicts: [...used.flatMap((x) => (x.conflicts as Fact[]).map((f) => ({ ...f, key: x.key }))), ...extraConflicts],
      stale: used.some((x) => x.stale),
      required,
    })
  }

  const stepsRequired = needs.maxSteps < ANY
  // A public transport stop has no entrance, door or toilet: what decides is the platform
  const isStop = place.category === 'stop'

  if (isStop) {
    const kerb = r('boardingKerb')
    if (kerb.best) {
      const kind = kerb.best.value
      // The register says whether the kerb is a raised one, not how high an ordinary kerb is: for someone
      // who cannot take any step that is not enough to promise step-free boarding
      const severity: Severity =
        kind === 'raised' ? 'ok' : kind === 'none' ? (stepsRequired ? 'difficulty' : 'info') : needs.maxSteps === 0 ? 'unknown' : 'ok'
      add('platform', severity, { key: 'boardingKerb', kind }, [kerb], { required: stepsRequired })
    } else {
      add('platform', stepsRequired ? 'unknown' : 'info', { key: 'boardingKerbUnknown' }, [], { required: stepsRequired })
    }
  } else {
    // Entrance
    const steps = r('entranceSteps')
    const height = r('stepHeightCm')
    const ramp = r('ramp')
    const slope = r('rampSlopePct')
    const lift = r('platformLift')
    const handrail = r('handrail')
    const summary = r('wheelchair')

    if (steps.best) {
      const n = steps.best.value
      const h = height.best?.value ?? null
      const hasRamp = ramp.best?.value === true
      const hasLift = lift.best?.value === true
      if (n === 0) {
        add('entrance', 'ok', { key: 'levelEntrance' }, [steps], { required: stepsRequired })
      } else if (!stepsRequired) {
        add('entrance', 'info', { key: 'steps', n, height: h }, [steps, height])
      } else {
        // Ways in, best first: a ramp the user can manage, a lift, then the steps themselves
        const s = slope.best?.value ?? null
        const req = { required: true }
        if (hasRamp && s !== null && s <= needs.maxSlopePct) {
          add('entrance', 'ok', { key: 'stepsRamp', n, slope: s }, [steps, ramp, slope], req)
        } else if (hasLift) {
          add('entrance', 'ok', { key: 'stepsLift', n }, [steps, lift], req)
        } else if (hasRamp && s === null) {
          add('entrance', n <= needs.maxSteps ? 'difficulty' : 'unknown', { key: 'rampSlopeUnknown', n }, [steps, ramp], req)
        } else if (n <= needs.maxSteps) {
          add('entrance', 'difficulty', { key: 'stepsManageable', n, height: h, max: needs.maxSteps }, [steps, height], req)
        } else if (hasRamp && s !== null) {
          const severity = s > needs.maxSlopePct * 1.5 ? 'barrier' : 'difficulty'
          add('entrance', severity, { key: 'rampTooSteep', n, slope: s, max: needs.maxSlopePct }, [steps, ramp, slope], req)
        } else {
          const known = ramp.best?.value === false && lift.best?.value === false
          const msg: Msg = { key: 'stepsBlocking', n, height: h, alternative: known ? 'none' : 'unknown' }
          add('entrance', 'barrier', msg, [steps, height, ramp, lift], req)
        }
      }

      if (n > 0 && needs.maxSteps > 0 && stepsRequired) {
        const value = handrail.best?.value ?? null
        add('entrance', value === false ? 'difficulty' : value ? 'ok' : 'info', { key: 'handrail', value }, [handrail])
      }

      // A summary tag that contradicts the detailed data is a conflict worth showing
      const s = summary.best?.value
      if ((s === 'yes' && n > 0 && !hasRamp && !hasLift) || (s === 'no' && n === 0)) {
        add('entrance', 'unknown', { key: 'summaryConflict', n, summary: `wheelchair=${s}` }, [steps], {
          required: stepsRequired,
          extraConflicts: [{ ...(summary.best as Fact), key: 'wheelchair' }],
        })
      }
    } else if (summary.best) {
      const s = summary.best.value
      if (s === 'yes') {
        add('entrance', 'ok', { key: 'summaryYes' }, [summary], { required: stepsRequired })
      } else if (s === 'limited') {
        add('entrance', needs.maxSteps === 0 ? 'difficulty' : 'ok', { key: 'summaryLimited' }, [summary], {
          required: stepsRequired,
        })
      } else {
        const severity = needs.maxSteps === 0 ? 'barrier' : stepsRequired ? 'difficulty' : 'info'
        add('entrance', severity, { key: 'summaryNo' }, [summary], { required: stepsRequired })
      }
    } else {
      add('entrance', stepsRequired ? 'unknown' : 'info', { key: 'entranceUnknown' }, [], { required: stepsRequired })
    }

    const threshold = r('thresholdCm')
    if (threshold.best) {
      const cm = threshold.best.value
      add('entrance', cm > needs.maxKerbCm ? 'difficulty' : 'ok', { key: 'threshold', cm, max: needs.maxKerbCm }, [
        threshold,
      ])
    } else if (needs.maxSteps === 0) {
      add('entrance', 'info', { key: 'thresholdUnknown' }, [])
    }

    const automatic = r('automaticDoor')
    if (automatic.best?.value) add('entrance', 'ok', { key: 'automaticDoor' }, [automatic])

    // Door
    const door = r('doorWidthCm')
    if (needs.minWidthCm > 0) {
      const min = needs.minWidthCm
      if (door.best) {
        const cm = door.best.value
        if (cm < min) add('door', 'barrier', { key: 'doorTooNarrow', cm, min }, [door], { required: true })
        else if (cm < min + 10) add('door', 'difficulty', { key: 'doorTight', cm, min }, [door], { required: true })
        else add('door', 'ok', { key: 'doorOk', cm }, [door], { required: true })
      } else if (summary.best?.value === 'yes' && !steps.best?.value) {
        add('door', 'ok', { key: 'doorAssumed' }, [summary], { required: true })
      } else {
        add('door', 'unknown', { key: 'doorUnknown', min }, [], { required: true })
      }
    } else if (door.best) {
      add('door', 'info', { key: 'doorOk', cm: door.best.value }, [door])
    }

    // Inside: upper floors
    const floors = r('floors')
    const elevator = r('elevator')
    const floorCount = floors.best?.value ?? null
    if (floorCount !== null && floorCount > 1) {
      if (elevator.best?.value === true) {
        add('inside', 'ok', { key: 'elevator', floors: floorCount }, [elevator, floors], { required: needs.needElevator })
      } else if (elevator.best?.value === false) {
        add('inside', needs.needElevator ? 'difficulty' : 'info', { key: 'noElevator', floors: floorCount }, [
          elevator,
          floors,
        ])
      } else {
        add('inside', needs.needElevator ? 'unknown' : 'info', { key: 'elevatorUnknown', floors: floorCount }, [floors], {
          required: needs.needElevator,
        })
      }
    } else if (floorCount === 1) {
      add('inside', 'ok', { key: 'singleFloor' }, [floors])
    } else if (elevator.best?.value === true) {
      add('inside', 'ok', { key: 'elevator', floors: null }, [elevator])
    }

    // Toilet
    const toilet = r('accessibleToilet')
    if (toilet.best) {
      if (toilet.best.value) add('toilet', 'ok', { key: 'toilet' }, [toilet], { required: needs.needAccessibleToilet })
      else add('toilet', needs.needAccessibleToilet ? 'difficulty' : 'info', { key: 'noToilet' }, [toilet])
    } else {
      add('toilet', needs.needAccessibleToilet ? 'unknown' : 'info', { key: 'toiletUnknown' }, [], {
        required: needs.needAccessibleToilet,
      })
    }

    // Baby changing
    const changing = r('babyChanging')
    if (changing.best) {
      if (changing.best.value) add('babyChanging', 'ok', { key: 'changing' }, [changing], { required: needs.needBabyChanging })
      else add('babyChanging', needs.needBabyChanging ? 'difficulty' : 'info', { key: 'noChanging' }, [changing])
    } else if (needs.needBabyChanging) {
      add('babyChanging', 'unknown', { key: 'changingUnknown' }, [], { required: true })
    }
  }

  // Rest places
  const seating = r('seating')
  if (seating.best) {
    if (seating.best.value) add('rest', 'ok', { key: 'seating' }, [seating])
    else add('rest', needs.needRestPlaces ? 'difficulty' : 'info', { key: 'noSeating' }, [seating])
  } else if (needs.needRestPlaces) {
    add('rest', 'unknown', { key: 'seatingUnknown' }, [])
  }
  const shelter = r('shelter')
  if (shelter.best) add('rest', shelter.best.value ? 'ok' : 'info', { key: 'shelter', value: shelter.best.value }, [shelter])

  // Surroundings
  const surface = r('surface')
  if (surface.best) {
    const kind = surface.best.value
    const rough = kind === 'cobblestone' || kind === 'gravel' || kind === 'unpaved'
    add('surroundings', rough ? (needs.avoidCobblestones ? 'difficulty' : 'info') : 'ok', { key: isStop ? 'platformSurface' : 'surface', kind }, [surface])
  } else if (needs.avoidCobblestones && !isStop) {
    add('surroundings', 'info', { key: 'surfaceUnknown' }, [])
  }
  const parking = r('disabledParking')
  if (parking.best?.value) add('surroundings', 'ok', { key: 'parking' }, [parking])
  const tactile = r('tactilePaving')
  if (tactile.best?.value) add('surroundings', 'info', { key: 'tactile' }, [tactile])

  // Temporary problems reported by users
  for (const alert of alerts) {
    if (Date.parse(alert.expiresAt) < now.getTime()) continue
    const aspect = ALERT_ASPECT[alert.alertType]
    const relevant =
      (aspect === 'inside' && needs.needElevator) ||
      (aspect === 'entrance' && needs.maxSteps < ANY) ||
      (aspect === 'door' && needs.minWidthCm > 0) ||
      aspect === 'surroundings'
    findings.push({
      aspect,
      severity: relevant ? 'difficulty' : 'info',
      msg: { key: 'alert', type: alert.alertType, date: alert.createdAt, confirmations: alert.confirmations.length },
      facts: [],
      conflicts: [],
      stale: false,
      required: false,
      alert,
    })
  }

  return summarize(findings)
}

export function worstSeverity(severities: Severity[]): Severity | null {
  let worst: Severity | null = null
  for (const s of severities) {
    if (worst === null || SEVERITY_ORDER.indexOf(s) < SEVERITY_ORDER.indexOf(worst)) worst = s
  }
  return worst
}

function summarize(findings: Finding[]): Evaluation {
  let verdict: Verdict = 'match'
  const rank: Record<Verdict, number> = { mismatch: 3, partial: 2, unknown: 1, match: 0 }
  const raise = (v: Verdict) => {
    if (rank[v] > rank[verdict]) verdict = v
  }
  let conflicts = 0
  let missing = 0
  for (const f of findings) {
    if (f.severity === 'barrier') raise('mismatch')
    else if (f.severity === 'difficulty') raise('partial')
    if (f.required && (f.severity === 'unknown' || f.conflicts.length > 0)) raise('unknown')
    if (f.conflicts.length > 0) conflicts++
    if (f.severity === 'unknown') missing++
  }

  const aspects: Partial<Record<Aspect, Severity>> = {}
  for (const aspect of ASPECT_ORDER) {
    const worst = worstSeverity(findings.filter((f) => f.aspect === aspect).map((f) => f.severity))
    if (worst) aspects[aspect] = worst
  }

  const decisive = findings.filter((f) => f.severity !== 'info').flatMap((f) => f.facts)
  let weakest: Reliability | null = null
  for (const fact of decisive) {
    const rel = reliabilityOf(fact)
    if (weakest === null || RELIABILITY_RANK[rel] < RELIABILITY_RANK[weakest]) weakest = rel
  }

  return {
    verdict,
    findings,
    aspects,
    weakest,
    usesSample: findings.some((f) => [...f.facts, ...f.conflicts].some((fact) => getSource(fact.source).sample)),
    stale: findings.some((f) => f.stale && f.severity !== 'info'),
    conflicts,
    missing,
  }
}
