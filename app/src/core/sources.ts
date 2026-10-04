import type { Reliability, Source } from './types.ts'

/** Higher is more trustworthy. Used to pick the best fact when sources disagree. */
export const RELIABILITY_RANK: Record<Reliability, number> = {
  verified: 4,
  official: 3,
  community: 2,
  report: 1,
}

/**
 * Every source the app can show. Adding a source = adding an entry here and an adapter in `src/data`.
 * Sample sources simulate data we do not have yet (owner declarations, audits) and are always labelled.
 */
export const SOURCES: Record<string, Source> = {
  osm: {
    id: 'osm',
    kind: 'osm',
    reliability: 'community',
    name: { pl: 'OpenStreetMap', en: 'OpenStreetMap' },
    license: 'ODbL 1.0 · © OpenStreetMap contributors',
    url: 'https://www.openstreetmap.org/copyright',
  },
  // City data: the register of public transport stops kept by the transport authority
  ztp: {
    id: 'ztp',
    kind: 'open-data',
    reliability: 'official',
    name: { pl: 'ZTP Kraków – Otwarte Dane Miasta Krakowa', en: 'ZTP Kraków – Kraków Open Data' },
    license: 'Gmina Miejska Kraków, otwartedane.um.krakow.pl',
    url: 'https://otwartedane.um.krakow.pl/zbiory-danych/komunikacja-miejska-w-krakowie-kmk',
  },
  reports: {
    id: 'reports',
    kind: 'user',
    reliability: 'report',
    name: { pl: 'Zgłoszenie użytkownika', en: 'User report' },
    license: 'CC0',
  },
  // Until the ownership is verified, a declaration is only as reliable as any other user report
  'owner-pending': {
    id: 'owner-pending',
    kind: 'owner',
    reliability: 'report',
    name: { pl: 'Deklaracja właściciela (uprawnienia niezweryfikowane)', en: 'Owner declaration (ownership not verified)' },
    license: 'CC BY 4.0',
  },
  'sample-owner': {
    id: 'sample-owner',
    kind: 'owner',
    reliability: 'official',
    name: { pl: 'Deklaracja właściciela', en: 'Owner declaration' },
    license: '—',
    sample: true,
  },
  'sample-audit': {
    id: 'sample-audit',
    kind: 'audit',
    reliability: 'verified',
    name: { pl: 'Audyt dostępności na miejscu', en: 'On-site accessibility audit' },
    license: '—',
    sample: true,
  },
  'sample-community': {
    id: 'sample-community',
    kind: 'osm',
    reliability: 'community',
    name: { pl: 'Dane społeczności', en: 'Community data' },
    license: '—',
    sample: true,
  },
  'sample-reports': {
    id: 'sample-reports',
    kind: 'user',
    reliability: 'report',
    name: { pl: 'Zgłoszenie użytkownika', en: 'User report' },
    license: '—',
    sample: true,
  },
}

const UNKNOWN_SOURCE: Source = {
  id: 'unknown',
  kind: 'user',
  reliability: 'report',
  name: { pl: 'Nieznane źródło', en: 'Unknown source' },
  license: '—',
}

export function getSource(id: string): Source {
  return SOURCES[id] ?? UNKNOWN_SOURCE
}
