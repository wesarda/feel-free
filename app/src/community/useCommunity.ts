import { useEffect, useState } from 'react'
import type { Place } from '../core/types'
import { addComment, addPhoto, getBackend, listComments, listPhotos, type Backend } from './client'
import { externalPhotos } from './externalPhotos'
import { prepareImage } from './image'
import type { Comment, Experience, ExternalPhoto, Photo } from './types'

type Data = { id: string; comments: Comment[]; photos: Photo[]; external: ExternalPhoto[] }

/** Comments and photos of one place, with functions to add new ones. */
export function useCommunity(place: Place | null, lang: string) {
  const [backend, setBackend] = useState<Backend | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const id = place?.id ?? ''
  const image = place?.media?.image
  const commons = place?.media?.commons
  const wikidata = place?.media?.wikidata

  useEffect(() => {
    getBackend().then(setBackend)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false
    const media = { image, commons, wikidata }
    Promise.all([listComments(id), listPhotos(id), externalPhotos(id, media)]).then(([comments, photos, external]) => {
      if (!cancelled) setData({ id, comments, photos, external })
    })
    return () => {
      cancelled = true
    }
  }, [id, image, commons, wikidata])

  const current = data?.id === id ? data : null

  return {
    backend,
    loading: Boolean(id) && !current,
    comments: current?.comments ?? [],
    photos: current?.photos ?? [],
    external: current?.external ?? [],
    async comment(text: string, nick: string, experience?: Experience): Promise<Comment> {
      const created = await addComment({ placeId: id, text, nick: nick || undefined, experience, lang })
      if (created.moderation.status !== 'rejected') {
        setData((d) => (d && d.id === id ? { ...d, comments: [created, ...d.comments] } : d))
      }
      return created
    },
    async photo(file: File, caption: string): Promise<Photo> {
      if (!place) throw new Error('no-place')
      const prepared = await prepareImage(file)
      const created = await addPhoto({
        placeId: id,
        placeName: place.name,
        category: place.category,
        image: prepared.dataUrl,
        width: prepared.width,
        height: prepared.height,
        caption: caption || undefined,
        lang,
      })
      if (created.moderation.status !== 'rejected') {
        setData((d) => (d && d.id === id ? { ...d, photos: [created, ...d.photos] } : d))
      }
      return created
    },
  }
}
