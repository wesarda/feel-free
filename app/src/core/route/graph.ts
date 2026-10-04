import { distanceM } from '../geo.ts'
import type { LngLat } from '../types.ts'

/** The subset of an Overpass element the graph needs (kept structural so core does not depend on data/). */
export type OsmElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  nodes?: number[]
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
  timestamp?: string
}

export type OsmFeature = { id: number; type: 'node' | 'way'; tags: Record<string, string>; date?: string }

export type Edge = { to: number; way: number; length: number }

/** Pedestrian network: nodes are OSM nodes, edges follow walkable ways. */
export type Graph = {
  ids: number[]
  coords: LngLat[]
  adj: Edge[][]
  ways: OsmFeature[]
  /** Total length of each way in the network, in metres. */
  wayLength: number[]
  /** Tags of nodes that matter for accessibility: kerbs, barriers, elevators. */
  nodeTags: Map<number, OsmFeature>
  benches: { at: LngLat; feature: OsmFeature }[]
  toilets: { at: LngLat; feature: OsmFeature; accessible: boolean | null }[]
}

const WALKABLE = new Set([
  'footway',
  'pedestrian',
  'path',
  'steps',
  'living_street',
  'residential',
  'service',
  'unclassified',
  'tertiary',
  'tertiary_link',
  'secondary',
  'secondary_link',
  'primary',
  'primary_link',
  'cycleway',
  'track',
  'corridor',
  'platform',
  'bridleway',
  'road',
])
const FOOT_OK = new Set(['yes', 'designated', 'permissive'])

export function isWalkable(tags: Record<string, string>): boolean {
  if (!WALKABLE.has(tags.highway)) return false
  if (tags.foot === 'no' || tags.foot === 'use_sidepath') return false
  if ((tags.access === 'no' || tags.access === 'private') && !FOOT_OK.has(tags.foot)) return false
  // In Poland pedestrians may not use cycleways unless allowed
  if (tags.highway === 'cycleway' && !FOOT_OK.has(tags.foot)) return false
  return true
}

const dateOf = (el: OsmElement) => {
  const t = el.tags ?? {}
  return t.check_date ?? t['survey:date'] ?? el.timestamp?.slice(0, 10)
}

export function buildGraph(elements: OsmElement[]): Graph {
  const index = new Map<number, number>()
  const graph: Graph = { ids: [], coords: [], adj: [], ways: [], wayLength: [], nodeTags: new Map(), benches: [], toilets: [] }

  const nodeIndex = (id: number, at: LngLat) => {
    let i = index.get(id)
    if (i === undefined) {
      i = graph.ids.length
      index.set(id, i)
      graph.ids.push(id)
      graph.coords.push(at)
      graph.adj.push([])
    }
    return i
  }

  for (const el of elements) {
    const tags = el.tags ?? {}
    if (el.type === 'way' && el.nodes && el.geometry && el.geometry.length === el.nodes.length && isWalkable(tags)) {
      const way = graph.ways.length
      graph.ways.push({ id: el.id, type: 'way', tags, date: dateOf(el) })
      graph.wayLength.push(0)
      let prev = -1
      for (let k = 0; k < el.nodes.length; k++) {
        const g = el.geometry[k]
        const i = nodeIndex(el.nodes[k], [g.lon, g.lat])
        if (prev >= 0 && prev !== i) {
          const length = distanceM(graph.coords[prev], graph.coords[i])
          graph.adj[prev].push({ to: i, way, length })
          graph.adj[i].push({ to: prev, way, length })
          graph.wayLength[way] += length
        }
        prev = i
      }
    }
  }

  for (const el of elements) {
    const tags = el.tags
    if (!tags) continue
    const at: LngLat | null =
      el.lat !== undefined && el.lon !== undefined ? [el.lon, el.lat] : el.center ? [el.center.lon, el.center.lat] : null
    if (!at) continue
    const feature: OsmFeature = { id: el.id, type: el.type === 'way' ? 'way' : 'node', tags, date: dateOf(el) }
    if (el.type === 'node' && index.has(el.id)) graph.nodeTags.set(el.id, feature)
    if (tags.amenity === 'bench' || tags.leisure === 'picnic_table') graph.benches.push({ at, feature })
    if (tags.amenity === 'toilets') {
      const w = tags.wheelchair
      graph.toilets.push({ at, feature, accessible: w === 'yes' || w === 'designated' ? true : w === 'no' ? false : null })
    }
  }
  return graph
}

/** The graph nodes closest to a point, to start or end a route on the network. */
export function nearestNodes(graph: Graph, at: LngLat, count: number, maxM = 400): { node: number; distance: number }[] {
  const best: { node: number; distance: number }[] = []
  for (let i = 0; i < graph.coords.length; i++) {
    if (graph.adj[i].length === 0) continue
    const c = graph.coords[i]
    // Cheap bounding test before the exact distance
    if (Math.abs(c[1] - at[1]) > 0.005 || Math.abs(c[0] - at[0]) > 0.008) continue
    const distance = distanceM(c, at)
    if (distance > maxM) continue
    if (best.length < count || distance < best[best.length - 1].distance) {
      best.push({ node: i, distance })
      best.sort((a, b) => a.distance - b.distance)
      if (best.length > count) best.pop()
    }
  }
  return best
}
