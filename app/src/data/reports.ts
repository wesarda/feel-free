import type { AlertReport, AlertType, FactKey, FactValues, LngLat, Place, Report } from '../core/types.ts'
import { addFact } from '../core/facts.ts'
import { distanceM } from '../core/geo.ts'

/** Temporary problems disappear after this many days unless someone confirms them again. */
export const ALERT_TTL_DAYS = 14
const DAY = 86400000

export const MAP_ALERT_TYPES: AlertType[] = [
  'steps',
  'blockedSidewalk',
  'construction',
  'badSurface',
  'narrowPassage',
  'elevatorOutOfOrder',
  'other',
]
export const PLACE_ALERT_TYPES: AlertType[] = ['elevatorOutOfOrder', 'rampBlocked', 'construction', 'narrowPassage', 'other']

/** Facts a user can correct, with the values offered in the form. */
export const CORRECTABLE: { key: FactKey; options: FactValues[FactKey][] }[] = [
  { key: 'entranceSteps', options: [0, 1, 2, 3, 4, 5, 6, 8, 10] },
  { key: 'ramp', options: [true, false] },
  { key: 'platformLift', options: [true, false] },
  { key: 'doorWidthCm', options: [60, 70, 75, 80, 85, 90, 100, 120, 150] },
  { key: 'thresholdCm', options: [0, 1, 2, 3, 5, 8] },
  { key: 'elevator', options: [true, false] },
  { key: 'accessibleToilet', options: [true, false] },
  { key: 'babyChanging', options: [true, false] },
  { key: 'seating', options: [true, false] },
  { key: 'surface', options: ['smooth', 'paving', 'cobblestone', 'gravel', 'unpaved'] },
]

const id = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Math.random()))

export function newAlert(alertType: AlertType, coords: LngLat, comment: string, now: Date, placeId?: string): Report {
  return {
    id: id(),
    kind: 'alert',
    alertType,
    coords,
    placeId,
    comment,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ALERT_TTL_DAYS * DAY).toISOString(),
    confirmations: [],
    source: 'reports',
  }
}

export function newCorrection<K extends FactKey>(place: Place, factKey: K, value: FactValues[K], comment: string, now: Date): Report {
  return {
    id: id(),
    kind: 'correction',
    placeId: place.id,
    coords: place.coords,
    factKey,
    value,
    comment,
    createdAt: now.toISOString(),
    source: 'reports',
  }
}

export function newDeclaration(place: Place, values: Partial<FactValues>, comment: string, now: Date): Report {
  return {
    id: id(),
    kind: 'declaration',
    placeId: place.id,
    coords: place.coords,
    values,
    comment,
    createdAt: now.toISOString(),
    source: 'owner-pending',
  }
}

export function newConfirmation(place: Place, now: Date): Report {
  return { id: id(), kind: 'confirmation', placeId: place.id, coords: place.coords, comment: '', createdAt: now.toISOString(), source: 'reports' }
}

/** "Still there": the alert lives another full period. */
export function confirmAlert(report: AlertReport, now: Date): AlertReport {
  return {
    ...report,
    confirmations: [...report.confirmations, now.toISOString()],
    expiresAt: new Date(now.getTime() + ALERT_TTL_DAYS * DAY).toISOString(),
  }
}

export function isActive(report: Report, now: Date): boolean {
  return report.kind !== 'alert' || Date.parse(report.expiresAt) > now.getTime()
}

export function activeAlerts(reports: Report[], now: Date): AlertReport[] {
  return reports.filter((r): r is AlertReport => r.kind === 'alert' && isActive(r, now))
}

/** Alerts attached to the place, or reported on the map within 25 m of it. */
export function alertsForPlace(place: Place, alerts: AlertReport[]): AlertReport[] {
  return alerts.filter((a) => a.placeId === place.id || (!a.placeId && distanceM(a.coords, place.coords) < 25))
}

/** User corrections and owner declarations become facts next to the original data, with their own source. */
export function withCorrections(place: Place, reports: Report[]): Place {
  const own = reports.filter(
    (r) => (r.kind === 'correction' || r.kind === 'declaration') && (r.placeId === place.id || place.aliases?.includes(r.placeId)),
  )
  if (own.length === 0) return place
  const facts = Object.fromEntries(Object.entries(place.facts).map(([k, v]) => [k, [...v]])) as Place['facts']
  for (const r of own) {
    const note = r.comment || undefined
    if (r.kind === 'correction') addFact(facts, r.factKey, { value: r.value, source: r.source, date: r.createdAt, note })
    if (r.kind === 'declaration') {
      for (const [key, value] of Object.entries(r.values) as [FactKey, FactValues[FactKey]][]) {
        addFact(facts, key, { value, source: r.source, date: r.createdAt, note })
      }
    }
  }
  return { ...place, facts }
}

export function confirmationsFor(placeId: string, reports: Report[]): string[] {
  return reports
    .filter((r) => r.kind === 'confirmation' && r.placeId === placeId)
    .map((r) => r.createdAt)
    .sort()
}

type LegacyReport = { id: string; coords: LngLat; type: string; comment?: string; createdAt: string }

const LEGACY_TYPES: Record<string, AlertType> = {
  steps: 'steps',
  brokenElevator: 'elevatorOutOfOrder',
  blockedSidewalk: 'blockedSidewalk',
  badSurface: 'badSurface',
  narrowPassage: 'narrowPassage',
  other: 'other',
}

/** Reports saved by the first version of the prototype (key `cwb.reports`). */
export function migrateLegacyReports(value: unknown): Report[] {
  if (!Array.isArray(value)) return []
  return (value as LegacyReport[])
    .filter((r) => r && Array.isArray(r.coords) && typeof r.createdAt === 'string')
    .map((r) => ({
      id: r.id,
      kind: 'alert' as const,
      alertType: LEGACY_TYPES[r.type] ?? 'other',
      coords: r.coords,
      comment: r.comment ?? '',
      createdAt: r.createdAt,
      expiresAt: new Date(Date.parse(r.createdAt) + ALERT_TTL_DAYS * DAY).toISOString(),
      confirmations: [],
      source: 'reports',
    }))
}
