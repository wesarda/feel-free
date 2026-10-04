import type { Place } from '../core/types'
import type { ExternalPhoto } from './types'

/*
 * Openly licensed photos linked from OpenStreetMap: the image, wikimedia_commons and wikidata tags.
 * Wikimedia Commons gives a thumbnail, the author and the licence, which we always show.
 */

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
const cache = new Map<string, Promise<ExternalPhoto[]>>()

const stripHtml = (html?: string) =>
  html
    ? new DOMParser().parseFromString(html, 'text/html').body.textContent?.replace(/\s+/g, ' ').trim() || undefined
    : undefined

/** "File:Name.jpg" from the forms used in OSM tags. */
export function commonsTitle(value: string): string | null {
  const v = value.trim()
  if (/^File:/i.test(v)) return `File:${v.slice(5)}`
  const page = v.match(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/i)
  if (page) return decodeURIComponent(page[1]).replace(/_/g, ' ')
  const upload = v.match(/upload\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/i)
  if (upload) return `File:${decodeURIComponent(upload[1]).replace(/_/g, ' ')}`
  return null
}

async function json<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return (await response.json()) as T
}

async function wikidataImage(id: string, signal?: AbortSignal): Promise<string | null> {
  type Claims = { claims?: { P18?: { mainsnak?: { datavalue?: { value?: string } } }[] } }
  const data = await json<Claims>(
    `${WIKIDATA_API}?action=wbgetclaims&entity=${encodeURIComponent(id)}&property=P18&format=json&origin=*`,
    signal,
  )
  const file = data.claims?.P18?.[0]?.mainsnak?.datavalue?.value
  return file ? `File:${file}` : null
}

async function categoryFiles(category: string, signal?: AbortSignal): Promise<string[]> {
  type Members = { query?: { categorymembers?: { title: string }[] } }
  const data = await json<Members>(
    `${COMMONS_API}?action=query&list=categorymembers&cmtype=file&cmlimit=4&cmtitle=${encodeURIComponent(category)}&format=json&origin=*`,
    signal,
  )
  return (data.query?.categorymembers ?? []).map((m) => m.title)
}

async function imageInfo(titles: string[], signal?: AbortSignal): Promise<ExternalPhoto[]> {
  if (titles.length === 0) return []
  type Info = {
    query?: {
      pages?: Record<
        string,
        {
          title: string
          imageinfo?: {
            url: string
            thumburl?: string
            descriptionurl: string
            extmetadata?: Record<string, { value?: string }>
          }[]
        }
      >
    }
  }
  const data = await json<Info>(
    `${COMMONS_API}?action=query&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=960&format=json&origin=*&titles=${encodeURIComponent(titles.join('|'))}`,
    signal,
  )
  return Object.values(data.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0]
    if (!info) return []
    const meta = info.extmetadata ?? {}
    return [
      {
        id: `commons:${page.title}`,
        url: info.url,
        thumb: info.thumburl ?? info.url,
        author: stripHtml(meta.Artist?.value),
        license: stripHtml(meta.LicenseShortName?.value),
        sourceName: 'Wikimedia Commons',
        sourceUrl: info.descriptionurl,
      },
    ]
  })
}

async function resolve(media: NonNullable<Place['media']>, signal?: AbortSignal): Promise<ExternalPhoto[]> {
  const titles = new Set<string>()
  const direct: ExternalPhoto[] = []

  if (media.commons) {
    if (/^Category:/i.test(media.commons)) for (const t of await categoryFiles(media.commons, signal)) titles.add(t)
    else {
      const t = commonsTitle(media.commons)
      if (t) titles.add(t)
    }
  }
  if (media.image) {
    const t = commonsTitle(media.image)
    if (t) titles.add(t)
    else if (/^https:\/\/\S+\.(jpe?g|png|webp)(\?.*)?$/i.test(media.image)) {
      const host = new URL(media.image).hostname
      direct.push({ id: `link:${media.image}`, url: media.image, thumb: media.image, sourceName: host, sourceUrl: media.image })
    }
  }
  if (media.wikidata && titles.size === 0) {
    const t = await wikidataImage(media.wikidata, signal)
    if (t) titles.add(t)
  }
  return [...(await imageInfo([...titles].slice(0, 6), signal)), ...direct]
}

/** Photos for a place, fetched once per session. Failures just mean no photos. */
export function externalPhotos(placeId: string, media: Place['media']): Promise<ExternalPhoto[]> {
  if (!media || !(media.image || media.commons || media.wikidata)) return Promise.resolve([])
  let pending = cache.get(placeId)
  if (!pending) {
    pending = resolve(media).catch(() => [])
    cache.set(placeId, pending)
  }
  return pending
}
