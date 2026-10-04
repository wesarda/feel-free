import { useState } from 'react'
import type { ExternalPhoto, Photo } from '../community/types'

/** One photo as shown in the strip, the grid and the viewer, whatever its source. */
export type GalleryItem = {
  key: string
  src: string
  thumb: string
  alt: string
  credit?: string
  creditUrl?: string
  /** Community photo waiting for moderation, visible only to its author. */
  pending?: boolean
  description?: string
}

/** Community photos first (newest on top), then open photos from Wikimedia Commons. */
export function galleryItems(external: ExternalPhoto[], photos: Photo[], placeName: string, t: {
  by: (author: string) => string
  aiSaw: string
}): GalleryItem[] {
  const own: GalleryItem[] = photos
    .filter((p) => p.url && p.moderation.status !== 'rejected')
    .map((p) => ({
      key: p.id,
      src: p.url,
      thumb: p.url,
      alt: p.caption || p.description || placeName,
      pending: p.moderation.status === 'pending',
      description: [p.caption, p.description && `${t.aiSaw}: ${p.description}`].filter(Boolean).join(' · ') || undefined,
    }))
  const open: GalleryItem[] = external.map((p) => ({
    key: p.id,
    src: p.url,
    thumb: p.thumb,
    alt: placeName,
    credit: [p.author && t.by(p.author), p.license, p.sourceName].filter(Boolean).join(' · '),
    creditUrl: p.sourceUrl,
  }))
  return [...own, ...open]
}

/** Index of the open photo, cleared when the list changes under it. */
export function useLightbox(count: number) {
  const [open, setOpen] = useState<number | null>(null)
  return { open: open !== null && open < count ? open : null, setOpen }
}
