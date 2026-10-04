import type { Severity, Verdict } from '../core/evaluate'
import type { Reliability } from '../core/types'
import { RELIABILITY_COLORS, SEVERITY_COLORS, VERDICT_COLORS } from '../theme'

/*
 * Status is never shown by colour alone: every state has its own shape and glyph
 * (circle + tick, triangle + !, octagon + ×, dashed circle + ?).
 */

type ShapeProps = { color: string; size?: number }

function Shape({ kind, color, size = 18 }: ShapeProps & { kind: 'ok' | 'warn' | 'stop' | 'unknown' | 'info' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="icon" style={{ color }}>
      {kind === 'ok' && (
        <>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'warn' && (
        <>
          <path d="M10 1.5l9 16.5H1z" fill="currentColor" strokeLinejoin="round" />
          <path d="M10 7v5.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="10" cy="15.3" r="1.3" fill="#fff" />
        </>
      )}
      {kind === 'stop' && (
        <>
          <path d="M6.2 1h7.6L19 6.2v7.6L13.8 19H6.2L1 13.8V6.2z" fill="currentColor" />
          <path d="M6.5 6.5l7 7M13.5 6.5l-7 7" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {kind === 'unknown' && (
        <>
          <circle cx="10" cy="10" r="8.2" fill="#fff" stroke="currentColor" strokeWidth="1.8" strokeDasharray="3 2" />
          <path
            d="M7.6 7.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="10" cy="14.9" r="1.2" fill="currentColor" />
        </>
      )}
      {kind === 'info' && (
        <>
          <circle cx="10" cy="10" r="9" fill="currentColor" />
          <path d="M10 9v5.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx="10" cy="5.8" r="1.3" fill="#fff" />
        </>
      )}
    </svg>
  )
}

const VERDICT_SHAPE = { match: 'ok', partial: 'warn', mismatch: 'stop', unknown: 'unknown', none: 'unknown' } as const
const SEVERITY_SHAPE = { ok: 'ok', difficulty: 'warn', barrier: 'stop', unknown: 'unknown', info: 'info' } as const

export function VerdictIcon({ verdict, size }: { verdict: Verdict | 'none'; size?: number }) {
  return <Shape kind={VERDICT_SHAPE[verdict]} color={VERDICT_COLORS[verdict]} size={size} />
}

/** Glyph only, in the current text colour: for badges that already carry a text label on a coloured pill. */
export function VerdictGlyph({ verdict, size = 16 }: { verdict: Verdict | 'none'; size?: number }) {
  const path = {
    match: 'M4.5 10.5l3.5 3.5 7.5-8',
    partial: 'M10 4v8',
    mismatch: 'M5 5l10 10M15 5L5 15',
    unknown: 'M6.8 7a3.2 3.2 0 1 1 4.4 3c-.8.4-1.2 1-1.2 1.9v.6',
    none: 'M5 10h10',
  }[verdict]
  const dot = verdict === 'partial' ? 16 : verdict === 'unknown' ? 16.2 : null
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="icon glyph">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      {dot !== null && <circle cx="10" cy={dot} r="1.6" fill="currentColor" />}
    </svg>
  )
}

export function SeverityIcon({ severity, size }: { severity: Severity; size?: number }) {
  return <Shape kind={SEVERITY_SHAPE[severity]} color={SEVERITY_COLORS[severity]} size={size} />
}

export function ReliabilityIcon({ reliability, size = 14 }: { reliability: Reliability; size?: number }) {
  const color = RELIABILITY_COLORS[reliability]
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="icon">
      {reliability === 'verified' && (
        <>
          <path d="M8 1l6 2.5v4C14 11 11.5 14 8 15 4.5 14 2 11 2 7.5v-4z" fill={color} />
          <path d="M5 8l2 2 4-4.5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {reliability === 'official' && (
        <path d="M8 1l7 3.5v1.5H1V4.5zM2.5 7h2v5.5h-2zM7 7h2v5.5H7zM11.5 7h2v5.5h-2zM1 13.5h14V15H1z" fill={color} />
      )}
      {reliability === 'community' && (
        <>
          <circle cx="5.5" cy="5" r="2.5" fill={color} />
          <circle cx="11" cy="5.5" r="2.2" fill={color} />
          <path d="M1 14c0-3 2-5 4.5-5S10 11 10 14zM9.5 9.6c.5-.4 1-.6 1.6-.6 2.2 0 3.9 1.8 3.9 4.6h-4" fill={color} />
        </>
      )}
      {reliability === 'report' && (
        <path d="M2 2h12v9H7l-4 3.5V11H2z" fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
      )}
    </svg>
  )
}
