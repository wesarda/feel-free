import { SEVERITY_ORDER, type Evaluation } from './core/evaluate.ts'
import { usualRoute, type RoutePlan } from './core/route/plan.ts'
import type { Lang, Place } from './core/types.ts'
import { placeName } from './format.ts'
import type { Messages } from './i18n/en.ts'
import { eventText } from './routeText.ts'
import { findingText } from './text.ts'

/** A place as it is read aloud: what it is, the rating, then what decides it, most serious first. */
export function placeSpeech(place: Place, evaluation: Evaluation | null, t: Messages, lang: Lang): string[] {
  const category = t.categories[place.category]
  const lines = [placeName(place, lang) || category, [category, place.address].filter(Boolean).join(', ')]
  if (!evaluation) return [...lines, t.vision.noNeeds]
  lines.push(`${t.verdict[evaluation.verdict]}.`)
  const findings = evaluation.findings
    .filter((f) => f.severity !== 'info')
    .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
  for (const f of findings) lines.push(`${t.severity[f.severity]}: ${findingText(f, t)}`)
  return lines
}

/** A route as it is read aloud: the rating and length, what is on the way in walking order, then where to go. */
export function routeSpeech(plan: RoutePlan, t: Messages, distance: (m: number) => string): string[] {
  if (plan.notOnNetwork) return [t.route.notOnNetwork]
  const route = plan.accessible
  if (!route) return [t.route.noRoute]
  const lines: string[] = []
  // The usual route and what is in the way on it come first, then the route planned for the user
  const usual = usualRoute(plan)
  if (usual) {
    lines.push(`${t.route.usual}, ${distance(usual.route.length)}: ${t.verdict[usual.route.verdict]}.`)
    lines.push(usual.obstacles.length ? t.route.usualObstacles(usual.route.summary.barriers, usual.route.summary.difficulties) : t.route.usualClear)
    lines.push(`${t.route.easier}.`)
  }
  lines.push(`${t.verdict[route.verdict]}. ${t.route.distance(distance(route.length), route.durationMin)}`)
  lines.push(usual ? t.route.easierLonger(distance(route.length - usual.route.length)) : t.route.sameAsShortest, t.route.verdictHelp[route.verdict])
  const events = route.events.filter((e) => e.severity !== 'info')
  lines.push(events.length ? `${t.route.onTheWay}:` : t.route.nothingOnTheWay)
  for (const e of events) {
    lines.push(`${t.vision.after(distance(e.at))}: ${t.severity[e.severity]}. ${eventText(e, t, distance)}${e.street ? `, ${e.street}` : ''}`)
  }
  const legs = route.legs.filter((l) => l.length >= 5)
  if (legs.length) lines.push(`${t.route.directions}:`)
  for (const leg of legs) {
    const name = leg.name ? (leg.kind === 'crossing' ? `${t.route.legKinds.crossing} (${leg.name})` : leg.name) : t.route.legKinds[leg.kind]
    lines.push(t.route.leg(name, distance(leg.length)))
  }
  return lines
}
