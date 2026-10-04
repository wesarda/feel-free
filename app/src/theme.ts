import type { Severity, Verdict } from './core/evaluate'
import type { Reliability } from './core/types'

// All colours keep at least 4.5:1 contrast with white text (WCAG 2.2 AA).
// The same values are in index.css (--ok, --warn, --bad, --unknown) for everything outside the map.
export const VERDICT_COLORS: Record<Verdict | 'none', string> = {
  match: '#1a7f37',
  partial: '#8a5a00',
  mismatch: '#b42318',
  unknown: '#57606a',
  none: '#57606a',
}

export const SEVERITY_COLORS: Record<Severity, string> = {
  barrier: '#b42318',
  difficulty: '#8a5a00',
  unknown: '#57606a',
  ok: '#1a7f37',
  info: '#0b57d0',
}

export const RELIABILITY_COLORS: Record<Reliability, string> = {
  verified: '#116329',
  official: '#0b57d0',
  community: '#0f6e74',
  report: '#8a5a00',
}

export const REPORT_COLOR = '#6639ba'
export const ROUTE_COLOR = '#0b57d0'
/** The route proposed for the user's needs: green, the colour of "fine for you". */
export const EASIER_ROUTE_COLOR = '#1a7f37'
/** The usual, shortest route: red and yellow stripes on a dark edge, like warning tape. */
export const USUAL_ROUTE_COLORS = { red: '#d92d20', yellow: '#ffd21f', edge: '#2f343c' }
