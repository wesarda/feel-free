import type { Map as MapLibreMap } from 'maplibre-gl'
import type { LucideIcon } from 'lucide-react'
import { Accessibility } from 'lucide-react'
import type { Verdict } from '../core/evaluate'
import type { AmenityKind, CategoryKey } from '../core/types'
import { CATEGORY_ICON } from '../icons'
import { REPORT_COLOR, SEVERITY_COLORS, VERDICT_COLORS } from '../theme'

// Same shapes as the SVG icons in Icons.tsx, so map and list read the same way (and not by colour alone)
const SHAPES = {
  ok: { body: 'circle', glyph: 'M5.5 10.5l3 3 6-6.5', dot: false },
  warn: { body: 'M10 1.5l9 16.5H1z', glyph: 'M10 7v5.5', dot: true },
  stop: { body: 'M6.2 1h7.6L19 6.2v7.6L13.8 19H6.2L1 13.8V6.2z', glyph: 'M6.5 6.5l7 7M13.5 6.5l-7 7', dot: false },
  unknown: { body: 'circle', glyph: 'M7.6 7.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6', dot: true },
  report: { body: 'M10 0.8l9.2 9.2-9.2 9.2L0.8 10z', glyph: 'M10 5.8v5.4', dot: true },
  info: { body: 'circle', glyph: 'M10 9v5.5', dot: true },
} as const

type ShapeKind = keyof typeof SHAPES
type PinVerdict = Verdict | 'none'

const RATIO = 2
const VERDICT_SHAPE: Record<Verdict, ShapeKind> = { match: 'ok', partial: 'warn', mismatch: 'stop', unknown: 'unknown' }
/** Pins before any needs are chosen: neutral, white glyph at 7.6:1. */
const NEUTRAL_PIN = '#4a5568'

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r)
  else ctx.rect(x, y, w, h)
}

function canvas(size: number) {
  const c = document.createElement('canvas')
  c.width = size * RATIO
  c.height = size * RATIO
  const ctx = c.getContext('2d')!
  ctx.scale(RATIO, RATIO)
  return ctx
}

/** One status shape, `size` px wide, centred on (cx, cy), with a white outline for any background. */
function shapeAt(ctx: CanvasRenderingContext2D, kind: ShapeKind, color: string, cx: number, cy: number, size: number) {
  ctx.save()
  ctx.translate(cx - size / 2, cy - size / 2)
  ctx.scale(size / 20, size / 20)
  const shape = SHAPES[kind]
  const body = new Path2D()
  if (shape.body === 'circle') body.arc(10, 10, 9, 0, Math.PI * 2)
  else body.addPath(new Path2D(shape.body))

  const hollow = kind === 'unknown'
  ctx.lineJoin = 'round'
  ctx.lineWidth = 3.4
  ctx.strokeStyle = '#ffffff'
  ctx.stroke(body)
  ctx.fillStyle = hollow ? '#ffffff' : color
  ctx.fill(body)
  if (hollow) {
    ctx.setLineDash([3, 2])
    ctx.lineWidth = 1.8
    ctx.strokeStyle = color
    ctx.stroke(body)
    ctx.setLineDash([])
  }

  const ink = hollow ? color : '#ffffff'
  ctx.lineCap = 'round'
  ctx.lineWidth = 2.2
  ctx.strokeStyle = ink
  ctx.stroke(new Path2D(shape.glyph))
  if (shape.dot) {
    ctx.fillStyle = ink
    ctx.beginPath()
    const y = kind === 'warn' ? 15.3 : kind === 'report' ? 14 : kind === 'info' ? 5.8 : 14.9
    ctx.arc(10, y, 1.3, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function draw(kind: ShapeKind, color: string): ImageData {
  const size = 28
  const ctx = canvas(size)
  shapeAt(ctx, kind, color, size / 2, size / 2, 20)
  return ctx.getImageData(0, 0, size * RATIO, size * RATIO)
}

type IconNode = [string, Record<string, string | number>][]

/** Drawing commands of a Lucide icon (strokes on a 24×24 grid), read from its React component. */
function iconNode(icon: LucideIcon): IconNode {
  try {
    const element = (icon as unknown as { render: (props: object, ref: null) => { props: { icon?: { node?: IconNode }; iconNode?: IconNode } } }).render({}, null)
    return element.props.icon?.node ?? element.props.iconNode ?? []
  } catch {
    return []
  }
}

/** Strokes a Lucide icon into a `size` px square at (x, y). */
function strokeIcon(ctx: CanvasRenderingContext2D, node: IconNode, x: number, y: number, size: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size / 24, size / 24)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.lineWidth = 2.25
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const [tag, a] of node) {
    const n = (key: string) => Number(a[key] ?? 0)
    const p = new Path2D()
    if (tag === 'path') p.addPath(new Path2D(String(a.d)))
    else if (tag === 'circle') p.arc(n('cx'), n('cy'), n('r'), 0, Math.PI * 2)
    else if (tag === 'ellipse') p.ellipse(n('cx'), n('cy'), n('rx'), n('ry'), 0, 0, Math.PI * 2)
    else if (tag === 'rect') {
      if (n('rx') && typeof p.roundRect === 'function') p.roundRect(n('x'), n('y'), n('width'), n('height'), n('rx'))
      else p.rect(n('x'), n('y'), n('width'), n('height'))
    } else if (tag === 'line') {
      p.moveTo(n('x1'), n('y1'))
      p.lineTo(n('x2'), n('y2'))
    } else if (tag === 'polyline' || tag === 'polygon') {
      const pts = String(a.points).trim().split(/[\s,]+/).map(Number)
      for (let i = 0; i + 1 < pts.length; i += 2) {
        if (i === 0) p.moveTo(pts[i], pts[i + 1])
        else p.lineTo(pts[i], pts[i + 1])
      }
      if (tag === 'polygon') p.closePath()
    } else continue
    if (a.fill && a.fill !== 'none') ctx.fill(p)
    ctx.stroke(p)
  }
  ctx.restore()
}

/**
 * Place pin: the colour and the corner badge say how the place fits the chosen needs (the badge
 * repeats it as a shape), the white glyph says what kind of place it is.
 */
export function pinImage(category: CategoryKey, verdict: PinVerdict): ImageData {
  const size = 40
  const cx = 18
  const cy = 18
  const ctx = canvas(size)
  ctx.save()
  ctx.shadowColor = 'rgba(15, 23, 42, 0.35)'
  ctx.shadowBlur = 3
  ctx.shadowOffsetY = 1
  ctx.beginPath()
  ctx.arc(cx, cy, 15, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.restore()
  ctx.beginPath()
  ctx.arc(cx, cy, 12.75, 0, Math.PI * 2)
  ctx.fillStyle = verdict === 'none' ? NEUTRAL_PIN : VERDICT_COLORS[verdict]
  ctx.fill()
  strokeIcon(ctx, iconNode(CATEGORY_ICON[category] ?? CATEGORY_ICON.other), cx - 8, cy - 8, 16, '#ffffff')
  if (verdict !== 'none') {
    ctx.beginPath()
    ctx.arc(30.5, 30.5, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    shapeAt(ctx, VERDICT_SHAPE[verdict], VERDICT_COLORS[verdict], 30.5, 30.5, 13)
  }
  return ctx.getImageData(0, 0, size * RATIO, size * RATIO)
}

export const pinId = (category: CategoryKey, verdict: PinVerdict) => `pin-${category}-${verdict}`

const AMENITY_COLORS: Record<AmenityKind, string> = { bench: '#7a5520', parking: '#0b57d0', elevator: '#4a5568' }

/** Small square icons for benches, disabled parking (the access symbol on blue) and elevators. */
function amenityImage(kind: AmenityKind): ImageData {
  const size = 24
  const ctx = canvas(size)
  ctx.fillStyle = '#ffffff'
  roundedRect(ctx, 1, 1, 22, 22, 6)
  ctx.fill()
  ctx.fillStyle = AMENITY_COLORS[kind]
  roundedRect(ctx, 2.5, 2.5, 19, 19, 5)
  ctx.fill()
  ctx.strokeStyle = '#ffffff'
  ctx.fillStyle = '#ffffff'
  ctx.lineCap = 'round'
  ctx.lineWidth = 1.8
  if (kind === 'bench') {
    const p = new Path2D('M6.5 10h11M6.5 13.5h11M8 13.5v4M16 13.5v4')
    ctx.stroke(p)
  } else if (kind === 'parking') {
    strokeIcon(ctx, iconNode(Accessibility), 4.5, 4.5, 15, '#ffffff')
  } else {
    ctx.fill(new Path2D('M12 5.5l4 4.5H8zM8 14h8l-4 4.5z'))
  }
  return ctx.getImageData(0, 0, size * RATIO, size * RATIO)
}

export const AMENITY_ICON: Record<AmenityKind, string> = {
  bench: 'amenity-bench',
  parking: 'amenity-parking',
  elevator: 'amenity-elevator',
}

export function addMapIcons(map: MapLibreMap) {
  const icons: [string, ShapeKind, string][] = [
    ['report', 'report', REPORT_COLOR],
    ['sev-barrier', 'stop', SEVERITY_COLORS.barrier],
    ['sev-difficulty', 'warn', SEVERITY_COLORS.difficulty],
    ['sev-unknown', 'unknown', SEVERITY_COLORS.unknown],
    ['sev-ok', 'ok', SEVERITY_COLORS.ok],
    ['sev-info', 'info', SEVERITY_COLORS.info],
  ]
  for (const [name, kind, color] of icons) {
    if (!map.hasImage(name)) map.addImage(name, draw(kind, color), { pixelRatio: RATIO })
  }
  for (const kind of Object.keys(AMENITY_ICON) as AmenityKind[]) {
    if (!map.hasImage(AMENITY_ICON[kind])) map.addImage(AMENITY_ICON[kind], amenityImage(kind), { pixelRatio: RATIO })
  }
}

/** Pins are drawn when the map first needs them: one per kind of place and rating actually shown. */
export function drawMissingPin(map: MapLibreMap, id: string) {
  const m = /^pin-([a-z]+)-([a-z]+)$/.exec(id)
  if (!m || map.hasImage(id)) return
  const verdict = m[2] as PinVerdict
  if (!(verdict === 'none' || verdict in VERDICT_SHAPE)) return
  map.addImage(id, pinImage(m[1] as CategoryKey, verdict), { pixelRatio: RATIO })
}
