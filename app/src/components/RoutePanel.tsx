import { useState } from 'react'
import { ALargeSmall, ArrowLeft, ArrowUpDown, LocateFixed, MapPinned } from 'lucide-react'
import type { CityConfig } from '../cities/types'
import type { Needs, Place } from '../core/types'
import { findPlace, type Endpoint, type RouteStatus } from '../data/useRoute'
import { placeName } from '../format'
import { useI18n } from '../i18n/context'
import { RouteReportView } from './RouteReport'

type Which = 'from' | 'to'

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')

function EndpointPicker({
  which,
  value,
  places,
  onChange,
  onPickOnMap,
}: {
  which: Which
  value: Endpoint | null
  places: Place[]
  onChange: (value: Endpoint) => void
  onPickOnMap: () => void
}) {
  const { t, lang } = useI18n()
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(false)
  const [locating, setLocating] = useState<'idle' | 'busy' | 'failed'>('idle')
  const label = which === 'from' ? t.route.from : t.route.to
  const inputId = `endpoint-${which}`

  if (value && !editing) {
    const place = value.kind === 'place' ? findPlace(places, value.placeId) : undefined
    return (
      <div className="endpoint">
        <span className="endpoint-label">{label}</span>
        <strong className="endpoint-name">{place ? placeName(place, lang) || t.categories[place.category] : t.route.pointOnMap}</strong>
        <button type="button" className="link-btn" onClick={() => setEditing(true)}>
          {t.route.change}
          <span className="visually-hidden"> – {label}</span>
        </button>
      </div>
    )
  }

  const q = normalize(query.trim())
  const results = q
    ? places
        .filter((p) => normalize([p.name, p.altNames?.en ?? '', p.address ?? ''].join(' ')).includes(q))
        .slice(0, 6)
    : []

  const choose = (endpoint: Endpoint) => {
    onChange(endpoint)
    setEditing(false)
    setQuery('')
  }

  const locate = () => {
    if (!('geolocation' in navigator)) return setLocating('failed')
    setLocating('busy')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating('idle')
        choose({ kind: 'point', coords: [pos.coords.longitude, pos.coords.latitude] })
      },
      () => setLocating('failed'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div className="endpoint-picker">
      <label className="field" htmlFor={inputId}>
        <span>{label}</span>
      </label>
      <input
        id={inputId}
        type="search"
        className="endpoint-input"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t.route.searchPlaceholder}
        autoComplete="off"
      />
      {results.length > 0 && (
        <ul className="picker-results" aria-label={label}>
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => choose({ kind: 'place', placeId: p.id })}>
                <strong>{placeName(p, lang) || t.categories[p.category]}</strong>{' '}
                <span className="muted small">
                  {t.categories[p.category]}
                  {p.address ? ` · ${p.address}` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="button-row">
        <button type="button" className="btn small" onClick={onPickOnMap}>
          <MapPinned size={16} aria-hidden="true" /> {t.route.pickOnMap}
          <span className="visually-hidden"> – {label}</span>
        </button>
        <button type="button" className="btn small" onClick={locate} disabled={locating === 'busy'}>
          <LocateFixed size={16} aria-hidden="true" /> {locating === 'busy' ? t.route.locating : t.route.myLocation}
          <span className="visually-hidden"> – {label}</span>
        </button>
        {value && (
          <button type="button" className="link-btn" onClick={() => setEditing(false)}>
            {t.cancel}
          </button>
        )}
      </div>
      {locating === 'failed' && <p className="muted small">{t.route.locationFailed}</p>}
    </div>
  )
}

export function RoutePanel({
  city,
  places,
  needs,
  from,
  to,
  setFrom,
  setTo,
  swap,
  clear,
  retry,
  status,
  showShortest,
  onShowShortest,
  onPickOnMap,
  onBack,
  onVision,
}: {
  city: CityConfig
  places: Place[]
  needs: Needs | null
  from: Endpoint | null
  to: Endpoint | null
  setFrom: (e: Endpoint) => void
  setTo: (e: Endpoint) => void
  swap: () => void
  clear: () => void
  retry: () => void
  status: RouteStatus
  showShortest: boolean
  onShowShortest: (value: boolean) => void
  onPickOnMap: (which: Which) => void
  onBack: () => void
  /** Desktop only: on a phone the vision button is on the map. */
  onVision?: () => void
}) {
  const { t, lang, formatDateTime } = useI18n()
  const examples = city.exampleRoutes
    .map((r) => ({ r, a: findPlace(places, r.from), b: findPlace(places, r.to) }))
    .filter((x) => x.a && x.b)

  const summary =
    status.state === 'ready' && status.plan?.accessible
      ? `${t.verdict[status.plan.accessible.verdict]}, ${t.route.distance(
          `${Math.round(status.plan.accessible.length)} m`,
          status.plan.accessible.durationMin,
        )}`
      : status.state === 'loading'
        ? t.route.loading
        : ''

  // Once both ends are chosen the introduction and the examples make way for the result
  const chosen = Boolean(from && to)

  return (
    <section aria-labelledby="route-title" className="route-panel">
      <div className="view-head">
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t.back}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <h2 id="route-title">{t.route.title}</h2>
        {/* The search bar with this button is not shown on the route screen */}
        {onVision && (
          <button type="button" className="icon-btn head-action" onClick={onVision} aria-label={t.vision.open} title={t.vision.open} aria-haspopup="dialog">
            <ALargeSmall size={24} aria-hidden="true" />
          </button>
        )}
      </div>
      {!chosen && <p className="muted small">{t.route.intro}</p>}
      {!needs && <p className="notice warn">{t.route.needNeeds}</p>}

      <div className="endpoints">
        <EndpointPicker
          key={`from-${JSON.stringify(from)}`}
          which="from"
          value={from}
          places={places}
          onChange={setFrom}
          onPickOnMap={() => onPickOnMap('from')}
        />
        <button type="button" className="icon-btn swap-button" onClick={swap} aria-label={t.route.swap} title={t.route.swap}>
          <ArrowUpDown size={18} aria-hidden="true" />
        </button>
        <EndpointPicker
          key={`to-${JSON.stringify(to)}`}
          which="to"
          value={to}
          places={places}
          onChange={setTo}
          onPickOnMap={() => onPickOnMap('to')}
        />
      </div>

      {!chosen && examples.length > 0 && (
        <div className="examples">
          <h3 className="small-heading">{t.route.examples}</h3>
          <ul className="example-list">
            {examples.map(({ r, a, b }) => (
              <li key={`${r.from}-${r.to}`}>
                <button
                  type="button"
                  className="btn small"
                  onClick={() => {
                    setFrom({ kind: 'place', placeId: r.from })
                    setTo({ kind: 'place', placeId: r.to })
                  }}
                >
                  {placeName(a!, lang)} → {placeName(b!, lang)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p role="status" className="visually-hidden">
        {summary}
      </p>

      {status.state === 'loading' && <p className="notice">{t.route.loading}</p>}
      {status.state === 'unavailable' && (
        <div className="notice bad">
          <span>{t.route.unavailable}</span>
          <button type="button" className="btn small" onClick={retry}>
            {t.banner.retry}
          </button>
        </div>
      )}
      {status.state === 'ready' && status.source === 'cached' && (
        <div className="notice warn">
          <span>{t.route.cached(formatDateTime(status.fetchedAt))}</span>
          <button type="button" className="btn small" onClick={retry}>
            {t.banner.retry}
          </button>
        </div>
      )}
      {status.state === 'ready' && status.plan && (
        <RouteReportView
          plan={status.plan}
          fetchedAt={status.fetchedAt}
          showShortest={showShortest}
          onShowShortest={onShowShortest}
        />
      )}
      {(from || to) && (
        <button type="button" className="link-btn" onClick={clear}>
          {t.route.clear}
        </button>
      )}
    </section>
  )
}
