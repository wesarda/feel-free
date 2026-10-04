import type { Fact, FactKey, FactMap, FactValues, Place, Report } from '../core/types.ts'

/*
 * SAMPLE DATA. Invented to demonstrate how the prototype presents sources, dates, reliability,
 * conflicts and missing data. Not verified on site; every fact is labelled "sample" in the UI.
 * Real data comes from OpenStreetMap (src/data/osm.ts) and user reports.
 */

type Spec = { [K in FactKey]?: FactValues[K] | [FactValues[K], string, string?] }

/** Builds facts from compact specs: `value` uses the default source/date, `[value, source, date]` overrides. */
function facts(source: string, date: string, spec: Spec, extra: Partial<Record<FactKey, Fact[]>> = {}): FactMap {
  const map: FactMap = {}
  for (const [key, raw] of Object.entries(spec) as [FactKey, Spec[FactKey]][]) {
    const [value, src, d] = Array.isArray(raw) ? raw : [raw, source, date]
    ;(map as Record<string, Fact[]>)[key] = [{ value: value as never, source: src, date: d ?? date }]
  }
  for (const [key, list] of Object.entries(extra) as [FactKey, Fact[]][]) {
    ;(map as Record<string, Fact[]>)[key] = [...((map as Record<string, Fact[]>)[key] ?? []), ...list]
  }
  return map
}

export const samplePlaces: Place[] = [
  {
    id: 'sample-sukiennice',
    name: 'Sukiennice',
    altNames: { en: 'Cloth Hall' },
    category: 'museum',
    address: 'Rynek Główny 1/3',
    coords: [19.9373, 50.0617],
    origin: 'sample-owner',
    // Owner declaration and a user report disagree about the door width
    facts: facts(
      'sample-owner',
      '2026-03-12',
      {
        entranceSteps: 2,
        stepHeightCm: 15,
        handrail: false,
        ramp: true,
        rampSlopePct: 6,
        platformLift: false,
        doorWidthCm: 120,
        automaticDoor: false,
        thresholdCm: 2,
        surface: ['cobblestone', 'sample-community', '2024-06-02'],
        floors: 2,
        elevator: true,
        accessibleToilet: true,
        seating: true,
        tactilePaving: [false, 'sample-community', '2024-06-02'],
      },
      {
        doorWidthCm: [
          {
            value: 75,
            source: 'sample-reports',
            date: '2026-09-28',
            note: 'Boczne drzwi, gdy główne są zamknięte',
          },
        ],
      },
    ),
  },
  {
    id: 'sample-mariacki',
    name: 'Bazylika Mariacka',
    altNames: { en: "St. Mary's Basilica" },
    category: 'church',
    address: 'plac Mariacki 5',
    coords: [19.9394, 50.0616],
    origin: 'sample-community',
    facts: facts('sample-community', '2023-08-19', {
      entranceSteps: 3,
      stepHeightCm: 16,
      handrail: true,
      ramp: false,
      platformLift: false,
      doorWidthCm: 140,
      surface: 'cobblestone',
      floors: 1,
      accessibleToilet: false,
      babyChanging: false,
    }),
  },
  {
    id: 'sample-collegium-maius',
    name: 'Collegium Maius',
    category: 'museum',
    address: 'Jagiellońska 15',
    coords: [19.9334, 50.0614],
    origin: 'sample-community',
    // Old and incomplete: shows "possibly outdated" and "no data"
    facts: facts('sample-community', '2019-05-04', {
      entranceSteps: 1,
      stepHeightCm: 12,
      handrail: false,
      ramp: false,
      platformLift: false,
      doorWidthCm: 85,
      surface: 'cobblestone',
      floors: 2,
      elevator: false,
    }),
  },
  {
    id: 'sample-barbakan',
    name: 'Barbakan',
    altNames: { en: 'Barbican' },
    category: 'monument',
    address: 'ul. Basztowa',
    coords: [19.9417, 50.0655],
    origin: 'sample-community',
    facts: facts('sample-community', '2024-04-21', {
      entranceSteps: 6,
      stepHeightCm: 18,
      handrail: true,
      ramp: false,
      platformLift: false,
      doorWidthCm: 100,
      surface: 'cobblestone',
      floors: 2,
      elevator: false,
      accessibleToilet: false,
      babyChanging: false,
    }),
  },
  {
    id: 'sample-teatr-slowackiego',
    name: 'Teatr im. Juliusza Słowackiego',
    altNames: { en: 'Słowacki Theatre' },
    category: 'theatre',
    address: 'plac Świętego Ducha 1',
    coords: [19.9435, 50.0642],
    origin: 'sample-owner',
    facts: facts('sample-owner', '2025-11-03', {
      entranceSteps: 5,
      stepHeightCm: 16,
      handrail: true,
      ramp: false,
      platformLift: true,
      doorWidthCm: 95,
      automaticDoor: false,
      surface: 'smooth',
      floors: 3,
      elevator: true,
      accessibleToilet: true,
      babyChanging: false,
      seating: true,
    }),
  },
  {
    id: 'sample-dworzec-glowny',
    name: 'Kraków Główny',
    altNames: { en: 'Kraków Main Station' },
    category: 'station',
    address: 'plac Jana Nowaka-Jeziorańskiego',
    coords: [19.9478, 50.0683],
    origin: 'sample-audit',
    // Verified audit, plus an active user report about a broken elevator
    facts: facts('sample-audit', '2026-05-20', {
      entranceSteps: 0,
      doorWidthCm: 180,
      automaticDoor: true,
      thresholdCm: 0,
      surface: 'smooth',
      floors: 2,
      elevator: true,
      accessibleToilet: true,
      babyChanging: true,
      seating: true,
      tactilePaving: true,
      disabledParking: true,
    }),
  },
  {
    id: 'sample-galeria-krakowska',
    name: 'Galeria Krakowska',
    category: 'mall',
    address: 'ul. Pawia 5',
    coords: [19.9455, 50.0667],
    origin: 'sample-owner',
    facts: facts('sample-owner', '2026-01-15', {
      entranceSteps: 0,
      doorWidthCm: 200,
      automaticDoor: true,
      thresholdCm: 0,
      surface: 'smooth',
      floors: 3,
      elevator: true,
      accessibleToilet: true,
      babyChanging: true,
      seating: true,
      disabledParking: true,
    }),
  },
  {
    id: 'sample-wawel',
    name: 'Zamek Królewski na Wawelu',
    altNames: { en: 'Wawel Royal Castle' },
    category: 'museum',
    address: 'Wawel 5',
    coords: [19.9355, 50.0541],
    origin: 'sample-owner',
    facts: facts('sample-owner', '2025-09-30', {
      entranceSteps: 4,
      stepHeightCm: 15,
      handrail: true,
      ramp: true,
      rampSlopePct: 10,
      platformLift: false,
      doorWidthCm: 110,
      automaticDoor: false,
      surface: 'cobblestone',
      floors: 2,
      elevator: true,
      accessibleToilet: true,
      babyChanging: true,
      seating: true,
    }),
  },
  {
    id: 'sample-muzeum-narodowe',
    name: 'Muzeum Narodowe – Gmach Główny',
    altNames: { en: 'National Museum – Main Building' },
    category: 'museum',
    address: 'al. 3 Maja 1',
    coords: [19.9233, 50.0604],
    origin: 'sample-audit',
    facts: facts('sample-audit', '2026-02-10', {
      entranceSteps: 8,
      stepHeightCm: 16,
      handrail: true,
      ramp: true,
      rampSlopePct: 7,
      platformLift: false,
      doorWidthCm: 130,
      automaticDoor: true,
      thresholdCm: 1,
      surface: 'smooth',
      floors: 3,
      elevator: true,
      accessibleToilet: true,
      babyChanging: true,
      seating: true,
      tactilePaving: true,
    }),
  },
  {
    id: 'sample-schindler',
    name: 'Fabryka Emalia Oskara Schindlera',
    altNames: { en: "Oskar Schindler's Enamel Factory" },
    category: 'museum',
    address: 'ul. Lipowa 4',
    coords: [19.9617, 50.0475],
    origin: 'sample-community',
    // Only the summary tag: detailed data is missing
    facts: facts('sample-community', '2025-07-07', {
      wheelchair: 'yes',
      floors: 2,
      elevator: true,
    }),
  },
]

/** Sample user reports so the demo shows unverified, temporary information next to confirmed data. */
export function sampleReports(now: Date): Report[] {
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
  const inDays = (n: number) => new Date(now.getTime() + n * 86400000).toISOString()
  return [
    {
      id: 'sample-report-elevator',
      kind: 'alert',
      alertType: 'elevatorOutOfOrder',
      placeId: 'sample-dworzec-glowny',
      coords: [19.9478, 50.0683],
      comment: 'Winda na peron 3 nie działa',
      createdAt: daysAgo(1),
      expiresAt: inDays(13),
      confirmations: [daysAgo(0)],
      source: 'sample-reports',
    },
    {
      id: 'sample-report-sidewalk',
      kind: 'alert',
      alertType: 'construction',
      coords: [19.9399, 50.0647],
      comment: 'Roboty drogowe, chodnik zwężony',
      createdAt: daysAgo(3),
      expiresAt: inDays(11),
      confirmations: [],
      source: 'sample-reports',
    },
  ]
}
