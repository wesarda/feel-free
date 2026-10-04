import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import { Accessibility, Layers, LocateFixed, Minus, Plus, Satellite } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { VerdictIcon } from './Icons'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** Map buttons in the style of map apps: 3D/2D, aerial photo, compass, legend; location and zoom. */
export function MapControls({
  map,
  is3d,
  onToggle3d,
  photo,
  photoAvailable,
  onTogglePhoto,
}: {
  map: maplibregl.Map | null
  is3d: boolean
  onToggle3d: () => void
  photo: boolean
  photoAvailable: boolean
  onTogglePhoto: () => void
}) {
  const { t } = useI18n()
  const [bearing, setBearing] = useState(0)
  const [legendOpen, setLegendOpen] = useState(false)
  const [locating, setLocating] = useState<'idle' | 'busy' | 'failed' | 'outside'>('idle')
  const marker = useRef<maplibregl.Marker | null>(null)

  useEffect(() => {
    if (!map) return
    const onRotate = () => setBearing(map.getBearing())
    map.on('rotate', onRotate)
    return () => {
      map.off('rotate', onRotate)
    }
  }, [map])

  useEffect(
    () => () => {
      marker.current?.remove()
    },
    [],
  )

  useEffect(() => {
    if (locating !== 'failed' && locating !== 'outside') return
    const timer = window.setTimeout(() => setLocating('idle'), 5000)
    return () => window.clearTimeout(timer)
  }, [locating])

  const duration = () => (reducedMotion() ? 0 : 400)

  const locate = () => {
    if (!map) return
    if (!('geolocation' in navigator)) return setLocating('failed')
    setLocating('busy')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        // The map ends at the city: someone elsewhere is told so instead of being flown to its edge
        if (map.getMaxBounds()?.contains(at) === false) return setLocating('outside')
        setLocating('idle')
        if (!marker.current) {
          const dot = document.createElement('div')
          dot.className = 'you-marker'
          dot.setAttribute('role', 'img')
          dot.setAttribute('aria-label', t.mapc.you)
          marker.current = new maplibregl.Marker({ element: dot })
        }
        marker.current.setLngLat(at).addTo(map)
        map.flyTo({ center: at, zoom: Math.max(map.getZoom(), 16.5), duration: reducedMotion() ? 0 : 1000 })
      },
      () => setLocating('failed'),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <>
      <div className="map-controls top">
        <button
          type="button"
          className={is3d ? 'map-ctrl glass active' : 'map-ctrl glass'}
          aria-pressed={is3d}
          aria-label={t.mapc.view3d}
          title={t.mapc.view3d}
          onClick={onToggle3d}
        >
          <span aria-hidden="true" className="map-ctrl-text">
            3D
          </span>
        </button>
        <button
          type="button"
          className={photo ? 'map-ctrl glass active' : photoAvailable ? 'map-ctrl glass' : 'map-ctrl glass unavailable'}
          aria-pressed={photo}
          aria-label={photoAvailable ? t.mapc.photo : t.mapc.photoUnavailable}
          title={photoAvailable ? t.mapc.photo : t.mapc.photoUnavailable}
          disabled={!photoAvailable}
          onClick={onTogglePhoto}
        >
          <Satellite size={20} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="map-ctrl glass"
          aria-label={t.mapc.north}
          title={t.mapc.north}
          onClick={() => map?.easeTo({ bearing: 0, duration: duration() })}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${-bearing}deg)` }}>
            <path d="M12 2.5l4 9.5h-8z" fill="#b42318" />
            <path d="M12 21.5l-4-9.5h8z" fill="#5b6270" />
          </svg>
        </button>
        <div className="legend-wrap">
          <button
            type="button"
            className={legendOpen ? 'map-ctrl glass active' : 'map-ctrl glass'}
            aria-expanded={legendOpen}
            aria-controls="map-legend"
            aria-label={t.mapc.legend}
            title={t.mapc.legend}
            onClick={() => setLegendOpen((v) => !v)}
          >
            <Layers size={20} aria-hidden="true" />
          </button>
          {legendOpen && (
            <div id="map-legend" className="legend glass">
              <p className="legend-title">{t.legend.rating}</p>
              <ul>
                {(['match', 'partial', 'mismatch', 'unknown'] as const).map((v) => (
                  <li key={v}>
                    <VerdictIcon verdict={v} size={16} /> {t.verdict[v]}
                  </li>
                ))}
              </ul>
              <p className="legend-note">{t.legend.pinHelp}</p>
              <p className="legend-title">{t.legend.onMap}</p>
              <ul>
                {/* Steps come from the base map, so they are listed only when it is loaded */}
                {map?.getLayer('steps') && (
                  <li>
                    <svg className="legend-swatch" width="22" height="12" viewBox="0 0 22 12" aria-hidden="true">
                      <line x1="1" y1="6" x2="21" y2="6" stroke="#fff" strokeWidth="7" />
                      <line x1="1" y1="6" x2="21" y2="6" stroke="#b42318" strokeWidth="3.5" strokeDasharray="2.6 2.2" />
                    </svg>
                    {t.legend.steps}
                  </li>
                )}
                <li>
                  <span className="legend-amenity bench" aria-hidden="true">
                    <svg width="14" height="14" viewBox="4 4 16 16">
                      <path d="M6.5 10h11M6.5 13.5h11M8 13.5v4M16 13.5v4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                  {t.amenities.bench}
                </li>
                <li>
                  <span className="legend-amenity parking" aria-hidden="true">
                    <Accessibility size={13} color="#fff" strokeWidth={2.4} />
                  </span>
                  {t.amenities.parking}
                </li>
                <li>
                  <span className="legend-amenity elevator" aria-hidden="true">
                    <svg width="14" height="14" viewBox="4 4 16 16">
                      <path d="M12 5.5l4 4.5H8zM8 14h8l-4 4.5z" fill="#fff" />
                    </svg>
                  </span>
                  {t.amenities.elevator}
                </li>
                <li>
                  <span className="legend-report" aria-hidden="true" /> {t.legend.report}
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="map-controls bottom">
        <button
          type="button"
          className="map-ctrl glass"
          aria-label={locating === 'busy' ? t.mapc.locating : t.mapc.locate}
          title={t.mapc.locate}
          onClick={locate}
          disabled={locating === 'busy'}
        >
          <LocateFixed size={20} aria-hidden="true" />
        </button>
        <div className="map-ctrl-group glass">
          <button type="button" className="map-ctrl" aria-label={t.mapc.zoomIn} title={t.mapc.zoomIn} onClick={() => map?.zoomIn({ duration: duration() })}>
            <Plus size={20} aria-hidden="true" />
          </button>
          <button type="button" className="map-ctrl" aria-label={t.mapc.zoomOut} title={t.mapc.zoomOut} onClick={() => map?.zoomOut({ duration: duration() })}>
            <Minus size={20} aria-hidden="true" />
          </button>
        </div>
        <p role="status" className={locating === 'failed' || locating === 'outside' ? 'map-note glass' : 'visually-hidden'}>
          {locating === 'failed' ? t.mapc.locateFailed : locating === 'outside' ? t.mapc.locateOutside : ''}
        </p>
      </div>
    </>
  )
}
