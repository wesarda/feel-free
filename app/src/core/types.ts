export type LngLat = [number, number]

export type Lang = 'pl' | 'en'
export type Localized = { pl: string; en: string }

/**
 * How far a piece of information can be trusted, from most to least.
 * - verified: confirmed on site by an auditor or trusted partner
 * - official: published by the venue owner or a public body
 * - community: crowd-mapped (OpenStreetMap), usually right but not formally checked
 * - report: a single user's report, unverified
 */
export type Reliability = 'verified' | 'official' | 'community' | 'report'

export type SourceKind = 'osm' | 'open-data' | 'owner' | 'audit' | 'user'

export type Source = {
  id: string
  kind: SourceKind
  reliability: Reliability
  name: Localized
  license: string
  url?: string
  /** Invented data that only demonstrates how the prototype works. Always labelled in the UI. */
  sample?: boolean
}

export type SurfaceKind = 'smooth' | 'paving' | 'cobblestone' | 'gravel' | 'unpaved'
export type WheelchairTag = 'yes' | 'limited' | 'no'
/** Kerb of a public transport platform: raised for boarding without a step, an ordinary one, or none at all. */
export type BoardingKerb = 'raised' | 'standard' | 'none'

/** Every accessibility attribute the app knows about, with its value type. */
export type FactValues = {
  /** OpenStreetMap summary tag; only used when detailed facts are missing. */
  wheelchair: WheelchairTag
  entranceSteps: number
  stepHeightCm: number
  handrail: boolean
  ramp: boolean
  rampSlopePct: number
  platformLift: boolean
  thresholdCm: number
  doorWidthCm: number
  automaticDoor: boolean
  surface: SurfaceKind
  floors: number
  elevator: boolean
  accessibleToilet: boolean
  babyChanging: boolean
  seating: boolean
  disabledParking: boolean
  tactilePaving: boolean
  /** Public transport stops only. */
  boardingKerb: BoardingKerb
  shelter: boolean
}
export type FactKey = keyof FactValues

/** One piece of accessibility information together with where it comes from. */
export type Fact<K extends FactKey = FactKey> = {
  value: FactValues[K]
  /** Id of a {@link Source}. */
  source: string
  /** ISO date when the information was last edited or confirmed at the source. */
  date?: string
  /** True when `date` is an explicit confirmation (survey, check_date), not just the last edit. */
  confirmed?: boolean
  /** Link to the original record, e.g. the OSM node. */
  url?: string
  /** Free-text note from the source, e.g. OSM wheelchair:description. */
  note?: string
  /** Set when the value is inferred rather than stated, e.g. "wheelchair=yes". */
  derivedFrom?: string
}

/** Facts per attribute. Several sources can describe the same attribute, possibly disagreeing. */
export type FactMap = { [K in FactKey]?: Fact<K>[] }

export type CategoryKey =
  | 'museum'
  | 'church'
  | 'theatre'
  | 'cinema'
  | 'monument'
  | 'attraction'
  | 'restaurant'
  | 'cafe'
  | 'bar'
  | 'hotel'
  | 'toilets'
  | 'shop'
  | 'mall'
  | 'pharmacy'
  | 'health'
  | 'office'
  | 'library'
  | 'station'
  | 'stop'
  | 'bank'
  | 'education'
  | 'park'
  | 'other'

export type OsmRef = { type: 'node' | 'way' | 'relation'; id: number }

export type Place = {
  id: string
  name: string
  /** Name in other languages, e.g. English for tourists. */
  altNames?: Partial<Record<Lang, string>>
  category: CategoryKey
  address?: string
  coords: LngLat
  facts: FactMap
  /** Source of the place record itself (name, position). */
  origin: string
  osm?: OsmRef
  /** Other ids this place was known by, e.g. a sample record merged into it. */
  aliases?: string[]
  /** Pointers to openly licensed photos (OSM image, wikimedia_commons and wikidata tags). */
  media?: { image?: string; commons?: string; wikidata?: string }
  contact?: { website?: string; phone?: string }
  /** OSM opening_hours, shown as written. */
  openingHours?: string
  /** Optional .glb model of the entrance, e.g. `/models/sukiennice.glb` (files go in `public/models`). */
  model?: string
}

/** Small things on the map that matter on the way: a bench to rest, a disabled parking space, an elevator. */
export type AmenityKind = 'bench' | 'parking' | 'elevator'

export type Amenity = {
  id: string
  kind: AmenityKind
  coords: LngLat
  /** Last edit of the OSM element. */
  date?: string
  url: string
}

/** A temporary problem reported by a user, e.g. a broken elevator. Expires unless confirmed again. */
export type AlertType =
  | 'elevatorOutOfOrder'
  | 'rampBlocked'
  | 'construction'
  | 'blockedSidewalk'
  | 'steps'
  | 'badSurface'
  | 'narrowPassage'
  | 'other'

export type Report =
  | {
      id: string
      kind: 'alert'
      alertType: AlertType
      coords: LngLat
      placeId?: string
      comment: string
      createdAt: string
      expiresAt: string
      confirmations: string[]
      source: string
    }
  | {
      id: string
      kind: 'correction'
      placeId: string
      coords: LngLat
      factKey: FactKey
      value: FactValues[FactKey]
      comment: string
      createdAt: string
      source: string
    }
  | {
      id: string
      kind: 'confirmation'
      placeId: string
      coords: LngLat
      comment: string
      createdAt: string
      source: string
    }
  | {
      id: string
      /** Structured declaration by someone who says they own or manage the place. */
      kind: 'declaration'
      placeId: string
      coords: LngLat
      values: Partial<FactValues>
      comment: string
      createdAt: string
      source: string
    }

export type AlertReport = Extract<Report, { kind: 'alert' }>

/** What the user needs. Deliberately about barriers and amenities, never about health or disability. */
export type Needs = {
  /** Steps the user can manage at an entrance or on a route; 0 = none. */
  maxSteps: number
  /** Highest kerb the user can manage, in cm. */
  maxKerbCm: number
  /** Narrowest door or passage the user fits through, in cm; 0 = no requirement. */
  minWidthCm: number
  /** Steepest ramp or slope the user can manage, in percent. */
  maxSlopePct: number
  avoidCobblestones: boolean
  needElevator: boolean
  needAccessibleToilet: boolean
  needBabyChanging: boolean
  needRestPlaces: boolean
  walkingSpeedKmh: number
}

export type PresetId = 'wheelchair' | 'stroller' | 'walking'
