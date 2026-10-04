import type { RouteEvent } from './core/route/plan'
import type { AlertType } from './core/types'
import type { Messages } from './i18n/en'

/** One line describing something on the route, in the current language. */
export function eventText(e: RouteEvent, t: Messages, distance: (m: number) => string): string {
  const ev = t.route.events
  const n = typeof e.value === 'number' ? e.value : 0
  switch (e.kind) {
    case 'steps':
      return e.severity === 'ok' ? ev.stepsRamp(n) : ev.steps(n, Boolean(e.estimated))
    case 'escalator':
      return ev.escalator()
    case 'surface':
      return ev.surface(t.route.osmSurfaces[String(e.value)] ?? String(e.value), distance(e.length ?? 0))
    case 'smoothness':
      return ev.smoothness(String(e.value))
    case 'incline':
      return ev.incline(n, distance(e.length ?? 0))
    case 'narrow':
      return ev.narrow(n)
    case 'wheelchairNo':
      return ev.wheelchairNo()
    case 'wheelchairLimited':
      return ev.wheelchairLimited()
    case 'noSidewalk':
      return ev.noSidewalk(distance(e.length ?? 0))
    case 'kerb':
      return ev.kerb(n)
    case 'kerbUnknown':
      return ev.kerbUnknown()
    case 'barrier':
      return ev.barrier(String(e.value))
    case 'elevator':
      return ev.elevator(e.value === 'broken')
    case 'bench':
      return ev.bench()
    case 'toilet':
      return ev.toilet(n)
    case 'alert':
      return ev.alert(t.alertTypes[e.value as AlertType] ?? String(e.value))
  }
}
