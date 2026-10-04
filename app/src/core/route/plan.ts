import type { Severity, Verdict } from '../evaluate.ts'
import { distanceM, projectOnLine } from '../geo.ts'
import { ANY, DEFAULT_SPEED_KMH } from '../needs.ts'
import type { AlertReport, LngLat, Needs } from '../types.ts'
import { nearestNodes, type Graph, type OsmFeature } from './graph.ts'
import { assessNode, assessWay, hasKerb, type IssueKind, type NodeAssessment, type WayAssessment } from './rules.ts'
import { shortestPath, type SearchResult } from './search.ts'

export type RouteEventKind = IssueKind | 'bench' | 'toilet' | 'alert'

export type RouteEvent = {
  kind: RouteEventKind
  severity: Severity
  /** Metres from the start. */
  at: number
  /** Length of a stretch (surface, incline), in metres. */
  length?: number
  coords: LngLat
  value?: number | string | null
  estimated?: boolean
  source: string
  url?: string
  date?: string
  street?: string
  alert?: AlertReport
}

export type SegmentSeverity = 'ok' | 'difficulty' | 'barrier' | 'unknown'
export type RouteSegment = { coords: LngLat[]; sev: SegmentSeverity }
export type RouteLeg = { name: string | null; kind: 'street' | 'footway' | 'crossing' | 'steps' | 'square'; length: number; at: number }

export type RouteReport = {
  verdict: Verdict
  length: number
  durationMin: number
  line: LngLat[]
  segments: RouteSegment[]
  events: RouteEvent[]
  legs: RouteLeg[]
  summary: {
    barriers: number
    difficulties: number
    unknowns: number
    steps: number
    cobblestoneM: number
    unknownSurfaceM: number
    kerbs: number
    kerbsUnknown: number
    benches: number
    longestWithoutRestM: number
    accessibleToilets: number
    alerts: number
  }
  dates: { oldest?: string; newest?: string }
}

export type RoutePlan = {
  accessible: RouteReport | null
  shortest: RouteReport | null
  /** The start or end is too far from any footway in the data. */
  notOnNetwork: boolean
}

/**
 * The usual way (the shortest one, as an ordinary map would lead) when it is not the route planned for
 * the user's needs, with what stands in the way on it: barriers first, then difficulties, each in
 * walking order. Null when both are the same route.
 */
export function usualRoute(plan: RoutePlan): { route: RouteReport; obstacles: RouteEvent[] } | null {
  const { accessible, shortest } = plan
  if (!accessible || !shortest || shortest.length >= accessible.length - 5) return null
  const obstacles = shortest.events
    .filter((e) => e.severity === 'barrier' || e.severity === 'difficulty')
    .sort((a, b) => Number(b.severity === 'barrier') - Number(a.severity === 'barrier') || a.at - b.at)
  return { route: shortest, obstacles }
}

const osmLink = (f: OsmFeature) => `https://www.openstreetmap.org/${f.type}/${f.id}`
const ROUTE_ALERTS = new Set(['blockedSidewalk', 'construction', 'steps', 'badSurface', 'narrowPassage', 'other'])
const NEAR_ROUTE_M = 20
const UNKNOWN_SURFACE_SHARE = 0.25

function legKind(tags: Record<string, string>): RouteLeg['kind'] {
  if (tags.footway === 'crossing' || tags.crossing) return 'crossing'
  if (tags.highway === 'steps') return 'steps'
  if (tags.highway === 'pedestrian' || tags.area === 'yes') return 'square'
  if (['footway', 'path', 'corridor', 'platform', 'bridleway', 'track'].includes(tags.highway)) return 'footway'
  return 'street'
}

type Costs = { way: (w: number) => WayAssessment; node: (n: number) => NodeAssessment }

function costModel(graph: Graph, needs: Needs, alerts: AlertReport[]): Costs {
  const wayCache = new Map<number, WayAssessment>()
  const nodeCache = new Map<number, NodeAssessment>()
  const broken = alerts.filter((a) => a.alertType === 'elevatorOutOfOrder')
  const obstacles = alerts.filter((a) => ROUTE_ALERTS.has(a.alertType))
  return {
    way: (w) => {
      let a = wayCache.get(w)
      if (!a) {
        // The whole way's length matters for steps without step_count (estimated from the flight length)
        a = assessWay(graph.ways[w].tags, graph.wayLength[w], needs)
        wayCache.set(w, a)
      }
      return a
    },
    node: (n) => {
      let a = nodeCache.get(n)
      if (!a) {
        const feature = graph.nodeTags.get(graph.ids[n])
        const at = graph.coords[n]
        const brokenElevator = broken.some((b) => distanceM(b.coords, at) < 30)
        a = feature ? assessNode(feature.tags, needs, { brokenElevator }) : { issues: [], penalty: 0 }
        // Unverified obstacle reports nearby: avoid if there is a reasonable alternative
        if (obstacles.some((o) => distanceM(o.coords, at) < NEAR_ROUTE_M)) a = { ...a, penalty: a.penalty + 300 }
        nodeCache.set(n, a)
      }
      return a
    },
  }
}

/**
 * Where a route can join the network: the nearest node and others almost as near (in case the nearest
 * is on an isolated bit of footway). Walking off the network costs extra, so it is never a shortcut.
 */
function access(graph: Graph, at: LngLat) {
  const candidates = nearestNodes(graph, at, 8)
  const limit = (candidates[0]?.distance ?? 0) + 40
  return candidates.filter((c) => c.distance <= limit).map((c) => ({ node: c.node, cost: c.distance * 3 }))
}

function search(graph: Graph, from: LngLat, to: LngLat, cost: Parameters<typeof shortestPath>[3]): SearchResult | null {
  const starts = access(graph, from)
  const ends = access(graph, to)
  if (starts.length === 0 || ends.length === 0) return null
  return shortestPath(graph, starts, ends, cost)
}

export function planRoute(graph: Graph, from: LngLat, to: LngLat, needs: Needs, alerts: AlertReport[] = []): RoutePlan {
  const costs = costModel(graph, needs, alerts)
  const notOnNetwork = nearestNodes(graph, from, 1).length === 0 || nearestNodes(graph, to, 1).length === 0
  if (notOnNetwork) return { accessible: null, shortest: null, notOnNetwork }

  const accessiblePath = search(graph, from, to, (_from, toNode, way, length) => {
    const w = costs.way(way)
    return length * w.factor + w.penalty + costs.node(toNode).penalty
  })
  const shortestPathResult = search(graph, from, to, (_f, _t, _w, length) => length)

  const plainNeeds: Needs = { ...needs, walkingSpeedKmh: DEFAULT_SPEED_KMH }
  return {
    accessible: accessiblePath ? analyze(graph, accessiblePath, needs, alerts, costs) : null,
    shortest: shortestPathResult ? analyze(graph, shortestPathResult, plainNeeds, alerts, costs) : null,
    notOnNetwork,
  }
}

const SEVERITY_RANK: Record<Severity, number> = { barrier: 4, difficulty: 3, unknown: 2, ok: 1, info: 0 }

export function analyze(graph: Graph, path: SearchResult, needs: Needs, alerts: AlertReport[], costs: Costs): RouteReport {
  const line = path.nodes.map((n) => graph.coords[n])
  const cumulative = [0]
  for (const step of path.steps) cumulative.push(cumulative[cumulative.length - 1] + step.length)
  const length = cumulative[cumulative.length - 1]

  const events: RouteEvent[] = []
  const segments: RouteSegment[] = []
  const legs: RouteLeg[] = []
  const dates: string[] = []
  let cobblestoneM = 0
  let unknownSurfaceM = 0
  let kerbs = 0
  let kerbsUnknown = 0
  let steps = 0

  // Stretch events (surface, incline...) merge while the same way continues
  let open: { way: number; events: RouteEvent[] } | null = null
  let crossingRun: { way: number; at: number; coords: LngLat; kerbSeen: boolean } | null = null
  const closeCrossing = () => {
    if (crossingRun && !crossingRun.kerbSeen && needs.maxKerbCm < ANY) {
      const way = graph.ways[crossingRun.way]
      events.push({
        kind: 'kerbUnknown',
        severity: 'unknown',
        at: crossingRun.at,
        coords: crossingRun.coords,
        source: 'osm',
        url: osmLink(way),
        date: way.date,
        street: way.tags.name,
      })
      kerbsUnknown++
    }
    crossingRun = null
  }

  for (let i = 0; i < path.steps.length; i++) {
    const step = path.steps[i]
    const way = graph.ways[step.way]
    const at = cumulative[i]
    const a = costs.way(step.way)
    if (way.date) dates.push(way.date)

    // Way issues
    if (!open || open.way !== step.way) {
      open = { way: step.way, events: [] }
      for (const issue of a.issues) {
        if (issue.kind === 'steps') steps += typeof issue.value === 'number' ? issue.value : 0
        const event: RouteEvent = {
          kind: issue.kind,
          severity: issue.severity,
          at,
          length: 0,
          coords: graph.coords[path.nodes[i]],
          value: issue.value,
          estimated: issue.estimated,
          source: 'osm',
          url: osmLink(way),
          date: way.date,
          street: way.tags.name,
        }
        events.push(event)
        open.events.push(event)
      }
    }
    for (const event of open.events) event.length = (event.length ?? 0) + step.length

    if (a.surface === 'cobblestone') cobblestoneM += step.length
    if (a.surface === null && !way.tags.surface) unknownSurfaceM += step.length

    // Segment colouring for the map
    const worst = a.issues.reduce<Severity>((w, x) => (SEVERITY_RANK[x.severity] > SEVERITY_RANK[w] ? x.severity : w), 'ok')
    const sev: SegmentSeverity =
      worst === 'barrier' || worst === 'difficulty' ? worst : a.surface === null && needs.avoidCobblestones ? 'unknown' : 'ok'
    const coords = [graph.coords[path.nodes[i]], graph.coords[path.nodes[i + 1]]]
    const last = segments[segments.length - 1]
    if (last && last.sev === sev) last.coords.push(coords[1])
    else segments.push({ sev, coords })

    // Legs for the text directions
    const kind = legKind(way.tags)
    const name = way.tags.name ?? null
    const leg = legs[legs.length - 1]
    if (leg && leg.name === name && leg.kind === kind) leg.length += step.length
    else legs.push({ name, kind, length: step.length, at })

    // Crossings: is there any kerb information on this crossing?
    const isCrossing = way.tags.footway === 'crossing' || way.tags.highway === 'crossing'
    if (isCrossing) {
      if (!crossingRun || crossingRun.way !== step.way) {
        closeCrossing()
        const first = graph.nodeTags.get(graph.ids[path.nodes[i]])
        crossingRun = { way: step.way, at, coords: graph.coords[path.nodes[i]], kerbSeen: Boolean(first && hasKerb(first.tags)) }
      }
    } else closeCrossing()

    // Node issues at the end of this step
    const node = path.nodes[i + 1]
    const feature = graph.nodeTags.get(graph.ids[node])
    if (feature && crossingRun && hasKerb(feature.tags)) crossingRun.kerbSeen = true
    if (feature) {
      if (feature.date) dates.push(feature.date)
      for (const issue of costs.node(node).issues) {
        if (issue.kind === 'kerb') kerbs++
        if (issue.kind === 'kerbUnknown') kerbsUnknown++
        events.push({
          kind: issue.kind,
          severity: issue.severity,
          at: cumulative[i + 1],
          coords: graph.coords[node],
          value: issue.value,
          source: 'osm',
          url: osmLink(feature),
          date: feature.date,
          street: way.tags.name,
        })
      }
    }
  }
  closeCrossing()

  // Amenities and reports near the route
  const near = <T extends { at: LngLat }>(items: T[], radius: number) =>
    items
      .map((item) => ({ item, ...projectOnLine(item.at, line, cumulative) }))
      .filter((x) => x.offset <= radius)
  const benches = near(graph.benches, NEAR_ROUTE_M)
  for (const b of benches) {
    events.push({ kind: 'bench', severity: 'ok', at: b.along, coords: b.item.at, source: 'osm', url: osmLink(b.item.feature), date: b.item.feature.date })
  }
  const toilets = near(
    graph.toilets.filter((x) => x.accessible),
    100,
  )
  for (const x of toilets) {
    events.push({
      kind: 'toilet',
      severity: 'ok',
      at: x.along,
      coords: x.item.at,
      value: Math.round(x.offset),
      source: 'osm',
      url: osmLink(x.item.feature),
      date: x.item.feature.date,
    })
  }
  const reported = alerts
    .filter((r) => ROUTE_ALERTS.has(r.alertType) || r.alertType === 'elevatorOutOfOrder')
    .map((r) => ({ r, ...projectOnLine(r.coords, line, cumulative) }))
    .filter((x) => x.offset <= 25)
  for (const x of reported) {
    events.push({
      kind: 'alert',
      severity: 'difficulty',
      at: x.along,
      coords: x.r.coords,
      value: x.r.alertType,
      source: x.r.source,
      date: x.r.createdAt,
      alert: x.r,
    })
  }
  events.sort((a, b) => a.at - b.at)

  // Longest stretch without a place to rest
  const restPoints = [0, ...benches.map((b) => b.along).sort((a, b) => a - b), length]
  let longestWithoutRestM = 0
  for (let k = 1; k < restPoints.length; k++) longestWithoutRestM = Math.max(longestWithoutRestM, restPoints[k] - restPoints[k - 1])

  const count = (s: Severity) => events.filter((e) => e.severity === s).length
  const barriers = count('barrier')
  const difficulties = count('difficulty')
  const unknowns = count('unknown')
  const surfaceUnknownTooMuch = needs.avoidCobblestones && length > 0 && unknownSurfaceM / length > UNKNOWN_SURFACE_SHARE
  const verdict: Verdict = barriers ? 'mismatch' : difficulties ? 'partial' : unknowns || surfaceUnknownTooMuch ? 'unknown' : 'match'

  const sortedDates = dates.filter((d) => /^\d{4}/.test(d)).sort()
  return {
    verdict,
    length,
    durationMin: Math.max(1, Math.round((length / 1000 / needs.walkingSpeedKmh) * 60)),
    line,
    segments,
    events,
    legs,
    summary: {
      barriers,
      difficulties,
      unknowns,
      steps,
      cobblestoneM,
      unknownSurfaceM,
      kerbs,
      kerbsUnknown,
      benches: benches.length,
      longestWithoutRestM,
      accessibleToilets: toilets.length,
      alerts: reported.length,
    },
    dates: { oldest: sortedDates[0], newest: sortedDates[sortedDates.length - 1] },
  }
}
