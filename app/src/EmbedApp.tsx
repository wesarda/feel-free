import { useEffect, useState } from 'react'
import { SEVERITY_ORDER, evaluatePlace } from './core/evaluate'
import { PRESETS, PRESET_ORDER } from './core/needs'
import { getSource } from './core/sources'
import type { PresetId } from './core/types'
import { loadSinglePlace, type SinglePlaceLoad } from './data/singlePlace'
import { placeName } from './format'
import { useI18n } from './i18n/context'
import { PRESET_ICON } from './icons'
import { useNow } from './useNow'
import { SampleTag, VerdictBadge } from './components/Badges'
import { SeverityIcon } from './components/Icons'
import './App.css'

/** Compact accessibility card for other websites: `?embed=<place id>&needs=wheelchair&lang=en`. */
export default function EmbedApp({ placeId, preset }: { placeId: string; preset: PresetId | null }) {
  const { t, lang, formatDate } = useI18n()
  const now = useNow()
  const [presetId, setPresetId] = useState<PresetId | null>(preset)
  const [load, setLoad] = useState<{ id: string; result: SinglePlaceLoad } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    loadSinglePlace(placeId, controller.signal)
      .then((result) => setLoad({ id: placeId, result }))
      .catch(() => {})
    return () => controller.abort()
  }, [placeId])

  const fullUrl = `${window.location.origin}${window.location.pathname}?place=${encodeURIComponent(placeId)}`
  const result = load?.id === placeId ? load.result : null

  if (!result) return <main className="embed embed-message">{t.embed.loading}</main>
  if (result.state !== 'ok') {
    return (
      <main className="embed embed-message">
        <p>{result.state === 'not-found' ? t.embed.notFound : t.embed.unavailable}</p>
        <a href={fullUrl} target="_blank" rel="noreferrer">
          {t.embed.full}
        </a>
      </main>
    )
  }

  const place = result.place
  const needs = presetId ? PRESETS[presetId] : null
  const evaluation = needs ? evaluatePlace(place, needs, { now }) : null
  const findings = evaluation
    ? evaluation.findings
        .filter((f) => f.severity !== 'info')
        .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))
        .slice(0, 6)
    : []

  return (
    <main className="embed" aria-labelledby="embed-title">
      <header>
        <h1 id="embed-title">{placeName(place, lang) || t.categories[place.category]}</h1>
        <p className="muted small">
          {t.categories[place.category]}
          {place.address ? ` · ${place.address}` : ''}
        </p>
      </header>
      <div className="presets" role="group" aria-label={t.embed.chooseNeeds}>
        {PRESET_ORDER.map((id) => {
          const Icon = PRESET_ICON[id]
          return (
            <button
              key={id}
              type="button"
              className={presetId === id ? 'chip active' : 'chip'}
              aria-pressed={presetId === id}
              onClick={() => setPresetId(presetId === id ? null : id)}
            >
              <Icon size={16} aria-hidden="true" /> {t.needs.presets[id]}
            </button>
          )
        })}
      </div>
      <div className={`verdict-box verdict-${evaluation?.verdict ?? 'none'}`} aria-live="polite">
        <VerdictBadge verdict={evaluation?.verdict ?? null} />
        <p>{t.verdictHelp[evaluation?.verdict ?? 'none']}</p>
      </div>
      {findings.length > 0 && (
        <ul className="findings embed-findings">
          {findings.map((f, i) => {
            const fact = f.facts[0]
            const source = fact ? getSource(fact.source) : null
            return (
              <li key={i} className={`finding sev-${f.severity}`}>
                <SeverityIcon severity={f.severity} size={16} />
                <div className="finding-body">
                  <p className="finding-text">
                    <span className="visually-hidden">{t.severity[f.severity]}: </span>
                    {(t.findings[f.msg.key] as (p: object) => string)(f.msg)}
                  </p>
                  {source && (
                    <span className="muted small">
                      {source.name[lang]} · {t.reliabilityShort[source.reliability]} · {formatDate(fact!.date)}{' '}
                      {source.sample && <SampleTag />}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
      <footer className="embed-footer">
        <a href={fullUrl} target="_blank" rel="noreferrer">
          {t.embed.full}
        </a>
        <span className="muted small">
          {t.appTitle} · {t.footer.attribution}
        </span>
      </footer>
    </main>
  )
}
