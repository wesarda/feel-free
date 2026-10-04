import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { ALargeSmall, X } from 'lucide-react'
import { krakow } from './cities/krakow'
import { evaluatePlace, type Evaluation, type Verdict } from './core/evaluate'
import { normalizeNeeds, samePreset } from './core/needs'
import { coverage } from './core/coverage'
import type { AlertReport, CategoryKey, Needs, Report } from './core/types'
import {
  activeAlerts,
  alertsForPlace,
  confirmAlert,
  confirmationsFor,
  migrateLegacyReports,
  newAlert,
  newConfirmation,
  newCorrection,
  newDeclaration,
  withCorrections,
} from './data/reports'
import { sampleReports } from './data/sample'
import { usePlacesData } from './data/usePlacesData'
import { VoiceContext, useVision } from './vision'
import { useRoute } from './data/useRoute'
import { placeName } from './format'
import { useI18n } from './i18n/context'
import { PANEL_INSET, TOP_BAR, sheetHeights } from './layout'
import { usualRoute } from './core/route/plan'
import { eventText } from './routeText'
import { useLocalStorage } from './useLocalStorage'
import { useIsDesktop, useWindowHeight } from './useMedia'
import { useNow } from './useNow'
import { AboutData } from './components/AboutData'
import { BottomSheet, type Snap } from './components/BottomSheet'
import { MapView, type MapPadding, type RouteOverlay } from './components/MapView'
import { MenuDrawer } from './components/MenuDrawer'
import { NeedsBar } from './components/NeedsBar'
import { NeedsDialog } from './components/NeedsDialog'
import { OwnerDialog } from './components/OwnerDialog'
import { PlaceDetails, type ReportMode } from './components/PlaceDetails'
import { ReportDialog, type ReportResult, type ReportTarget } from './components/ReportDialog'
import { ResultsList } from './components/ResultsList'
import { VisionDialog } from './components/VisionDialog'
import { RoutePanel } from './components/RoutePanel'
import { SearchBar } from './components/SearchBar'
import { ShareDialog } from './components/ShareDialog'
import { SourceNote, StatusPill } from './components/StatusPill'
import './App.css'

const VERDICT_RANK: Record<Verdict, number> = { match: 0, partial: 1, unknown: 2, mismatch: 3 }

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')

function initialReports(): Report[] {
  try {
    const legacy = localStorage.getItem('cwb.reports')
    return legacy ? migrateLegacyReports(JSON.parse(legacy)) : []
  } catch {
    return []
  }
}

function initialSelection(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('place')
  } catch {
    return null
  }
}

type Picking = null | 'report' | 'from' | 'to'

export default function App() {
  const { t, lang, formatDistance } = useI18n()
  const now = useNow()
  const isDesktop = useIsDesktop()
  const vh = useWindowHeight()
  const [storedNeeds, setNeeds] = useLocalStorage<Needs | null>('kbb.needs', null)
  const needs = useMemo(() => normalizeNeeds(storedNeeds), [storedNeeds])
  const [userReports, setUserReports] = useLocalStorage<Report[]>('kbb.reports', initialReports())
  const [simulateOutage, setSimulateOutage] = useLocalStorage('kbb.simulateOutage', false)
  const [showSample, setShowSample] = useLocalStorage('kbb.showSample', true)
  const [selectedId, setSelectedId] = useState<string | null>(initialSelection)
  const [query, setQuery] = useState('')
  const [onlyMatching, setOnlyMatching] = useState(false)
  const [category, setCategory] = useState<CategoryKey | ''>('')
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [picking, setPicking] = useState<Picking>(null)
  const [view, setView] = useState<'places' | 'route'>('places')
  const [snap, setSnap] = useState<Snap>(() => (initialSelection() ? 'half' : 'peek'))
  const [snapBeforePicking, setSnapBeforePicking] = useState<Snap | null>(null)
  const [showShortest, setShowShortest] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [vision, setVision] = useVision()
  const [visionOpen, setVisionOpen] = useState(false)
  const [needsOpen, setNeedsOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [ownerOpen, setOwnerOpen] = useState(false)
  const [confirmedId, setConfirmedId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [mapUnavailable, setMapUnavailable] = useState(false)

  const data = usePlacesData(krakow, { simulateOutage, showSample })

  // User reports override the sample ones with the same id (e.g. a confirmed sample alert)
  // Sample reports are dated relative to the moment the app opened
  const [sample] = useState(() => sampleReports(new Date()))
  const reports = useMemo(() => {
    const own = new Set(userReports.map((r) => r.id))
    return [...(showSample ? sample.filter((r) => !own.has(r.id)) : []), ...userReports]
  }, [userReports, showSample, sample])
  // Expiry only needs hour precision; a coarser clock keeps routes from being re-planned every minute
  const hour = Math.floor(now.getTime() / 3600000)
  const alerts = useMemo(() => activeAlerts(reports, new Date(hour * 3600000)), [reports, hour])
  const places = useMemo(() => data.places.map((p) => withCorrections(p, reports)), [data.places, reports])
  /** Nothing to list yet: neither live data nor a saved copy has arrived. */
  const loadingPlaces = data.osm.state === 'loading' && places.length === 0

  const evaluations = useMemo(() => {
    const map = new Map<string, Evaluation>()
    if (!needs) return map
    for (const place of places) map.set(place.id, evaluatePlace(place, needs, { now, alerts: alertsForPlace(place, alerts) }))
    return map
  }, [places, needs, now, alerts])

  const verdicts = useMemo(
    () => new Map(places.map((p) => [p.id, needs ? (evaluations.get(p.id)?.verdict ?? null) : null])),
    [places, evaluations, needs],
  )

  const route = useRoute(krakow, places, needs, alerts, { simulateOutage })
  const plan = route.status.state === 'ready' ? route.status.plan : null

  // The usual route is drawn too (red and yellow stripes), with the obstacles the planned route goes around
  const usual = useMemo(() => (plan && showShortest ? usualRoute(plan) : null), [plan, showShortest])

  const routeOverlay = useMemo<RouteOverlay | null>(() => {
    const r = plan?.accessible
    if (view !== 'route' || !r) return null
    const onRoute = new Set(r.events.map((e) => `${e.kind}|${e.coords}`))
    const avoided = (usual?.obstacles ?? []).filter((e) => !onRoute.has(`${e.kind}|${e.coords}`))
    return {
      segments: {
        type: 'FeatureCollection',
        features: r.segments.map((seg) => ({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: seg.coords },
          properties: { sev: seg.sev },
        })),
      },
      events: {
        type: 'FeatureCollection',
        features: [
          ...r.events
            .filter((e) => e.severity !== 'info')
            .map((e) => ({ e, label: eventText(e, t, formatDistance) })),
          ...avoided.map((e) => ({ e, label: `${t.route.usualOnMap}: ${eventText(e, t, formatDistance)}` })),
        ].map(({ e, label }) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: e.coords },
          properties: { icon: `sev-${e.severity}`, label, detail: e.street ?? '' },
        })),
      },
      shortest: usual
        ? {
            type: 'FeatureCollection',
            features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: usual.route.line }, properties: {} }],
          }
        : undefined,
    }
  }, [plan, view, usual, t, formatDistance])

  // The camera takes in both routes while the usual one is shown
  const routeFocus = useMemo(() => (plan?.accessible ? [...plan.accessible.line, ...(usual?.route.line ?? [])] : null), [plan, usual])

  const visiblePlaces = useMemo(() => {
    const q = normalize(query.trim())
    const filtered = places.filter((p) => {
      if (category && p.category !== category) return false
      if (onlyMatching && needs && evaluations.get(p.id)?.verdict !== 'match') return false
      if (!q) return true
      const haystack = normalize([p.name, p.altNames?.en, p.address, t.categories[p.category]].filter(Boolean).join(' '))
      return haystack.includes(q)
    })
    const collator = new Intl.Collator(lang)
    return filtered.sort((a, b) => {
      if (needs) {
        const va = evaluations.get(a.id)?.verdict
        const vb = evaluations.get(b.id)?.verdict
        const diff = (va ? VERDICT_RANK[va] : 9) - (vb ? VERDICT_RANK[vb] : 9)
        if (diff) return diff
      }
      return collator.compare(placeName(a, lang) || t.categories[a.category], placeName(b, lang) || t.categories[b.category])
    })
  }, [places, query, category, onlyMatching, needs, evaluations, lang, t])

  const categories = useMemo(() => {
    const present = [...new Set(places.map((p) => p.category))]
    const collator = new Intl.Collator(lang)
    return present.sort((a, b) => collator.compare(t.categories[a], t.categories[b]))
  }, [places, lang, t])

  const selected = places.find((p) => p.id === selectedId || p.aliases?.includes(selectedId ?? '')) ?? null

  // Each view starts at the top; going back to the list restores where it was scrolled
  const mainRef = useRef<HTMLElement>(null)
  const listScroll = useRef(0)
  const getScroller = () => (isDesktop ? mainRef.current : (mainRef.current?.parentElement ?? null))
  const rememberList = () => {
    if (view === 'places' && !selected) listScroll.current = getScroller()?.scrollTop ?? 0
  }
  const scrollKey = view === 'route' ? 'route' : (selected?.id ?? '')
  useLayoutEffect(() => {
    const scroller = isDesktop ? mainRef.current : (mainRef.current?.parentElement ?? null)
    if (scroller) scroller.scrollTop = scrollKey ? 0 : listScroll.current
  }, [scrollKey, isDesktop])

  useEffect(() => {
    try {
      const url = new URL(window.location.href)
      if (selected) url.searchParams.set('place', selected.id)
      else url.searchParams.delete('place')
      window.history.replaceState(null, '', url)
    } catch {
      // ignore: URL sync is a convenience
    }
  }, [selected])

  useEffect(() => {
    if (!announcement) return
    const timer = window.setTimeout(() => setAnnouncement(''), 6000)
    return () => window.clearTimeout(timer)
  }, [announcement])

  // Picking a point needs the map: the phone panel steps aside and comes back afterwards
  const startPicking = (which: Exclude<Picking, null>) => {
    setPicking(which)
    if (!isDesktop && snap !== 'peek') {
      setSnapBeforePicking(snap)
      setSnap('peek')
    }
  }
  const stopPicking = () => {
    setPicking(null)
    if (snapBeforePicking) setSnap(snapBeforePicking)
    setSnapBeforePicking(null)
  }

  useEffect(() => {
    if (!picking) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setPicking(null)
      if (snapBeforePicking) setSnap(snapBeforePicking)
      setSnapBeforePicking(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picking, snapBeforePicking])

  const selectPlace = (id: string) => {
    rememberList()
    setSelectedId(id)
    setView('places')
    if (picking) setPicking(null)
    if (snap === 'peek') setSnap('half')
  }

  const addReport = (report: Report) => setUserReports((prev) => [...prev.filter((r) => r.id !== report.id), report])

  const saveReport = (target: ReportTarget, result: ReportResult) => {
    const at = new Date()
    if (result.kind === 'correction' && target.mode === 'change') {
      addReport(newCorrection(target.place, result.factKey, result.value, result.comment, at))
    } else if (result.kind === 'alert') {
      const coords = target.mode === 'map' ? target.coords : target.place.coords
      const placeId = target.mode === 'map' ? undefined : target.place.id
      addReport(newAlert(result.alertType, coords, result.comment, at, placeId))
    }
    setReportTarget(null)
    setAnnouncement(t.report.thanks)
  }

  const onConfirmAlert = (alert: AlertReport) => {
    addReport(confirmAlert(alert, new Date()))
    setAnnouncement(t.report.confirmedAlert)
  }

  const onReport = (mode: ReportMode) => selected && setReportTarget({ mode, place: selected })

  const openRoute = () => {
    rememberList()
    setView('route')
    setPicking(null)
    if (!isDesktop && snap === 'peek') setSnap('half')
  }

  const mapReports = alerts.filter((a) => !a.placeId)
  const heights = sheetHeights(vh)
  // The camera keeps places in the part of the map that the panels leave visible
  const sheetVisible = isDesktop ? 0 : Math.min(heights[snap], heights.half)
  const padding = useMemo<MapPadding>(
    () => (isDesktop ? { top: 0, bottom: 0, left: PANEL_INSET } : { top: TOP_BAR, bottom: sheetVisible, left: 0 }),
    [isDesktop, sheetVisible],
  )
  const layoutVars = {
    '--sheet-h': `${sheetVisible}px`,
    '--panel-w': isDesktop ? `${PANEL_INSET}px` : '0px',
  } as CSSProperties

  const top = (
    <>
      {view === 'route' ? null : (
        <SearchBar
          query={query}
          onQuery={(q) => {
            setQuery(q)
            if (selectedId) setSelectedId(null)
            if (!isDesktop && snap === 'peek' && q) setSnap('half')
          }}
          onFocus={() => {
            if (!isDesktop && snap === 'peek') setSnap('half')
          }}
          onBack={selected ? () => setSelectedId(null) : undefined}
          onMenu={() => setMenuOpen(true)}
          onVision={isDesktop ? () => setVisionOpen(true) : undefined}
          onDirections={openRoute}
        />
      )}
      <NeedsBar needs={needs} onChange={setNeeds} onSettings={() => setNeedsOpen(true)} />
    </>
  )

  const content =
    view === 'route' ? (
      <RoutePanel
        city={krakow}
        places={places}
        needs={needs}
        {...route}
        showShortest={showShortest}
        onShowShortest={setShowShortest}
        onPickOnMap={startPicking}
        onBack={() => setView('places')}
        onVision={isDesktop ? () => setVisionOpen(true) : undefined}
      />
    ) : selected ? (
      <PlaceDetails
        key={selected.id}
        place={selected}
        needs={needs}
        evaluation={evaluations.get(selected.id) ?? null}
        confirmations={confirmationsFor(selected.id, reports)}
        now={now}
        heroFirst={isDesktop}
        justConfirmed={confirmedId === selected.id}
        onConfirm={() => {
          addReport(newConfirmation(selected, new Date()))
          setConfirmedId(selected.id)
        }}
        onReport={onReport}
        onConfirmAlert={onConfirmAlert}
        onShare={() => setShareOpen(true)}
        onDeclare={() => setOwnerOpen(true)}
        onRouteTo={() => {
          route.setTo({ kind: 'place', placeId: selected.id })
          openRoute()
        }}
      />
    ) : (
      <section aria-labelledby="places-title" className="places">
        <h2 id="places-title" className="visually-hidden">
          {t.tabs.places}
        </h2>
        <div className="list-tools">
          <label className="select-chip">
            <span className="visually-hidden">{t.places.category}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as CategoryKey | '')}>
              <option value="">{t.places.allCategories}</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {t.categories[c]}
                </option>
              ))}
            </select>
          </label>
          {needs && (
            <button
              type="button"
              className={onlyMatching ? 'chip active' : 'chip'}
              aria-pressed={onlyMatching}
              onClick={() => setOnlyMatching((v) => !v)}
            >
              {t.places.onlyMatchingShort}
            </button>
          )}
        </div>
        <p className="list-count" aria-live="polite">
          {loadingPlaces ? t.banner.loading : t.places.count(visiblePlaces.length, places.length)}
        </p>
        {!needs && <p className="notice">{t.verdictHelp.none}</p>}
        {!loadingPlaces && <ResultsList places={visiblePlaces} evaluations={evaluations} hasNeeds={Boolean(needs)} onSelect={selectPlace} />}
        <button type="button" className="btn ghost wide" onClick={() => startPicking('report')}>
          {t.places.reportBarrier}
        </button>
        {mapReports.length > 0 && <p className="muted small">{t.report.mapReports(mapReports.length)}</p>}
      </section>
    )

  const main = (
    <main
      id="main-content"
      ref={mainRef}
      tabIndex={-1}
      className="panel-body"
      onFocus={(e) => {
        // The on-screen keyboard takes the lower half of a phone: a half-open panel would be under it
        if (!isDesktop && snap !== 'full' && e.target instanceof HTMLElement && e.target.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]), textarea')) setSnap('full')
      }}
    >
      <VoiceContext.Provider value={vision.voice}>{content}</VoiceContext.Provider>
    </main>
  )

  return (
    <div
      className={isDesktop ? 'app desktop' : `app phone sheet-${snap}${view === 'route' ? ' view-route' : ''}`}
      style={layoutVars}
      // Browsers without overflow: clip can still scroll the screen itself when a field takes focus
      onScroll={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.scrollTop = 0
      }}
    >
      <a className="skip-link" href="#main-content">
        {t.skipToContent}
      </a>

      <section className="map-area" aria-label={t.map.label}>
        <MapView
          places={places}
          amenities={data.amenities}
          verdicts={verdicts}
          selectedId={selected?.id ?? null}
          onSelect={selectPlace}
          alerts={alerts}
          picking={picking !== null}
          onPick={(coords) => {
            if (picking === 'from') route.setFrom({ kind: 'point', coords })
            else if (picking === 'to') route.setTo({ kind: 'point', coords })
            else setReportTarget({ mode: 'map', coords })
            stopPicking()
          }}
          route={routeOverlay}
          focus={view === 'route' ? routeFocus : null}
          onMapUnavailable={() => setMapUnavailable(true)}
          padding={padding}
        />
        {!isDesktop && <StatusPill osm={data.osm} onRetry={data.retry} mapUnavailable={mapUnavailable} />}
        {view === 'route' && usual && (
          // Which line is which: the usual route is striped red and yellow, the one planned for the user's needs is green
          <div className="route-legend glass" role="note">
            <span>
              <i className="route-swatch usual" aria-hidden="true" /> {t.route.usual}
            </span>
            <span>
              <i className="route-swatch easier" aria-hidden="true" /> {t.route.easierOnMap}
            </span>
          </div>
        )}
        {!isDesktop && (
          // Phone: the vision settings are one tap away on every screen, next to the "i" of the map credits
          <button type="button" className="vision-fab" onClick={() => setVisionOpen(true)} aria-label={t.vision.open} title={t.vision.open} aria-haspopup="dialog">
            <ALargeSmall size={22} aria-hidden="true" />
          </button>
        )}
        {picking && (
          <div className="pick-hint glass">
            <p>{picking === 'report' ? t.report.pickOnMap : t.route.pickHint(picking)}</p>
            <button type="button" className="btn small" onClick={stopPicking}>
              <X size={16} aria-hidden="true" /> {t.cancel}
            </button>
          </div>
        )}
        <div role="status" className={announcement ? 'toast glass' : 'visually-hidden'}>
          {announcement}
        </div>
      </section>

      {isDesktop ? (
        <div className="panel glass">
          <header className="panel-top">{top}</header>
          <SourceNote osm={data.osm} onRetry={data.retry} mapUnavailable={mapUnavailable} />
          {main}
        </div>
      ) : (
        <>
          <header className="top-bar">{top}</header>
          <BottomSheet snap={snap} onSnap={setSnap}>
            {main}
          </BottomSheet>
        </>
      )}

      {menuOpen && (
        <MenuDrawer
          mapReports={mapReports.length}
          onClose={() => setMenuOpen(false)}
          onVision={() => {
            setMenuOpen(false)
            setVisionOpen(true)
          }}
          onReportOnMap={() => {
            setMenuOpen(false)
            startPicking('report')
          }}
          onAbout={() => {
            setMenuOpen(false)
            setAboutOpen(true)
          }}
        />
      )}
      {visionOpen && <VisionDialog vision={vision} onChange={setVision} onClose={() => setVisionOpen(false)} />}
      {needsOpen && <NeedsDialog needs={needs} onChange={setNeeds} onClose={() => setNeedsOpen(false)} />}
      {reportTarget && (
        <ReportDialog target={reportTarget} onSave={(result) => saveReport(reportTarget, result)} onClose={() => setReportTarget(null)} />
      )}
      {ownerOpen && selected && (
        <OwnerDialog
          place={selected}
          now={now}
          onSave={(values, comment) => {
            addReport(newDeclaration(selected, values, comment, new Date()))
            setOwnerOpen(false)
            setAnnouncement(t.owner.saved)
          }}
          onClose={() => setOwnerOpen(false)}
        />
      )}
      {shareOpen && selected && (
        <ShareDialog place={selected} preset={needs ? samePreset(needs) : null} onClose={() => setShareOpen(false)} />
      )}
      {aboutOpen && (
        <AboutData
          city={krakow}
          statuses={data.statuses}
          coverage={coverage(data.places, 'osm', now)}
          simulateOutage={simulateOutage}
          onSimulateOutage={setSimulateOutage}
          showSample={showSample}
          onShowSample={setShowSample}
          onClose={() => setAboutOpen(false)}
        />
      )}
    </div>
  )
}
