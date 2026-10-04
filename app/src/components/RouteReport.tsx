import { useState } from 'react'
import { usualRoute, type RoutePlan, type RouteReport } from '../core/route/plan'
import { useI18n } from '../i18n/context'
import { eventText } from '../routeText'
import { routeSpeech } from '../speechText'
import { useNow } from '../useNow'
import { SourceBadge, VerdictBadge } from './Badges'
import { SeverityIcon } from './Icons'
import { ReadAloud } from './ReadAloud'

/** Above this many items the list on the way opens with the problems only. */
const LONG_LIST = 12

function Stats({ route }: { route: RouteReport }) {
  const { t, formatDistance } = useI18n()
  const s = route.summary
  const st = t.route.stats
  return (
    <ul className="route-stats">
      <li>{st.steps(s.steps)}</li>
      {(s.kerbs > 0 || s.kerbsUnknown > 0) && <li>{st.kerbs(s.kerbs, s.kerbsUnknown)}</li>}
      {s.cobblestoneM > 0 && <li>{st.cobbles(formatDistance(s.cobblestoneM))}</li>}
      {s.unknownSurfaceM > 0 && (
        <li>{st.unknownSurface(formatDistance(s.unknownSurfaceM), Math.round((s.unknownSurfaceM / route.length) * 100))}</li>
      )}
      <li>{st.benches(s.benches, formatDistance(s.longestWithoutRestM))}</li>
      {s.accessibleToilets > 0 && <li>{st.toilets(s.accessibleToilets)}</li>}
      {s.alerts > 0 && <li>{st.alerts(s.alerts)}</li>}
    </ul>
  )
}

/** How many obstacles of the usual route are listed before "and N more". */
const USUAL_LISTED = 6

/** Step 1: the way an ordinary map would lead, and what stands in the user's way on it. */
function UsualRoute({ plan }: { plan: RoutePlan }) {
  const { t, formatDistance } = useI18n()
  const usual = usualRoute(plan)
  if (!usual) return null
  const { route, obstacles } = usual
  return (
    <div className="route-option">
      <h4>
        <span className="step-no" aria-hidden="true">1</span> {t.route.usual}
      </h4>
      <p className="route-option-head">
        <VerdictBadge verdict={route.verdict} size="small" /> <strong>{formatDistance(route.length)}</strong>{' '}
        <span className="muted">{t.route.usualHint}</span>
      </p>
      {obstacles.length === 0 ? (
        <p>{t.route.usualClear}</p>
      ) : (
        <>
          <p className="small-heading">{t.route.usualObstacles(route.summary.barriers, route.summary.difficulties)}</p>
          <ul className="obstacles">
            {obstacles.slice(0, USUAL_LISTED).map((e, i) => (
              <li key={i} className={`finding sev-${e.severity}`}>
                <SeverityIcon severity={e.severity} />
                <span>
                  <span className="visually-hidden">{t.severity[e.severity]}: </span>
                  <span className="event-at">{formatDistance(e.at)}</span> {eventText(e, t, formatDistance)}
                  {e.street && <span className="muted"> · {e.street}</span>}
                </span>
              </li>
            ))}
          </ul>
          {obstacles.length > USUAL_LISTED && <p className="muted small">{t.route.more(obstacles.length - USUAL_LISTED)}</p>}
        </>
      )}
    </div>
  )
}

export function RouteReportView({
  plan,
  fetchedAt,
  showShortest,
  onShowShortest,
}: {
  plan: RoutePlan
  fetchedAt: string
  showShortest: boolean
  onShowShortest: (value: boolean) => void
}) {
  const { t, formatDistance, formatDate, formatDateTime } = useI18n()
  const [showAll, setShowAll] = useState(false)
  const now = useNow()
  if (plan.notOnNetwork) return <p className="notice warn">{t.route.notOnNetwork}</p>
  const route = plan.accessible
  if (!route) return <p className="notice warn">{t.route.noRoute}</p>

  const legs = route.legs.filter((l) => l.length >= 5)
  // A long list starts with what can stop or slow the user; benches and flush kerbs are one tap away
  const problems = route.events.filter((e) => e.severity !== 'ok' && e.severity !== 'info')
  const long = route.events.length > LONG_LIST && problems.length < route.events.length
  const events = long && !showAll ? problems : route.events
  const usual = usualRoute(plan)
  return (
    <section className="route-result" aria-labelledby="route-result-title">
      <h3 id="route-result-title" className="visually-hidden">
        {t.route.resultTitle}
      </h3>
      <UsualRoute plan={plan} />
      {usual && (
        <h4 className="route-option-title">
          <span className="step-no" aria-hidden="true">2</span> {t.route.easier}
        </h4>
      )}
      <div className={`verdict-box verdict-${route.verdict}`}>
        <VerdictBadge verdict={route.verdict} />
        <p>
          <strong>{t.route.distance(formatDistance(route.length), route.durationMin)}</strong>
        </p>
        <p>{usual ? t.route.easierLonger(formatDistance(route.length - usual.route.length)) : t.route.sameAsShortest}</p>
        <p>{t.route.verdictHelp[route.verdict]}</p>
        <ReadAloud lines={routeSpeech(plan, t, formatDistance)} readKey={`${fetchedAt}|${Math.round(route.length)}|${route.verdict}`} />
      </div>

      <Stats route={route} />
      {usual && (
        <label className="check">
          <input type="checkbox" checked={showShortest} onChange={(e) => onShowShortest(e.target.checked)} />
          <span>{t.route.showShortest}</span>
        </label>
      )}

      <h4>{t.route.onTheWay}</h4>
      <p className="muted small">{t.route.onTheWayHint}</p>
      {long && (
        <p className="events-filter">
          <span className="muted small">{showAll ? t.route.eventsAll(route.events.length) : t.route.eventsProblems(problems.length, route.events.length)}</span>
          <button type="button" className="link-btn" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>
            {showAll ? t.route.showProblems : t.route.showAll(route.events.length)}
          </button>
        </p>
      )}
      {events.length === 0 ? (
        <p>{route.events.length === 0 ? t.route.nothingOnTheWay : t.route.noProblems}</p>
      ) : (
        <ol className="route-events">
          {events.map((e, i) => (
            <li key={i} className={`finding sev-${e.severity}`}>
              <SeverityIcon severity={e.severity} />
              <div className="finding-body">
                <p className="finding-text">
                  <span className="visually-hidden">{t.severity[e.severity]}: </span>
                  <span className="event-at">{formatDistance(e.at)}</span> {eventText(e, t, formatDistance)}
                  {e.street && <span className="muted"> · {e.street}</span>}
                </p>
                {e.alert?.comment && <q className="report-comment">{e.alert.comment}</q>}
                {/* Source, date and reliability of every item: one tap away, so the list stays short */}
                <details className="event-source">
                  <summary>{t.route.source}</summary>
                  <SourceBadge fact={{ source: e.source, date: e.date, url: e.url }} now={now} />
                </details>
              </div>
            </li>
          ))}
        </ol>
      )}

      <h4>{t.route.directions}</h4>
      <ol className="route-legs">
        {legs.map((leg, i) => (
          <li key={i}>
            {t.route.leg(
              leg.name ? (leg.kind === 'crossing' ? `${t.route.legKinds.crossing} (${leg.name})` : leg.name) : t.route.legKinds[leg.kind],
              formatDistance(leg.length),
            )}
          </li>
        ))}
      </ol>

      <p className="muted small">
        {route.dates.oldest && route.dates.newest && t.route.dataDates(formatDate(route.dates.oldest), formatDate(route.dates.newest))}{' '}
        {t.route.fetched(formatDateTime(fetchedAt))}
      </p>
    </section>
  )
}
