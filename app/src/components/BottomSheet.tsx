import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { useI18n } from '../i18n/context'
import { sheetHeights } from '../layout'
import { useWindowHeight } from '../useMedia'

export type Snap = 'peek' | 'half' | 'full'
const ORDER: Snap[] = ['peek', 'half', 'full']

/**
 * Phone panel over the map, like in map apps: drag the handle to resize, or use the handle
 * button (keyboard and screen readers) to step between the three heights.
 */
export function BottomSheet({ snap, onSnap, children }: {
  snap: Snap
  onSnap: (snap: Snap) => void
  children: ReactNode
}) {
  const { t } = useI18n()
  const vh = useWindowHeight()
  const heights = sheetHeights(vh)
  const drag = useRef<{ y: number; h: number; lastY: number; lastT: number; v: number; moved: boolean; onGrip: boolean } | null>(null)
  const tapped = useRef(false)
  const [dragHeight, setDragHeight] = useState<number | null>(null)

  const step = () => onSnap(snap === 'full' ? 'peek' : ORDER[ORDER.indexOf(snap) + 1])

  // The pointer is captured at once, so a quick flick that leaves the handle still drags the sheet
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const onGrip = (e.target as Element).closest('.sheet-grip') !== null
    drag.current = { y: e.clientY, h: heights[snap], lastY: e.clientY, lastT: e.timeStamp, v: 0, moved: false, onGrip }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    if (!d.moved && Math.abs(e.clientY - d.y) <= 4) return
    d.moved = true
    const dt = Math.max(1, e.timeStamp - d.lastT)
    d.v = (d.lastY - e.clientY) / dt
    d.lastY = e.clientY
    d.lastT = e.timeStamp
    setDragHeight(Math.max(heights.peek - 40, Math.min(heights.full, d.h + d.y - e.clientY)))
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved || dragHeight === null) {
      setDragHeight(null)
      // With the pointer captured the click may not reach the grip button, so a tap on it steps here
      if (!d.moved && d.onGrip) {
        tapped.current = true
        window.setTimeout(() => (tapped.current = false), 0)
        step()
      }
      return
    }
    const index = ORDER.indexOf(snap)
    let next: Snap
    if (d.v > 0.5) next = ORDER[Math.min(2, index + 1)]
    else if (d.v < -0.5) next = ORDER[Math.max(0, index - 1)]
    else next = ORDER.reduce((best, s) => (Math.abs(heights[s] - dragHeight) < Math.abs(heights[best] - dragHeight) ? s : best), snap)
    setDragHeight(null)
    onSnap(next)
  }

  return (
    // A plain container: the <main> inside is the landmark
    <div className={dragHeight === null ? 'sheet glass' : 'sheet glass dragging'} style={{ height: dragHeight ?? heights[snap] }}>
      <div className="sheet-handle" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
        <button
          type="button"
          className="sheet-grip"
          onClick={() => {
            // Keyboard and screen readers; pointer taps were handled on pointerup
            if (!tapped.current) step()
          }}
          aria-expanded={snap !== 'peek'}
          aria-label={snap === 'full' ? t.sheet.collapse : t.sheet.expand}
        >
          <span aria-hidden="true" />
        </button>
      </div>
      <div className="sheet-body">{children}</div>
    </div>
  )
}
