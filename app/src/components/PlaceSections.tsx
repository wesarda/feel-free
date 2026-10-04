import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import type { Finding, KeyedFact } from '../core/evaluate'
import { compareFacts } from '../core/facts'
import { getSource } from '../core/sources'
import type { AlertReport, Fact, FactKey, Place } from '../core/types'
import type { PhotoFacts } from '../community/types'
import { entranceData } from '../entrance'
import { formatValue } from '../format'
import { useI18n } from '../i18n/context'
import { findingText } from '../text'
import { SampleTag, SourceBadge } from './Badges'
import { ReliabilityIcon, SeverityIcon } from './Icons'

const EntrancePreview = lazy(() => import('./EntrancePreview'))

function uniqueBySource(facts: KeyedFact[]): KeyedFact[] {
  const seen = new Set<string>()
  return facts.filter((f) => {
    const key = `${f.source}|${f.date ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function AlertDetails({ alert, onConfirm }: { alert: AlertReport; onConfirm: () => void }) {
  const { t, formatDate } = useI18n()
  const source = getSource(alert.source)
  return (
    <div className="alert-details">
      <span className="source-badge rel-report">
        <ReliabilityIcon reliability="report" />
        <span className="source-name">{t.reliability.report}</span>
        <span className="sep" aria-hidden="true">·</span>
        <span>{formatDate(alert.createdAt)}</span>
        {source.sample && <SampleTag />}
      </span>
      {alert.comment && <q className="report-comment">{alert.comment}</q>}
      <span className="muted small">{t.report.expires(formatDate(alert.expiresAt))}</span>
      <button type="button" className="btn small" onClick={onConfirm}>
        {t.report.confirmAlert}
      </button>
    </div>
  )
}

/** One finding with every source behind it, conflicting values and user reports. */
export function FindingRow({ finding, now, onConfirmAlert }: { finding: Finding; now: Date; onConfirmAlert: (a: AlertReport) => void }) {
  const { t } = useI18n()
  return (
    <li className={`finding sev-${finding.severity}`}>
      <SeverityIcon severity={finding.severity} />
      <div className="finding-body">
        <p className="finding-text">
          <span className="visually-hidden">{t.severity[finding.severity]}: </span>
          <span className="aspect-tag">{t.aspects[finding.aspect]}</span> {findingText(finding, t)}
        </p>
        {finding.facts.length > 0 && (
          <div className="finding-sources">
            {uniqueBySource(finding.facts).map((fact) => (
              <SourceBadge key={`${fact.key}-${fact.source}`} fact={fact} now={now} />
            ))}
          </div>
        )}
        {finding.alert && <AlertDetails alert={finding.alert} onConfirm={() => onConfirmAlert(finding.alert!)} />}
        {finding.conflicts.length > 0 && (
          <div className="conflict" role="note">
            <strong>{t.conflictTitle}</strong>
            <ul>
              {finding.conflicts.map((fact, i) => (
                <li key={i}>
                  {t.facts[fact.key]}: <strong>{formatValue(fact.key, fact.value as never, t)}</strong>
                  {fact.note && <span className="muted"> – {fact.note}</span>}
                  <div>
                    <SourceBadge fact={fact} now={now} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </li>
  )
}

/** Every stored value with its source and date, as a table. */
export function AllData({ place }: { place: Place }) {
  const { t, lang, formatDate } = useI18n()
  const rows = (Object.entries(place.facts) as [FactKey, Fact[]][]).flatMap(([key, facts]) =>
    [...facts].sort(compareFacts).map((fact) => ({ key, fact })),
  )
  if (rows.length === 0) return <p className="muted">{t.noData}</p>
  return (
    <>
      {/* Focusable, so the table can be scrolled sideways with the keyboard */}
      <div className="table-scroll" tabIndex={0} role="region" aria-label={t.card.allData}>
        <table>
          <caption className="visually-hidden">{t.card.allData}</caption>
          <thead>
            <tr>
              <th scope="col">{t.card.attribute}</th>
              <th scope="col">{t.card.value}</th>
              <th scope="col">{t.card.source}</th>
              <th scope="col">{t.card.date}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, fact }, i) => {
              const source = getSource(fact.source)
              return (
                <tr key={i}>
                  <th scope="row">{t.facts[key]}</th>
                  <td>{formatValue(key, fact.value as never, t)}</td>
                  <td>
                    {source.name[lang]}
                    <span className="muted"> ({t.reliabilityShort[source.reliability]})</span>
                    {source.sample && <SampleTag />}
                  </td>
                  <td>{formatDate(fact.date)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="muted small">
        {t.basedOn}: {[...new Set(rows.map((r) => getSource(r.fact.source).name[lang]))].join(', ')}
      </p>
    </>
  )
}

/** The entrance drawn in 3D from the data; steps nobody has recorded are drawn as a block marked "?". */
export function EntranceSection({ place, now }: { place: Place; now: Date }) {
  const { t } = useI18n()
  const entrance = entranceData(place, now)
  const { steps, stepHeightCm, rampSlopePct } = entrance
  // The 3D library and its canvas load when the section comes near the screen: on a phone it is below
  // the fold, and many people never scroll that far
  const sectionRef = useRef<HTMLElement>(null)
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined')
  useEffect(() => {
    const section = sectionRef.current
    if (!section || seen) return
    const observer = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '200px' })
    observer.observe(section)
    return () => observer.disconnect()
  }, [seen])
  return (
    <section ref={sectionRef} aria-labelledby="entrance-title" className="detail-section">
      <h3 id="entrance-title">{t.card.entrance3d}</h3>
      <Suspense fallback={<div className="entrance-preview" />}>
        {seen ? (
          <EntrancePreview
            id={place.id}
            data={entrance}
            model={place.model}
            hint={t.card.entrance3dHint}
            labels={{
              door: t.scene.door(entrance.doorWidthCm, entrance.automaticDoor),
              steps:
                steps === null
                  ? t.scene.stepsUnknown(entrance.summary)
                  : t.scene.steps(steps, stepHeightCm !== null ? steps * stepHeightCm : null),
              level: t.scene.level,
              ramp: entrance.ramp
                ? t.scene.ramp(
                    rampSlopePct,
                    steps !== null && rampSlopePct !== null && stepHeightCm !== null ? (steps * stepHeightCm) / rampSlopePct : null,
                  )
                : null,
              lift: t.scene.lift,
              cobblestones: t.scene.cobblestones,
            }}
          />
        ) : (
          <div className="entrance-preview" />
        )}
      </Suspense>
      <p className="muted small">{steps === null ? t.card.entrance3dStepsUnknown : t.card.entrance3dCaption}</p>
    </section>
  )
}

/** What the AI noticed on people's photos: kept apart from the data and never used for the rating. */
export function PhotoFactsBox({ facts, date, photos }: { facts: PhotoFacts; date: string; photos: number }) {
  const { t, formatDate } = useI18n()
  const f = t.photos.facts
  const items = [
    facts.levelEntrance ? f.level : facts.entranceSteps !== null ? f.steps(facts.entranceSteps) : null,
    facts.ramp !== null ? f.ramp(facts.ramp) : null,
    facts.handrail !== null ? f.handrail(facts.handrail) : null,
    facts.automaticDoor !== null ? f.automaticDoor(facts.automaticDoor) : null,
  ].filter((x): x is string => Boolean(x))
  if (items.length === 0) return null
  return (
    <div className="photo-facts" role="note">
      <p className="photo-facts-title">
        <Camera size={16} aria-hidden="true" /> {t.photos.aiFacts}
      </p>
      <p>{items.join(' · ')}</p>
      <p className="muted small">{t.photos.factsMeta(photos, formatDate(date))}</p>
    </div>
  )
}
