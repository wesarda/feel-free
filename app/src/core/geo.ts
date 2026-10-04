import type { LngLat } from './types.ts'

const EARTH_RADIUS_M = 6371008.8
const RAD = Math.PI / 180

export function distanceM(a: LngLat, b: LngLat): number {
  const dLat = (b[1] - a[1]) * RAD
  const dLng = (b[0] - a[0]) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * RAD) * Math.cos(b[1] * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** [south, west, north, east], the order Overpass expects. */
export type BBox = [number, number, number, number]

export function bboxAround(points: LngLat[], paddingM: number): BBox {
  const lats = points.map((p) => p[1])
  const lngs = points.map((p) => p[0])
  const midLat = (Math.min(...lats) + Math.max(...lats)) / 2
  const dLat = paddingM / 111320
  const dLng = paddingM / (111320 * Math.cos(midLat * RAD))
  return [Math.min(...lats) - dLat, Math.min(...lngs) - dLng, Math.max(...lats) + dLat, Math.max(...lngs) + dLng]
}

export function bboxContains(outer: BBox, inner: BBox): boolean {
  return inner[0] >= outer[0] && inner[1] >= outer[1] && inner[2] <= outer[2] && inner[3] <= outer[3]
}

/** Distance from point p to segment a-b, using a local flat projection (fine at city scale). */
export function distanceToSegmentM(p: LngLat, a: LngLat, b: LngLat): number {
  const kx = 111320 * Math.cos(p[1] * RAD)
  const ky = 110574
  const ax = (a[0] - p[0]) * kx
  const ay = (a[1] - p[1]) * ky
  const bx = (b[0] - p[0]) * kx
  const by = (b[1] - p[1]) * ky
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2))
  return Math.hypot(ax + t * dx, ay + t * dy)
}

/** Closest position along a polyline: distance from the line and how far along it (metres). */
export function projectOnLine(p: LngLat, line: LngLat[], cumulative: number[]): { offset: number; along: number } {
  let best = { offset: Infinity, along: 0 }
  for (let i = 0; i < line.length - 1; i++) {
    const offset = distanceToSegmentM(p, line[i], line[i + 1])
    if (offset < best.offset) {
      const segLen = cumulative[i + 1] - cumulative[i]
      const fromStart = distanceM(line[i], p)
      best = { offset, along: cumulative[i] + Math.min(segLen, Math.sqrt(Math.max(0, fromStart ** 2 - offset ** 2))) }
    }
  }
  return best
}
