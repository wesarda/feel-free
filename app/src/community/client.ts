import { ruleCheck } from '../../api/_lib/rules'
import { localDb } from './localDb'
import type { ApiHealth, Comment, Moderation, NewComment, NewPhoto, Photo } from './types'

/*
 * Comments and photos: on the server when the site has one (/api, see app/api), otherwise kept
 * in this browser. Content is public only after moderation; until then only its author sees it.
 */

export type Backend = { mode: 'server'; ai: boolean } | { mode: 'local' }

export class CommunityError extends Error {
  readonly code: 'rate' | 'server' | 'image'
  constructor(code: 'rate' | 'server' | 'image') {
    super(code)
    this.code = code
  }
}

let health: Promise<Backend> | null = null

export function getBackend(): Promise<Backend> {
  health ??= fetch('/api/health', { headers: { Accept: 'application/json' } })
    .then(async (response): Promise<Backend> => {
      if (!response.ok || !response.headers.get('content-type')?.includes('json')) return { mode: 'local' }
      const data = (await response.json()) as ApiHealth
      return data.ok && data.store ? { mode: 'server', ai: data.ai } : { mode: 'local' }
    })
    .catch((): Backend => ({ mode: 'local' }))
  return health
}

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
const newest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

/** Public items from the server plus this browser's own ones, without duplicates. */
function merge<T extends { id: string; createdAt: string; mine?: boolean }>(remote: T[], own: T[]): T[] {
  const mine = new Set(own.map((x) => x.id))
  const byId = new Map<string, T>()
  for (const x of remote) byId.set(x.id, mine.has(x.id) ? { ...x, mine: true } : x)
  for (const x of own) if (!byId.has(x.id)) byId.set(x.id, { ...x, mine: true })
  return [...byId.values()].sort(newest)
}

async function getList<T>(path: string, key: 'comments' | 'photos'): Promise<T[]> {
  try {
    const response = await fetch(path)
    if (!response.ok) return []
    const data = (await response.json()) as Record<string, T[]>
    return Array.isArray(data[key]) ? data[key] : []
  } catch {
    return []
  }
}

async function post<T>(path: string, body: unknown, key: 'comment' | 'photo'): Promise<T> {
  let response: Response
  try {
    response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  } catch {
    throw new CommunityError('server')
  }
  if (response.status === 429) throw new CommunityError('rate')
  const data = (await response.json().catch(() => null)) as Record<string, T> | null
  if (!data?.[key]) throw new CommunityError('server')
  return data[key]
}

export async function listComments(placeId: string): Promise<Comment[]> {
  const backend = await getBackend()
  const own = await localDb.comments(placeId)
  const remote = backend.mode === 'server' ? await getList<Comment>(`/api/comments?place=${encodeURIComponent(placeId)}`, 'comments') : []
  return merge(remote, own)
}

export async function addComment(input: NewComment): Promise<Comment> {
  const backend = await getBackend()
  if (backend.mode === 'server') {
    const comment = { ...(await post<Comment>('/api/comments', input, 'comment')), mine: true }
    if (comment.moderation.status !== 'rejected') await localDb.putComment(comment)
    return comment
  }
  const rule = ruleCheck(`${input.text} ${input.nick ?? ''}`)
  const moderation: Moderation = rule ? { status: 'rejected', by: 'rules', reason: rule } : { status: 'pending', by: 'none' }
  const comment: Comment = {
    id: newId(),
    placeId: input.placeId,
    text: input.text,
    ...(input.nick ? { nick: input.nick } : {}),
    ...(input.experience ? { experience: input.experience } : {}),
    createdAt: new Date().toISOString(),
    moderation,
    mine: true,
  }
  if (!rule) await localDb.putComment(comment)
  return comment
}

export async function listPhotos(placeId: string): Promise<Photo[]> {
  const backend = await getBackend()
  const own = await localDb.photos(placeId)
  const remote = backend.mode === 'server' ? await getList<Photo>(`/api/photos?place=${encodeURIComponent(placeId)}`, 'photos') : []
  return merge(remote, own)
}

export async function addPhoto(input: NewPhoto): Promise<Photo> {
  const backend = await getBackend()
  if (backend.mode === 'server') {
    const photo = await post<Photo>('/api/photos', input, 'photo')
    // The author keeps a local copy of a photo waiting for moderation, to see what they sent
    const kept: Photo = { ...photo, url: photo.url || input.image, mine: true }
    if (photo.moderation.status !== 'rejected') await localDb.putPhoto(kept)
    return kept
  }
  const rule = input.caption ? ruleCheck(input.caption) : null
  const photo: Photo = {
    id: newId(),
    placeId: input.placeId,
    url: input.image,
    width: input.width,
    height: input.height,
    ...(input.caption ? { caption: input.caption } : {}),
    createdAt: new Date().toISOString(),
    moderation: rule ? { status: 'rejected', by: 'rules', reason: rule } : { status: 'pending', by: 'none' },
    mine: true,
  }
  if (!rule) await localDb.putPhoto(photo)
  return photo
}
