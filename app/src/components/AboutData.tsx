import type { CityConfig } from '../cities/types'
import { COVERAGE_KEYS, type Coverage } from '../core/coverage'
import type { Reliability } from '../core/types'
import { SOURCES } from '../core/sources'
import type { SourceStatus } from '../data/status'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'
import { ReliabilityIcon } from './Icons'
import { SampleTag } from './Badges'

const LEVELS: Reliability[] = ['verified', 'official', 'community', 'report']

export function AboutData({ city, statuses, coverage, simulateOutage, onSimulateOutage, showSample, onShowSample, onClose }: {
  city: CityConfig
  coverage: Coverage
  statuses: SourceStatus[]
  simulateOutage: boolean
  onSimulateOutage: (value: boolean) => void
  showSample: boolean
  onShowSample: (value: boolean) => void
  onClose: () => void
}) {
  const { t, lang, formatDate } = useI18n()
  return (
    <Dialog title={t.about.title} onClose={onClose} wide>
      <p>{t.about.intro}</p>

      <h3>{t.about.levels}</h3>
      <ul className="levels">
        {LEVELS.map((level) => (
          <li key={level}>
            <ReliabilityIcon reliability={level} size={16} /> <strong>{t.reliability[level]}</strong> – {t.about.levelHelp[level]}
          </li>
        ))}
        <li>
          <SampleTag /> {t.about.sampleHelp}
        </li>
      </ul>

      <h3>{t.about.freshness}</h3>
      <p>{t.about.freshnessHelp}</p>

      <h3>{t.about.sources}</h3>
      <div className="table-scroll" tabIndex={0} role="region" aria-label={t.about.sources}>
        <table>
          <thead>
            <tr>
              <th scope="col">{t.card.source}</th>
              <th scope="col">{t.about.status}</th>
              <th scope="col">{t.about.license}</th>
            </tr>
          </thead>
          <tbody>
            {statuses.map((status) => {
              const source = SOURCES[status.source]
              return (
                <tr key={status.source}>
                  <th scope="row">
                    {source?.name[lang] ?? status.source}
                    {source?.sample && <SampleTag />}
                  </th>
                  <td>
                    {t.status[status.state]}
                    {status.fetchedAt && <span className="muted"> · {formatDate(status.fetchedAt)}</span>}
                    {status.count !== undefined && <span className="muted"> · {status.count}</span>}
                    {status.detail && <div className="muted small">{t.sourceDetail(status.detail)}</div>}
                  </td>
                  <td className="small">{source?.license ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="demo-toggle">
        <label className="check">
          <input type="checkbox" checked={showSample} onChange={(e) => onShowSample(e.target.checked)} />
          <span>{t.about.showSample}</span>
        </label>
        <label className="check">
          <input type="checkbox" checked={simulateOutage} onChange={(e) => onSimulateOutage(e.target.checked)} />
          <span>{t.about.simulateOutage}</span>
        </label>
      </div>

      {coverage.places > 0 && (
        <>
          <h3>{t.about.coverage}</h3>
          <p className="muted small">{t.about.coverageHelp(coverage.places)}</p>
          <ul className="coverage">
            {COVERAGE_KEYS.map((key) => {
              const pct = Math.round((coverage[key] / coverage.places) * 100)
              return (
                <li key={key}>
                  <span className="coverage-label">{t.about.coverageKeys[key]}</span>
                  <span className="coverage-bar" aria-hidden="true">
                    <span style={{ width: `${pct}%` }} />
                  </span>
                  <strong>{pct}%</strong>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <h3>{t.about.datasets}</h3>
      <ul className="datasets">
        {city.datasets.map((d) => (
          <li key={d.url + d.name.en}>
            <a href={d.url} target="_blank" rel="noreferrer">
              {d.name[lang]}
            </a>{' '}
            <span className={d.status === 'used' ? 'tag tag-used' : 'tag'}>
              {d.status === 'used' ? t.about.datasetUsed : t.about.datasetPlanned}
            </span>
            <div className="muted small">
              {d.publisher} · {t.about.format}: {d.format} · {t.about.license}: {d.license} · {t.about.refresh}: {d.refresh}
            </div>
          </li>
        ))}
      </ul>

      <h3>{t.about.corrections}</h3>
      <p>{t.about.correctionsHelp}</p>

      <h3>{t.about.privacyTitle}</h3>
      <p>{t.about.privacyHelp}</p>
    </Dialog>
  )
}
