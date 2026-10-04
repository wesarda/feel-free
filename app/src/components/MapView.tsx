import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { FeatureCollection } from 'geojson'
import type { Verdict } from '../core/evaluate'
import type { AlertReport, Amenity, LngLat, Place } from '../core/types'
import { placeName } from '../format'
import { useI18n } from '../i18n/context'
import { EASIER_ROUTE_COLOR, ROUTE_COLOR, SEVERITY_COLORS, USUAL_ROUTE_COLORS } from '../theme'
import { useLocalStorage } from '../useLocalStorage'
import { MapControls } from './MapControls'
import { AMENITY_ICON, addMapIcons, drawMissingPin, pinId } from './mapIcons'

// maplibre-gl finds its worker next to its own file, which the production bundle does not have;
// without this the built app shows no streets, buildings or pins
maplibregl.setWorkerUrl(maplibreWorkerUrl)

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty'
const RYNEK_GLOWNY: LngLat = [19.9373, 50.0617]
const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

// Open elevation tiles (AWS Open Data, Terrarium encoding); without them the map stays 3D, just flat
const TERRAIN_TILES = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
const TERRAIN_ATTRIBUTION = '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noreferrer">Terrain Tiles</a>'
const TERRAIN = { source: 'terrain-dem', exaggeration: 1.4 }
const DEM_SOURCES = ['terrain-dem', 'hillshade-dem']
/** The credit MapLibre adds by itself when it creates the control. */
const MAPLIBRE_CREDIT = '<a href="https://maplibre.org/" target="_blank" rel="noreferrer">MapLibre</a>'
const VIEW_3D = { pitch: 60, bearing: -17 }
/** Phones report 3 device pixels per CSS pixel and more: the 3D map costs twice as much there for no visible gain. */
const MAX_PIXEL_RATIO = 2
const smallScreen = () => window.matchMedia?.('(max-width: 899px)').matches ?? false
/** The aerial photo is a few megabytes of tiles per session: not the default for someone who asked the browser to save data. */
const savesData = () => (navigator as { connection?: { saveData?: boolean } }).connection?.saveData === true

// Aerial photo of Poland, 25 cm per pixel or better (GUGiK orthophoto: open public data, no key).
// Shown instead of the drawn base map, draped over the terrain, with OSM buildings in 3D on top.
const ORTHO_TILES =
  'https://mapy.geoportal.gov.pl/wss/service/PZGIK/ORTO/WMTS/StandardResolution?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
  '&LAYER=ORTOFOTOMAPA&STYLE=default&FORMAT=image%2Fjpeg&TILEMATRIXSET=EPSG%3A3857&TILEMATRIX=EPSG%3A3857%3A{z}&TILEROW={y}&TILECOL={x}'
const ORTHO_ATTRIBUTION = 'Ortofotomapa © <a href="https://www.geoportal.gov.pl" target="_blank" rel="noreferrer">GUGiK</a>'

// The app covers Kraków, so the map does too: a circle around the city, about 5 km wider than the city
// itself (its farthest corners are some 18 km from the middle). The camera cannot leave the square
// around the circle, no map, photo or elevation tiles are downloaded outside that square, and a plain
// mask covers everything outside the circle.
const CITY_MIDDLE: LngLat = [20.0, 50.05]
const CITY_RADIUS_KM = 23
const KM_PER_DEGREE = 111.32
const LAT_RADIUS = CITY_RADIUS_KM / KM_PER_DEGREE
const LNG_RADIUS = CITY_RADIUS_KM / (KM_PER_DEGREE * Math.cos((CITY_MIDDLE[1] * Math.PI) / 180))
/** [west, south, east, north] */
const CITY_BOUNDS: [number, number, number, number] = [
  CITY_MIDDLE[0] - LNG_RADIUS,
  CITY_MIDDLE[1] - LAT_RADIUS,
  CITY_MIDDLE[0] + LNG_RADIUS,
  CITY_MIDDLE[1] + LAT_RADIUS,
]
const [WEST, SOUTH, EAST, NORTH] = CITY_BOUNDS
const CITY_CIRCLE: LngLat[] = Array.from({ length: 97 }, (_, i) => {
  const angle = (i / 96) * Math.PI * 2
  return [CITY_MIDDLE[0] + LNG_RADIUS * Math.cos(angle), CITY_MIDDLE[1] + LAT_RADIUS * Math.sin(angle)]
})
const OUTSIDE_CITY: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        // The world with a round hole where the city is
        coordinates: [[[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]], CITY_CIRCLE],
      },
    },
  ],
}

/** Every tile source of the base map stops at the city: tiles outside are never requested. */
function onlyTheCity(style: maplibregl.StyleSpecification): maplibregl.StyleSpecification {
  const sources = Object.fromEntries(
    Object.entries(style.sources).map(([id, source]) => [id, source.type === 'geojson' ? source : { ...source, bounds: CITY_BOUNDS }]),
  )
  return { ...style, sources } as maplibregl.StyleSpecification
}
export type Basemap = 'photo' | 'map'

/** The base map's shop and cafe icons: on the photo they only crowd our pins, which show the same places. */
const hiddenOnPhoto = (l: maplibregl.LayerSpecification) => 'source-layer' in l && l['source-layer'] === 'poi'
// Below zoom 14 the tiles carry buildings without a height: an expression that fails paints them black
const BUILDING_HEIGHT: maplibregl.ExpressionSpecification = ['coalesce', ['get', 'render_height'], 0]
const BUILDING_COLOR: Record<Basemap, maplibregl.ExpressionSpecification> = {
  map: ['interpolate', ['linear'], BUILDING_HEIGHT, 0, '#ece7df', 20, '#ddd3c5', 50, '#c4b6a2'],
  // Close to the stone and plaster of the Old Town, so the boxes sit in the photo instead of glowing on it.
  // (OSM facade colours were tried: too few and too loud to look real.)
  photo: ['interpolate', ['linear'], BUILDING_HEIGHT, 0, '#d9d0c1', 20, '#cbbfad', 50, '#b3a48f'],
}

/** Plain background used when the base map cannot be loaded, so markers and routes still show. */
const FALLBACK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'background', type: 'background', paint: { 'background-color': '#e9ecef' } }],
}

export type RouteOverlay = {
  /** LineStrings with a `sev` property: ok, difficulty, barrier or unknown. */
  segments: FeatureCollection
  /** Points with `icon` and `label` properties. */
  events: FeatureCollection
  /** The plain shortest route, for comparison. */
  shortest?: FeatureCollection
}

/** Space covered by the panels, so the camera centres places in the part of the map that is visible. */
export type MapPadding = { top: number; bottom: number; left: number }

type Props = {
  places: Place[]
  /** Benches, disabled parking and elevators from OpenStreetMap. */
  amenities: Amenity[]
  verdicts: Map<string, Verdict | null>
  selectedId: string | null
  onSelect: (id: string) => void
  alerts: AlertReport[]
  picking: boolean
  onPick: (coords: LngLat) => void
  route?: RouteOverlay | null
  focus?: LngLat[] | null
  onMapUnavailable?: () => void
  padding: MapPadding
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const toPadding = (p: MapPadding) => ({ top: p.top, bottom: p.bottom, left: p.left, right: 0 })

export function MapView({ places, amenities, verdicts, selectedId, onSelect, alerts, picking, onPick, route, focus, onMapUnavailable, padding }: Props) {
  const { t, lang, formatDate } = useI18n()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(0)
  const [is3d, setIs3d] = useLocalStorage('kbb.map3d', true)
  const [basemap, setBasemap] = useLocalStorage<Basemap>('kbb.basemap', savesData() ? 'map' : 'photo')
  const [orthoFailed, setOrthoFailed] = useState(false)
  const photo = basemap === 'photo' && !orthoFailed
  const terrainFailed = useRef(false)
  /** Base map layers that were visible before the photo hid them. */
  const baseLayers = useRef<string[]>([])

  // Map event handlers are bound once, so they read the latest props through refs
  const latest = useRef({ onSelect, onPick, picking, onMapUnavailable, is3d, padding })
  useEffect(() => {
    latest.current = { onSelect, onPick, picking, onMapUnavailable, is3d, padding }
  })

  useEffect(() => {
    const start3d = latest.current.is3d
    const map = new maplibregl.Map({
      container: containerRef.current!,
      center: RYNEK_GLOWNY,
      zoom: 16,
      pitch: start3d ? VIEW_3D.pitch : 0,
      bearing: start3d ? VIEW_3D.bearing : 0,
      maxPitch: start3d ? 85 : 0,
      pixelRatio: Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO),
      maxBounds: [[WEST, SOUTH], [EAST, NORTH]],
      minZoom: 10,
      attributionControl: false,
    })
    map.setStyle(STYLE_URL, { transformStyle: (_previous, next) => onlyTheCity(next) })
    map.setPadding(toPadding(latest.current.padding))
    mapRef.current = map
    // Development only: lets the browser tests inspect what the map rendered
    if (import.meta.env.DEV) (window as unknown as { __kbbMap?: maplibregl.Map }).__kbbMap = map
    setMap(map)
    let styleLoaded = false
    let terrainErrors = 0
    let orthoErrors = 0

    map.addControl(new maplibregl.ScaleControl())
    // Map credits: one line on a wide screen. On a phone they took two lines of the map, so they start
    // folded behind the "i" button (MapLibre would open them until the map is first moved); the menu lists them too.
    const folded = smallScreen()
    map.addControl(new maplibregl.AttributionControl({ compact: folded ? true : undefined, customAttribution: MAPLIBRE_CREDIT }))
    const credits = folded ? map.getContainer().querySelector('.maplibregl-ctrl-attrib') : null
    if (credits) {
      // MapLibre opens them once, when the first credits arrive with the style: that is the moment to fold
      const observer = new MutationObserver(() => {
        if (!credits.classList.contains('maplibregl-compact-show')) return
        observer.disconnect()
        credits.removeAttribute('open')
        credits.classList.remove('maplibregl-compact-show')
      })
      observer.observe(credits, { attributes: true, attributeFilter: ['class'] })
      map.once('remove', () => observer.disconnect())
    }

    // If the base map provider is down, keep working on a plain background
    const fallback = window.setTimeout(() => {
      if (!styleLoaded) {
        map.setStyle(FALLBACK_STYLE)
        latest.current.onMapUnavailable?.()
      }
    }, 10000)
    map.on('error', (e) => {
      // Photo service down: fall back to the drawn map without changing the user's choice
      if ((e as { sourceId?: string }).sourceId === 'ortho') {
        if (++orthoErrors === 6) setOrthoFailed(true)
        return
      }
      // Elevation tiles that do not load: give up on terrain and relief shading instead of showing holes
      if (DEM_SOURCES.includes((e as { sourceId?: string }).sourceId ?? '')) {
        terrainErrors++
        if (terrainErrors >= 3 && !terrainFailed.current) {
          terrainFailed.current = true
          map.setTerrain(null)
          if (map.getLayer('relief')) map.setLayoutProperty('relief', 'visibility', 'none')
        }
        return
      }
      if (!styleLoaded && String((e.error as Error | undefined)?.message ?? '').includes('styles')) {
        window.clearTimeout(fallback)
        map.setStyle(FALLBACK_STYLE)
        latest.current.onMapUnavailable?.()
      }
    })

    // Photo errors count in a row: a tile that loads means the service is up
    map.on('sourcedata', (e) => {
      if (e.sourceId === 'ortho' && e.tile) orthoErrors = 0
    })

    map.on('style.load', () => {
      styleLoaded = true
      window.clearTimeout(fallback)
      addMapIcons(map)
      const style = map.getStyle()
      const hasGlyphs = Boolean(style.glyphs)
      // Our layers on the base map go under its labels
      const firstLabel = style.layers.find((l) => l.type === 'symbol')?.id
      baseLayers.current = style.layers
        .filter((l) => hiddenOnPhoto(l) && l.layout?.visibility !== 'none')
        .map((l) => l.id)

      map.addSource('ortho', {
        type: 'raster',
        tiles: [ORTHO_TILES],
        tileSize: 256,
        // About 0.4 m per pixel; level 19 is four times the requests for a difference hardly visible in 3D
        maxzoom: 18,
        bounds: CITY_BOUNDS,
        attribution: ORTHO_ATTRIBUTION,
      })
      // Over the drawn streets and parks, under buildings and labels: where a photo tile is still loading,
      // the drawn map shows through instead of an empty patch
      const underBuildings = map.getLayer('building-3d') ? 'building-3d' : firstLabel
      map.addLayer(
        { id: 'ortho', type: 'raster', source: 'ortho', layout: { visibility: 'none' }, paint: { 'raster-fade-duration': 150 } },
        underBuildings,
      )

      if (map.getLayer('building-3d')) {
        map.setLayerZoomRange('building-3d', 13, 24)
        map.setPaintProperty('building-3d', 'fill-extrusion-opacity', 0.9)
      }
      map.setSky({
        'sky-color': '#9fc8f0',
        'horizon-color': '#eaf2fb',
        'fog-color': '#f2f5f9',
        'sky-horizon-blend': 0.6,
        'horizon-fog-blend': 0.5,
        'fog-ground-blend': 0.4,
        'atmosphere-blend': 0,
      })
      map.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.3, position: [1.5, 200, 35] })
      map.addSource('terrain-dem', {
        type: 'raster-dem',
        tiles: [TERRAIN_TILES],
        encoding: 'terrarium',
        tileSize: 256,
        maxzoom: 14,
        bounds: CITY_BOUNDS,
        attribution: TERRAIN_ATTRIBUTION,
      })
      if (latest.current.is3d && !terrainFailed.current) map.setTerrain(TERRAIN)

      // Relief shading from the same elevation data: the Vistula banks, Wawel hill, the mounds
      map.addSource('hillshade-dem', { type: 'raster-dem', tiles: [TERRAIN_TILES], encoding: 'terrarium', tileSize: 256, maxzoom: 14, bounds: CITY_BOUNDS })
      const underRoads = map.getLayer('building') ? 'building' : (style.layers.find((l) => l.type === 'line')?.id ?? firstLabel)
      map.addLayer(
        {
          id: 'relief',
          type: 'hillshade',
          source: 'hillshade-dem',
          layout: { visibility: terrainFailed.current ? 'none' : 'visible' },
          paint: {
            'hillshade-exaggeration': 0.35,
            'hillshade-shadow-color': 'rgba(70, 58, 40, 0.45)',
            'hillshade-highlight-color': 'rgba(255, 255, 255, 0.35)',
            'hillshade-accent-color': 'rgba(70, 58, 40, 0.15)',
          },
        },
        underRoads,
      )

      // Steps are a barrier for wheelchairs and strollers, so the base map shows every flight of steps
      // from OpenStreetMap (OpenMapTiles: transportation, class=path, subclass=steps). Above the photo.
      if (map.getSource('openmaptiles')) {
        const steps = ['all', ['==', ['get', 'class'], 'path'], ['==', ['get', 'subclass'], 'steps']] as maplibregl.FilterSpecification
        map.addLayer(
          {
            id: 'steps-casing',
            type: 'line',
            source: 'openmaptiles',
            'source-layer': 'transportation',
            minzoom: 15,
            filter: steps,
            paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 15, 4, 19, 12] },
          },
          underBuildings,
        )
        map.addLayer(
          {
            id: 'steps',
            type: 'line',
            source: 'openmaptiles',
            'source-layer': 'transportation',
            minzoom: 15,
            filter: steps,
            paint: {
              'line-color': SEVERITY_COLORS.barrier,
              'line-width': ['interpolate', ['linear'], ['zoom'], 15, 2.5, 19, 9],
              'line-dasharray': [0.35, 0.3],
            },
          },
          underBuildings,
        )
      }

      // Over the whole base map, labels and buildings included; under routes, pins and reports
      map.addSource('outside-city', { type: 'geojson', data: OUTSIDE_CITY })
      map.addLayer({ id: 'outside-city', type: 'fill', source: 'outside-city', paint: { 'fill-color': '#e9ecef', 'fill-antialias': false } })

      map.addSource('route-shortest', { type: 'geojson', data: EMPTY })
      // The usual route: red and yellow stripes on a dark edge, so it reads on the aerial photo as well as on
      // the drawn map, and differs from the proposed route by its pattern, not only by its colour
      map.addLayer({
        id: 'route-shortest-casing',
        type: 'line',
        source: 'route-shortest',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': USUAL_ROUTE_COLORS.edge, 'line-width': 8 },
      })
      map.addLayer({
        id: 'route-shortest-base',
        type: 'line',
        source: 'route-shortest',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': USUAL_ROUTE_COLORS.yellow, 'line-width': 5 },
      })
      map.addLayer({
        id: 'route-shortest',
        type: 'line',
        source: 'route-shortest',
        layout: { 'line-join': 'round' },
        paint: { 'line-color': USUAL_ROUTE_COLORS.red, 'line-width': 5, 'line-dasharray': [1.5, 1.5] },
      })
      map.addSource('route', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#ffffff', 'line-width': 10 },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        filter: ['!=', ['get', 'sev'], 'unknown'],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-width': 6,
          // Segments by what they mean for the user; anything else is the plain route colour
          'line-color': ['match', ['get', 'sev'], 'barrier', SEVERITY_COLORS.barrier, 'difficulty', SEVERITY_COLORS.difficulty, EASIER_ROUTE_COLOR],
        },
      })
      map.addLayer({
        id: 'route-line-unknown',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'sev'], 'unknown'],
        layout: { 'line-cap': 'butt', 'line-join': 'round' },
        paint: { 'line-width': 6, 'line-color': EASIER_ROUTE_COLOR, 'line-dasharray': [1.2, 0.8] },
      })
      map.addSource('route-events', { type: 'geojson', data: EMPTY })
      // What is fine on the way (benches, flush kerbs) shows only where there is room; problems always show, on top
      const fine: maplibregl.ExpressionSpecification = ['==', ['get', 'icon'], 'sev-ok']
      map.addLayer({
        id: 'route-events-ok',
        type: 'symbol',
        source: 'route-events',
        filter: fine,
        layout: { 'icon-image': ['get', 'icon'], 'icon-size': 0.6, 'icon-padding': 6 },
      })
      map.addLayer({
        id: 'route-events',
        type: 'symbol',
        source: 'route-events',
        filter: ['!', fine],
        layout: { 'icon-image': ['get', 'icon'], 'icon-size': 0.8, 'icon-allow-overlap': true },
      })

      // Benches, disabled parking and elevators: below the places, which win when they overlap
      map.addSource('amenities', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'amenities-icon',
        type: 'symbol',
        source: 'amenities',
        minzoom: 15.5,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 15.5, 0.7, 18, 1],
          'icon-padding': 1,
        },
      })

      // Pins hide each other where they would overlap, like in map apps: zooming in shows more.
      // The list always has every place.
      map.addSource('places', { type: 'geojson', data: EMPTY })
      const notSelected = ['!=', ['get', 'selected'], true] as maplibregl.FilterSpecification
      map.addLayer({
        id: 'places-icon',
        type: 'symbol',
        source: 'places',
        filter: notSelected,
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': ['interpolate', ['linear'], ['zoom'], 12, 0.55, 15, 0.8, 17, 1],
          'icon-padding': 1,
          'symbol-sort-key': ['get', 'rank'],
        },
      })
      if (hasGlyphs) {
        map.addLayer({
          id: 'places-label',
          type: 'symbol',
          source: 'places',
          minzoom: 15,
          filter: notSelected,
          layout: {
            'text-field': ['get', 'name'],
            'text-font': ['Noto Sans Bold'],
            'text-size': 12.5,
            'text-offset': [0, 1.35],
            'text-anchor': 'top',
            'text-max-width': 9,
            'text-optional': true,
            // On a phone the names would cover the map; more room around each leaves the important ones
            'text-padding': smallScreen() ? 14 : 2,
            'symbol-sort-key': ['get', 'rank'],
          },
          paint: { 'text-color': '#1f2328', 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
        })
      }
      // The selected place is always shown, larger, with a ring and its name
      map.addLayer({
        id: 'places-halo',
        type: 'circle',
        source: 'places',
        filter: ['==', ['get', 'selected'], true],
        paint: {
          'circle-radius': 24,
          'circle-color': 'rgba(11, 87, 208, 0.16)',
          'circle-stroke-color': ROUTE_COLOR,
          'circle-stroke-width': 3,
        },
      })
      map.addLayer({
        id: 'places-selected',
        type: 'symbol',
        source: 'places',
        filter: ['==', ['get', 'selected'], true],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-size': 1.2,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          ...(hasGlyphs
            ? {
                'text-field': ['get', 'name'],
                'text-font': ['Noto Sans Bold'],
                'text-size': 14,
                'text-offset': [0, 1.9],
                'text-anchor': 'top',
                'text-max-width': 10,
                'text-allow-overlap': true,
              }
            : {}),
        },
        paint: { 'text-color': '#0a3a8c', 'text-halo-color': '#ffffff', 'text-halo-width': 2.5 },
      })

      map.addSource('reports', { type: 'geojson', data: EMPTY })
      map.addLayer({
        id: 'reports-icon',
        type: 'symbol',
        source: 'reports',
        layout: { 'icon-image': 'report', 'icon-size': 0.9, 'icon-allow-overlap': true },
      })

      setReady((n) => n + 1)
    })

    // MapLibre asks for each pin the first time a tile needs it; it is drawn on the spot
    map.setMissingStyleImageResolver((id) => drawMissingPin(map, id))

    const select = (e: maplibregl.MapLayerMouseEvent) => {
      if (latest.current.picking) return
      const id = e.features?.[0]?.properties?.id
      if (typeof id === 'string') latest.current.onSelect(id)
    }
    map.on('click', 'places-icon', select)
    map.on('click', 'places-selected', select)

    const popup = (e: maplibregl.MapLayerMouseEvent) => {
      if (latest.current.picking) return
      const props = e.features?.[0]?.properties
      if (!props?.label) return
      const box = document.createElement('div')
      const title = document.createElement('strong')
      title.textContent = props.label
      box.append(title)
      if (props.detail) {
        const detail = document.createElement('div')
        detail.textContent = props.detail
        box.append(detail)
      }
      new maplibregl.Popup({ offset: 12 }).setLngLat(e.lngLat).setDOMContent(box).addTo(map)
    }
    map.on('click', 'reports-icon', popup)
    map.on('click', 'route-events', popup)
    map.on('click', 'route-events-ok', popup)
    map.on('click', 'amenities-icon', popup)

    map.on('click', (e) => {
      if (latest.current.picking) latest.current.onPick([e.lngLat.lng, e.lngLat.lat])
    })

    for (const layer of ['places-icon', 'places-selected', 'reports-icon', 'route-events', 'route-events-ok', 'amenities-icon']) {
      map.on('mouseenter', layer, () => {
        if (!latest.current.picking) map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', layer, () => {
        if (!latest.current.picking) map.getCanvas().style.cursor = ''
      })
    }

    return () => {
      window.clearTimeout(fallback)
      mapRef.current = null
      setMap(null)
      map.remove()
    }
  }, [])

  useEffect(() => {
    mapRef.current?.getCanvas().setAttribute('aria-label', t.map.label)
  }, [ready, t])

  useEffect(() => {
    if (!ready) return
    // Where pins overlap, the ones that fit the needs stay visible first
    const rank = { match: 0, partial: 1, mismatch: 2, unknown: 3, none: 4 }
    mapRef.current?.getSource<maplibregl.GeoJSONSource>('places')?.setData({
      type: 'FeatureCollection',
      features: places.map((p) => {
        const verdict = verdicts.get(p.id) ?? 'none'
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: p.coords },
          properties: {
            id: p.id,
            name: placeName(p, lang),
            icon: pinId(p.category, verdict),
            rank: rank[verdict],
            selected: p.id === selectedId,
          },
        }
      }),
    })
  }, [ready, places, verdicts, selectedId, lang])

  useEffect(() => {
    if (!ready) return
    mapRef.current?.getSource<maplibregl.GeoJSONSource>('amenities')?.setData({
      type: 'FeatureCollection',
      features: amenities.map((a) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: a.coords },
        properties: {
          icon: AMENITY_ICON[a.kind],
          label: t.amenities[a.kind],
          detail: `OpenStreetMap${a.date ? ` · ${formatDate(a.date)}` : ''}`,
        },
      })),
    })
  }, [ready, amenities, t, formatDate])

  useEffect(() => {
    if (!ready) return
    mapRef.current?.getSource<maplibregl.GeoJSONSource>('reports')?.setData({
      type: 'FeatureCollection',
      features: alerts.map((a) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: a.coords },
        properties: { label: `${t.alertTypes[a.alertType]} (${t.reliabilityShort.report})`, detail: a.comment },
      })),
    })
  }, [ready, alerts, t])

  useEffect(() => {
    if (!ready) return
    const map = mapRef.current
    map?.getSource<maplibregl.GeoJSONSource>('route')?.setData(route?.segments ?? EMPTY)
    map?.getSource<maplibregl.GeoJSONSource>('route-events')?.setData(route?.events ?? EMPTY)
    map?.getSource<maplibregl.GeoJSONSource>('route-shortest')?.setData(route?.shortest ?? EMPTY)
    // Buildings turn see-through while a route is shown, so no part of it hides behind them in 3D
    if (map?.getLayer('building-3d')) map.setPaintProperty('building-3d', 'fill-extrusion-opacity', route ? 0.4 : 0.9)
    // Other places step back too, so the line and what is on it can be read (on a phone they covered it)
    if (map?.getLayer('places-icon')) map.setPaintProperty('places-icon', 'icon-opacity', route ? 0.3 : 1)
    if (map?.getLayer('places-label')) map.setLayoutProperty('places-label', 'visibility', route ? 'none' : 'visible')
  }, [ready, route])

  // Aerial photo or drawn map. Our layers (pins, route, steps) and the labels stay in both.
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map?.getLayer('ortho')) return
    const show = (id: string, visible: boolean) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
    }
    show('ortho', photo)
    for (const id of baseLayers.current) show(id, !photo)
    // Relief shading is under the photo, so it would only cost downloads
    show('relief', !photo && !terrainFailed.current)
    if (map.getLayer('building-3d')) map.setPaintProperty('building-3d', 'fill-extrusion-color', BUILDING_COLOR[photo ? 'photo' : 'map'])
    // Seen from straight above, the photo's own roofs are the real thing
    show('building-3d', !(photo && !is3d))
  }, [ready, photo, is3d])

  // Move the camera only when the selection or the route really changes, not when data is recomputed.
  // Padding follows the panels; a pending flight takes the new padding with it.
  const flownTo = useRef<string | null>(null)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const p = toPadding(padding)
    if (!selectedId) flownTo.current = null
    const place = selectedId && selectedId !== flownTo.current ? places.find((x) => x.id === selectedId) : undefined
    if (place) {
      flownTo.current = selectedId
      const options = { center: place.coords, zoom: 17.5, pitch: latest.current.is3d ? 55 : 0, padding: p }
      if (prefersReducedMotion()) map.jumpTo(options)
      else map.flyTo({ ...options, duration: 1200 })
      return
    }
    const current = map.getPadding()
    if (current.top === p.top && current.bottom === p.bottom && current.left === p.left) return
    if (map.isMoving() || prefersReducedMotion()) map.setPadding(p)
    else map.easeTo({ padding: p, duration: 250 })
  }, [places, selectedId, padding])

  // The route is fitted into the part of the map the panels leave visible: when it changes, and again
  // when the phone panel is moved, until the user moves the map themselves
  const fitted = useRef({ route: '', view: '', userMoved: false })
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const onMove = (e: { originalEvent?: unknown }) => {
      if (e.originalEvent) fitted.current.userMoved = true
    }
    map.on('movestart', onMove)
    return () => {
      map.off('movestart', onMove)
    }
  }, [map])
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus || focus.length === 0) return
    const route = `${focus[0]}|${focus[focus.length - 1]}|${focus.length}`
    const view = `${padding.top}|${padding.bottom}|${padding.left}`
    const last = fitted.current
    if (route === last.route && (view === last.view || last.userMoved)) return
    fitted.current = { route, view, userMoved: route === last.route && last.userMoved }
    const bounds = new maplibregl.LngLatBounds(focus[0], focus[0])
    for (const p of focus) bounds.extend(p)
    // The padding effect above may still be easing towards the new panel size; the fit needs it now
    map.setPadding(toPadding(padding))
    map.fitBounds(bounds, { padding: 48, maxZoom: 17.5, pitch: latest.current.is3d ? 40 : 0, animate: !prefersReducedMotion() })
  }, [focus, padding])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getCanvas().style.cursor = picking ? 'crosshair' : ''
    if (!picking) return
    // Keyboard alternative to clicking: arrows pan the map, Enter picks the point under the crosshair
    const canvas = map.getCanvas()
    canvas.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return
      e.preventDefault()
      const c = map.getCenter()
      latest.current.onPick([c.lng, c.lat])
    }
    canvas.addEventListener('keydown', onKey)
    return () => canvas.removeEventListener('keydown', onKey)
  }, [picking])

  const toggle3d = () => {
    const next = !is3d
    setIs3d(next)
    const m = mapRef.current
    if (!m) return
    const duration = prefersReducedMotion() ? 0 : 600
    if (next) {
      m.setMaxPitch(85)
      if (m.getSource('terrain-dem') && !terrainFailed.current) m.setTerrain(TERRAIN)
      m.easeTo({ ...VIEW_3D, duration })
    } else {
      if (m.getTerrain()) m.setTerrain(null)
      m.easeTo({ pitch: 0, bearing: 0, duration })
      // Keeps the map flat: tilting gestures do nothing in 2D
      m.once('moveend', () => {
        if (!latest.current.is3d) m.setMaxPitch(0)
      })
    }
  }

  // The keyboard crosshair marks the point that Enter picks: the centre of the visible part of the map
  const crosshair = {
    left: `calc(${padding.left}px + (100% - ${padding.left}px) / 2)`,
    top: `calc(${padding.top}px + (100% - ${padding.top + padding.bottom}px) / 2)`,
  }

  return (
    <>
      <div ref={containerRef} className="map" />
      {picking && <div className="map-crosshair" style={crosshair} aria-hidden="true" />}
      <MapControls
        map={map}
        is3d={is3d}
        onToggle3d={toggle3d}
        photo={photo}
        photoAvailable={!orthoFailed}
        onTogglePhoto={() => setBasemap(photo ? 'map' : 'photo')}
      />
    </>
  )
}
