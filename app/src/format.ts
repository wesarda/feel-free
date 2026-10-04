import type { BoardingKerb, FactKey, FactValues, Lang, Place, SurfaceKind } from './core/types'
import type { Messages } from './i18n/en'

export function formatValue<K extends FactKey>(key: K, value: FactValues[K], t: Messages): string {
  if (typeof value === 'boolean') return value ? t.yes : t.no
  switch (key) {
    case 'wheelchair':
      return t.wheelchairValues[value as string] ?? String(value)
    case 'surface':
      return t.surfaces[value as SurfaceKind]
    case 'boardingKerb':
      return t.kerbValues[value as BoardingKerb]
    case 'stepHeightCm':
    case 'thresholdCm':
    case 'doorWidthCm':
      return `${value} cm`
    case 'rampSlopePct':
      return `${value}%`
    default:
      return String(value)
  }
}

export function placeName(place: Place, lang: Lang): string {
  return lang === 'en' ? (place.altNames?.en ?? place.name) : place.name
}

/** Secondary name: the original Polish one for English speakers, the English one for Polish speakers. */
export function placeSubName(place: Place, lang: Lang): string | null {
  if (lang === 'en') return place.altNames?.en && place.altNames.en !== place.name ? place.name : null
  return place.altNames?.en ?? null
}
