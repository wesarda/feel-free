import { useState } from 'react'
import type { Evaluation } from '../core/evaluate'
import { getSource } from '../core/sources'
import type { Place } from '../core/types'
import { placeName } from '../format'
import { useI18n } from '../i18n/context'
import { CATEGORY_ICON } from '../icons'
import { findingText, keyFinding } from '../text'
import { SampleTag } from './Badges'
import { VerdictIcon } from './Icons'

const PAGE = 40

export function ResultsList({ places, evaluations, hasNeeds, onSelect }: {
  places: Place[]
  evaluations: Map<string, Evaluation>
  hasNeeds: boolean
  onSelect: (id: string) => void
}) {
  const { t, lang } = useI18n()
  const [limit, setLimit] = useState(PAGE)

  if (places.length === 0) return <p className="empty">{t.search.empty}</p>

  return (
    <>
      <ul className="results" aria-label={t.places.listLabel}>
        {places.slice(0, limit).map((place) => {
          const evaluation = hasNeeds ? evaluations.get(place.id) : undefined
          const Icon = CATEGORY_ICON[place.category]
          const key = evaluation ? keyFinding(evaluation) : null
          return (
            <li key={place.id}>
              <button type="button" className="result" onClick={() => onSelect(place.id)}>
                <span className="result-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <span className="result-main">
                  <span className="result-title">{placeName(place, lang) || t.categories[place.category]}</span>
                  <span className="result-meta">
                    {t.categories[place.category]}
                    {place.address ? ` · ${place.address}` : ''}
                  </span>
                  {evaluation && (
                    <span className={`result-verdict verdict-text-${evaluation.verdict}`}>
                      <VerdictIcon verdict={evaluation.verdict} size={14} />
                      <span>
                        {t.verdict[evaluation.verdict]}
                        {key ? ` · ${findingText(key, t)}` : ''}
                      </span>
                    </span>
                  )}
                </span>
                {getSource(place.origin).sample && <SampleTag />}
              </button>
            </li>
          )
        })}
      </ul>
      {places.length > limit && (
        <button type="button" className="btn ghost wide" onClick={() => setLimit((n) => n + PAGE)}>
          {t.places.showMore} ({places.length - limit})
        </button>
      )}
    </>
  )
}
