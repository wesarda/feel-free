import type { Verdict } from '../core/evaluate'
import { isStale } from '../core/facts'
import { getSource } from '../core/sources'
import type { Fact } from '../core/types'
import { useI18n } from '../i18n/context'
import { ReliabilityIcon, VerdictGlyph } from './Icons'

export function VerdictBadge({ verdict, size = 'normal' }: { verdict: Verdict | null; size?: 'normal' | 'small' }) {
  const { t } = useI18n()
  const v = verdict ?? 'none'
  return (
    <span className={`verdict-badge verdict-${v} ${size}`}>
      <VerdictGlyph verdict={v} size={size === 'small' ? 13 : 16} />
      {t.verdict[v]}
    </span>
  )
}

export function SampleTag() {
  const { t } = useI18n()
  return (
    <span className="sample-tag" title={t.sampleLong}>
      {t.sample}
    </span>
  )
}

export type Provenance = Pick<Fact, 'source' | 'date' | 'confirmed' | 'url' | 'derivedFrom'>

/** Where a fact comes from, when it was updated or confirmed, and how reliable it is. */
export function SourceBadge({ fact, now }: { fact: Provenance; now: Date }) {
  const { t, lang, formatDate } = useI18n()
  const source = getSource(fact.source)
  const stale = isStale(fact, now)
  const date = formatDate(fact.date)
  return (
    <span className={`source-badge rel-${source.reliability}`}>
      <ReliabilityIcon reliability={source.reliability} />
      <span className="source-name">{source.name[lang]}</span>
      <span className="sep" aria-hidden="true">·</span>
      <span>{t.reliabilityShort[source.reliability]}</span>
      <span className="sep" aria-hidden="true">·</span>
      <span>{fact.date ? (fact.confirmed ? t.confirmedOn(date) : t.updated(date)) : t.undated}</span>
      {stale && <span className="stale-tag">{t.stale}</span>}
      {fact.derivedFrom && <span className="derived">({t.derived(fact.derivedFrom)})</span>}
      {source.sample && <SampleTag />}
      {fact.url && (
        <a href={fact.url} target="_blank" rel="noreferrer" className="source-link">
          {t.openSource}
          <span className="visually-hidden"> ({source.name[lang]})</span>
        </a>
      )}
    </span>
  )
}
