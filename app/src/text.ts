import { SEVERITY_ORDER, type Evaluation, type Finding } from './core/evaluate'
import type { Messages } from './i18n/en'

export const findingText = (f: Finding, t: Messages) => (t.findings[f.msg.key] as (p: object) => string)(f.msg)

/** The one fact that explains the rating best: the most serious one. */
export function keyFinding(evaluation: Evaluation): Finding | null {
  const relevant = evaluation.findings.filter((f) => f.severity !== 'info')
  return [...relevant].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))[0] ?? null
}
