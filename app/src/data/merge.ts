import { distanceM } from '../core/geo.ts'
import type { FactKey, FactMap, Place } from '../core/types.ts'

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .filter((w) => w.length >= 4)
    .map((w) => w.slice(0, 5))
}

export function similarNames(a: string, b: string): boolean {
  const ta = new Set(tokens(a))
  return tokens(b).some((t) => ta.has(t))
}

/**
 * Attaches sample facts (simulated owner declarations, audits, reports) to the matching real place,
 * so the demo shows how several sources look side by side. Unmatched sample places stay on their own.
 */
export function mergeSample(real: Place[], sample: Place[]): Place[] {
  if (sample.length === 0) return real
  const merged = real.map((p) => ({ ...p, facts: { ...p.facts } as FactMap }))
  const result: Place[] = merged
  for (const s of sample) {
    const match = merged
      .filter((p) => distanceM(p.coords, s.coords) < 150 && (similarNames(p.name, s.name) || similarNames(p.altNames?.en ?? '', s.altNames?.en ?? '-')))
      .sort((a, b) => distanceM(a.coords, s.coords) - distanceM(b.coords, s.coords))[0]
    if (!match) {
      result.push(s)
      continue
    }
    for (const [key, facts] of Object.entries(s.facts) as [FactKey, NonNullable<FactMap[FactKey]>][]) {
      ;(match.facts as Record<string, unknown[]>)[key] = [...((match.facts[key] as unknown[]) ?? []), ...facts]
    }
    match.altNames = { ...s.altNames, ...match.altNames }
    match.aliases = [...(match.aliases ?? []), s.id]
    if (!match.address && s.address) match.address = s.address
  }
  return result
}
