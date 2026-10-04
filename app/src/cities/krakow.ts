import type { CityConfig } from './types.ts'

export const krakow: CityConfig = {
  id: 'krakow',
  name: { pl: 'Kraków', en: 'Kraków' },
  center: [19.9373, 50.0617],
  // Old Town, Kazimierz, Podgórze and the main station
  bbox: [50.04, 19.915, 50.0705, 19.965],
  snapshotUrl: 'data/krakow/places.json',
  networkSnapshotUrl: 'data/krakow/network.json',
  // Old Town, Wawel, Kazimierz and the main station
  networkBbox: [50.0455, 19.925, 50.0735, 19.956],
  stops: {
    serviceUrl:
      'https://services-eu1.arcgis.com/svTzSt3AvH7sK6q9/arcgis/rest/services/Przystanki_Komunikacji_Miejskiej_w_Krakowie/FeatureServer/0',
    snapshotUrl: 'data/krakow/stops.json',
  },
  // Ids of sample places; they keep working when the sample record is merged into an OSM place
  exampleRoutes: [
    { from: 'sample-dworzec-glowny', to: 'sample-sukiennice' },
    { from: 'sample-sukiennice', to: 'sample-wawel' },
    { from: 'sample-teatr-slowackiego', to: 'sample-collegium-maius' },
  ],
  datasets: [
    {
      name: { pl: 'OpenStreetMap: miejsca, wejścia, toalety, ławki', en: 'OpenStreetMap: places, entrances, toilets, benches' },
      publisher: 'OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org',
      format: 'Overpass API (JSON)',
      license: 'ODbL 1.0',
      refresh: 'na żywo przy starcie aplikacji + kopia zapasowa co noc / live on start + nightly backup copy',
      status: 'used',
    },
    {
      name: { pl: 'OpenStreetMap: sieć chodników i przejść (trasy)', en: 'OpenStreetMap: footway network (routes)' },
      publisher: 'OpenStreetMap contributors',
      url: 'https://www.openstreetmap.org',
      format: 'Overpass API (JSON)',
      license: 'ODbL 1.0',
      refresh: 'na żądanie dla obszaru trasy / on demand for the route area',
      status: 'used',
    },
    {
      name: {
        pl: 'Przystanki Komunikacji Miejskiej w Krakowie: krawężnik i nawierzchnia peronu, wiaty, ławki',
        en: 'Kraków public transport stops: platform kerb and surface, shelters, benches',
      },
      publisher: 'Zarząd Transportu Publicznego w Krakowie (Otwarte Dane Miasta Krakowa)',
      url: 'https://otwartedane.um.krakow.pl/zbiory-danych/komunikacja-miejska-w-krakowie-kmk',
      format: 'ArcGIS FeatureServer (GeoJSON)',
      license: 'warunki portalu: bezpłatnie, z podaniem źródła i daty / portal terms: free, with source and date',
      refresh: 'wydawca: codziennie; na żywo przy starcie aplikacji + kopia zapasowa co noc / publisher: daily; live on start + nightly backup copy',
      status: 'used',
    },
    {
      name: { pl: 'Otwarte Dane Miasta Krakowa: listy obiektów miejskich (muzea, teatry, biblioteki, parki)', en: 'Kraków Open Data: lists of municipal venues' },
      publisher: 'Urząd Miasta Krakowa',
      url: 'https://otwartedane.um.krakow.pl/',
      format: 'JSON / CSV / XLSX / API',
      license: 'warunki portalu / portal terms',
      refresh: 'zgodnie z harmonogramem wydawcy / per publisher schedule',
      status: 'planned',
    },
    {
      name: { pl: 'MSIP – Miejski System Informacji Przestrzennej', en: 'MSIP – municipal spatial data (WMS/WFS)' },
      publisher: 'Urząd Miasta Krakowa',
      url: 'https://msip.krakow.pl/',
      format: 'WMS / WFS',
      license: 'zależnie od zasobu / per resource',
      refresh: 'zgodnie z harmonogramem wydawcy / per publisher schedule',
      status: 'planned',
    },
    {
      name: { pl: 'dane.gov.pl – dane uzupełniające i dla kolejnych miast', en: 'dane.gov.pl – national open data' },
      publisher: 'Ministerstwo Cyfryzacji',
      url: 'https://dane.gov.pl/',
      format: 'API (JSON:API)',
      license: 'zależnie od zbioru / per dataset',
      refresh: 'zgodnie z harmonogramem wydawcy / per publisher schedule',
      status: 'planned',
    },
  ],
}

export const CITIES: Record<string, CityConfig> = { krakow }
