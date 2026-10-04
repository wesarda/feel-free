import { RefreshCw } from 'lucide-react'
import type { PlacesLoad } from '../data/loadPlaces'
import { useI18n } from '../i18n/context'

/** Phone: which data is on screen, always visible; says plainly when a source is down and offers a retry. */
export function StatusPill({ osm, onRetry, mapUnavailable }: { osm: PlacesLoad; onRetry: () => void; mapUnavailable: boolean }) {
  const { t, formatDateTime } = useI18n()
  const problem = osm.state === 'cached' || osm.state === 'unavailable'
  return (
    <div className={`status-pill glass state-${osm.state}${mapUnavailable ? ' map-down' : ''}`}>
      <span className="status-dot" aria-hidden="true" />
      <span role="status">
        {osm.state === 'loading' && (osm.fetchedAt ? t.banner.refreshing(formatDateTime(osm.fetchedAt)) : t.banner.loading)}
        {osm.state === 'live' && t.pill.live(formatDateTime(osm.fetchedAt))}
        {osm.state === 'cached' && t.banner.cached(formatDateTime(osm.fetchedAt))}
        {osm.state === 'unavailable' && t.banner.unavailable}
        {mapUnavailable && ` · ${t.banner.mapUnavailable}`}
      </span>
      {problem && (
        <button type="button" className="pill-btn" onClick={onRetry}>
          <RefreshCw size={14} aria-hidden="true" /> {t.banner.retry}
        </button>
      )}
    </div>
  )
}

/**
 * Desktop: nothing floats over the map. A saved copy is shown without comment (its date and the reason are
 * in "About the data"); a line at the top of the side panel appears only when there is nothing to show
 * or the base map is down, so an empty list is never left unexplained, and the user can retry.
 */
export function SourceNote({ osm, onRetry, mapUnavailable }: { osm: PlacesLoad; onRetry: () => void; mapUnavailable: boolean }) {
  const { t } = useI18n()
  const problem = osm.state === 'unavailable'
  if (!problem && !mapUnavailable) return null
  const text = [problem ? t.banner.unavailable : '', mapUnavailable ? t.banner.mapUnavailable : ''].filter(Boolean).join(' · ')
  return (
    <div className="source-note" role="status">
      <span className="status-dot" aria-hidden="true" />
      <span>{text}</span>
      {problem && (
        <button type="button" className="link-btn" onClick={onRetry}>
          {t.banner.retry}
        </button>
      )}
    </div>
  )
}
