import type { Comment, Photo, PhotoFacts } from './types'

/** Answers to "Was it accessible for you?" among published comments (not the ones waiting for moderation). */
export function experienceCounts(comments: Comment[]) {
  const counts = { ok: 0, partial: 0, barrier: 0 }
  for (const c of comments) if (c.experience && c.moderation.status === 'approved') counts[c.experience]++
  return counts
}

/**
 * What the AI noticed on approved photos: for each item the newest photo that shows it.
 * Shown apart from the place data and marked as unverified – it never changes the rating.
 */
export function photoFacts(photos: Photo[]): { facts: PhotoFacts; date: string; photos: number } | null {
  const facts: PhotoFacts = { entranceSteps: null, ramp: null, handrail: null, automaticDoor: null, levelEntrance: null }
  let date = ''
  let used = 0
  const approved = photos
    .filter((p) => p.moderation.status === 'approved' && p.facts)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  for (const photo of approved) {
    let contributed = false
    for (const key of Object.keys(facts) as (keyof PhotoFacts)[]) {
      const value = photo.facts![key]
      if (facts[key] === null && value !== null && value !== undefined) {
        ;(facts as Record<string, unknown>)[key] = value
        contributed = true
      }
    }
    if (contributed) {
      used++
      if (!date) date = photo.createdAt
    }
  }
  return used ? { facts, date, photos: used } : null
}
