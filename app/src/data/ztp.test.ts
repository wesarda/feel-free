import { describe, expect, it } from 'vitest'
import { evaluatePlace } from '../core/evaluate.ts'
import { PRESETS } from '../core/needs.ts'
import { getSource } from '../core/sources.ts'
import { placesFromZtp, stopsUrl, type ZtpStop } from './ztp.ts'

const now = new Date('2026-10-04T08:00:00Z')
const stop = (properties: ZtpStop, coordinates = [19.94, 50.06]) => ({ geometry: { type: 'Point', coordinates }, properties })
const base: ZtpStop = {
  kod_busman: '116-04',
  Nazwa_przystanku_nr: 'Teatr Bagatela 01',
  Typ_przystanku: 'T',
  Grupa: 'KMK',
  Nawierzchnia_peronu: 'kostka',
  Krawężnik_peronowy: 'kassel-kerb',
  Ławki_poza_wiatą: 1,
  Ławki_inne_poza_wiatą: 0,
  Inne_do_siedzenia: 4,
  Wiata_liczba: 1,
  EditDate: Date.parse('2026-07-27T10:00:00Z'),
}
const one = (properties: ZtpStop) => placesFromZtp({ features: [stop(properties)] }, now)[0]
const findings = (properties: ZtpStop, preset: keyof typeof PRESETS = 'wheelchair') =>
  evaluatePlace(one(properties), PRESETS[preset], { now }).findings.map((f) => `${f.severity}:${f.msg.key}`)

describe('ZTP stops adapter', () => {
  it('turns a stop into a place with official, dated facts', () => {
    const place = one(base)
    expect(place).toMatchObject({ id: 'ztp-116-04', name: 'Przystanek Teatr Bagatela 01', category: 'stop', origin: 'ztp', address: 'tramwaj' })
    expect(place.facts.boardingKerb?.[0]).toMatchObject({ value: 'raised', source: 'ztp', date: '2026-07-27' })
    expect(place.facts.surface?.[0].value).toBe('paving')
    expect(place.facts.shelter?.[0].value).toBe(true)
    expect(place.facts.seating?.[0]).toMatchObject({ value: true, note: 'ławki: 1, barierosiedziska: 4' })
    expect(getSource(place.facts.boardingKerb![0].source).reliability).toBe('official')
  })

  it('keeps only stops in use: no planned, temporary, suspended or expired ones', () => {
    const features = [
      stop(base),
      stop({ ...base, kod_busman: 'p-1', Typ_przystanku: 'pA' }),
      stop({ ...base, kod_busman: 't-1', Typ_przystanku: 'tymA' }),
      stop({ ...base, kod_busman: 'z-1', Grupa: 'KMK_zawieszony' }),
      stop({ ...base, kod_busman: 'e-1', validUntil: Date.parse('2026-09-01T00:00:00Z') }),
      stop(base),
      { geometry: null, properties: base },
    ]
    expect(placesFromZtp({ features }, now).map((p) => p.id)).toEqual(['ztp-116-04'])
  })

  it('does not guess: an empty or unknown field gives no fact', () => {
    const place = one({ ...base, Krawężnik_peronowy: null, Nawierzchnia_peronu: 'utwardzone_inne', Wiata_liczba: null, Inne_do_siedzenia: null })
    expect(place.facts).toEqual({})
  })

  it('says nothing about seating when the only place to sit could be inside the shelter', () => {
    const noBench = { ...base, Ławki_poza_wiatą: 0, Inne_do_siedzenia: 0 }
    expect(one({ ...noBench, Wiata_liczba: 1 }).facts.seating).toBeUndefined()
    expect(one({ ...noBench, Wiata_liczba: 0 }).facts.seating?.[0].value).toBe(false)
  })

  it('asks the layer only for the area of the app', () => {
    const url = new URL(stopsUrl('https://example.org/FeatureServer/0', [50.04, 19.915, 50.0705, 19.965]))
    expect(url.pathname).toBe('/FeatureServer/0/query')
    expect(url.searchParams.get('geometry')).toBe('19.915,50.04,19.965,50.0705')
    expect(url.searchParams.get('f')).toBe('geojson')
  })
})

describe('a stop is judged by its platform', () => {
  it('accepts a raised kerb and never asks about doors or toilets', () => {
    const result = evaluatePlace(one(base), PRESETS.wheelchair, { now })
    expect(result.verdict).toBe('match')
    expect(result.weakest).toBe('official')
    expect(findings(base)).toEqual(['ok:boardingKerb', 'ok:seating', 'ok:shelter', 'ok:platformSurface'])
  })

  it('marks a stop without a platform kerb as a difficulty for a wheelchair user', () => {
    expect(findings({ ...base, Krawężnik_peronowy: 'nie' })).toContain('difficulty:boardingKerb')
    expect(evaluatePlace(one({ ...base, Krawężnik_peronowy: 'nie' }), PRESETS.wheelchair, { now }).verdict).toBe('partial')
  })

  it('does not promise step-free boarding at an ordinary kerb of unknown height', () => {
    const ordinary = one({ ...base, Krawężnik_peronowy: 'tak' })
    expect(evaluatePlace(ordinary, PRESETS.wheelchair, { now }).verdict).toBe('unknown')
    expect(findings({ ...base, Krawężnik_peronowy: 'tak' }, 'stroller')).toContain('ok:boardingKerb')
  })

  it('never turns a missing kerb record into "meets your needs"', () => {
    const result = evaluatePlace(one({ ...base, Krawężnik_peronowy: null }), PRESETS.wheelchair, { now })
    expect(result.verdict).toBe('unknown')
    expect(result.findings[0]).toMatchObject({ severity: 'unknown', msg: { key: 'boardingKerbUnknown' } })
  })
})
