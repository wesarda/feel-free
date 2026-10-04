import type { Snap } from './components/BottomSheet'

/** Height of the phone search bar with the needs chips under it. */
export const TOP_BAR = 120

/** Width of the desktop side panel including its margin. */
export const PANEL_INSET = 428

/** Heights of the phone panel. Fully open it stops under the search bar, which stays usable. */
export function sheetHeights(viewportHeight: number): Record<Snap, number> {
  const full = Math.max(260, viewportHeight - TOP_BAR - 8)
  return { peek: 156, half: Math.min(full, Math.round(viewportHeight * 0.52)), full }
}
