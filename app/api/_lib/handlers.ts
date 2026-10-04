/*
 * The API routes as factories, so tests can pass a memory store and a fake moderator.
 * Routes in app/api/*.ts wire them to the real store and Claude.
 */
import {
  LIMITS,
  PLACE_ID,
  type Comment,
  type Experience,
  type Moderation,
  type Photo,
} from '../../src/community/types.js'
import { newId, param, readJson, send, str, withinLimit, type Req, type Res } from './http.js'
import type { PhotoModeration } from './moderation.js'
import type { Store } from './store.js'

export type Deps = {
  store: () => Store | null
  moderateComment: (text: string, nick: string, lang: string) => Promise<Moderation>
  moderatePhoto: (
    base64: string,
    context: { placeName: string; category: string; caption: string; lang: string },
  ) => Promise<PhotoModeration>
  ruleCheck: (text: string) => string | null
  ai: () => boolean
}

const EXPERIENCES: Experience[] = ['ok', 'partial', 'barrier']
const COMMENTS_PER_HOUR = 10
const PHOTOS_PER_HOUR = 6
const PHOTO_ID = /^[a-z0-9]{6,32}$/

const parse = <T>(raw: string): T | null => {
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

const langOf = (value: unknown) => (value === 'en' ? 'en' : 'pl')

export function healthHandler(deps: Deps, problem: () => string) {
  return async (_req: Req, res: Res) => {
    const store = deps.store()
    let reachable = false
    try {
      if (store) {
        await store.get('ping')
        reachable = true
      }
    } catch {
      reachable = false
    }
    send(res, 200, { ok: true, store: reachable ? store!.kind : null, ai: deps.ai(), reason: reachable ? undefined : problem() || undefined })
  }
}

export function commentsHandler(deps: Deps) {
  return async (req: Req, res: Res) => {
    const store = deps.store()
    if (!store) return send(res, 503, { error: 'no-store' })

    if (req.method === 'GET') {
      const place = param(req, 'place')
      if (!PLACE_ID.test(place)) return send(res, 400, { error: 'place' })
      const comments = (await store.lrange(`c:${place}`, 0, 199)).map((r) => parse<Comment>(r)).filter(Boolean)
      return send(res, 200, { comments })
    }

    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readJson(req, 20_000)
      } catch {
        return send(res, 400, { error: 'body' })
      }
      const placeId = str(body.placeId, 80)
      const text = str(body.text, LIMITS.commentMax)
      const nick = str(body.nick, LIMITS.nickMax)
      const experience = EXPERIENCES.includes(body.experience as Experience) ? (body.experience as Experience) : undefined
      if (!PLACE_ID.test(placeId)) return send(res, 400, { error: 'place' })
      if (text.length < LIMITS.commentMin) return send(res, 400, { error: 'text' })
      if (!(await withinLimit(store, req, 'comment', COMMENTS_PER_HOUR))) return send(res, 429, { error: 'rate' })

      const rule = deps.ruleCheck(`${text} ${nick}`)
      const moderation: Moderation = rule
        ? { status: 'rejected', by: 'rules', reason: rule }
        : await deps.moderateComment(text, nick, langOf(body.lang))
      const comment: Comment = {
        id: newId(),
        placeId,
        text,
        ...(nick ? { nick } : {}),
        ...(experience ? { experience } : {}),
        createdAt: new Date().toISOString(),
        moderation,
      }
      if (moderation.status === 'approved') {
        await store.lpush(`c:${placeId}`, JSON.stringify(comment))
        await store.ltrim(`c:${placeId}`, 0, 499)
      } else if (moderation.status === 'pending') {
        // Never published until moderated; kept for a human moderator
        await store.lpush('queue:comments', JSON.stringify(comment))
        await store.ltrim('queue:comments', 0, 999)
      }
      return send(res, moderation.status === 'rejected' ? 422 : 201, { comment })
    }

    res.setHeader('Allow', 'GET, POST')
    return send(res, 405, { error: 'method' })
  }
}

export function photosHandler(deps: Deps) {
  return async (req: Req, res: Res) => {
    const store = deps.store()
    if (!store) return send(res, 503, { error: 'no-store' })

    if (req.method === 'GET') {
      const place = param(req, 'place')
      if (!PLACE_ID.test(place)) return send(res, 400, { error: 'place' })
      const photos = (await store.lrange(`p:${place}`, 0, 99)).map((r) => parse<Photo>(r)).filter(Boolean)
      return send(res, 200, { photos })
    }

    if (req.method === 'POST') {
      let body: Record<string, unknown>
      try {
        body = await readJson(req, 4_000_000)
      } catch {
        return send(res, 413, { error: 'too-large' })
      }
      const placeId = str(body.placeId, 80)
      const caption = str(body.caption, LIMITS.captionMax)
      const image = typeof body.image === 'string' ? body.image : ''
      const match = image.match(/^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/)
      if (!PLACE_ID.test(placeId)) return send(res, 400, { error: 'place' })
      if (!match) return send(res, 400, { error: 'image' })
      const base64 = match[1]
      if (Math.floor((base64.length * 3) / 4) > LIMITS.photoBytes) return send(res, 413, { error: 'too-large' })
      if (!(await withinLimit(store, req, 'photo', PHOTOS_PER_HOUR))) return send(res, 429, { error: 'rate' })

      const rule = caption ? deps.ruleCheck(caption) : null
      const moderation: PhotoModeration = rule
        ? { status: 'rejected', by: 'rules', reason: rule }
        : await deps.moderatePhoto(base64, {
            placeName: str(body.placeName, 120),
            category: str(body.category, 60),
            caption,
            lang: langOf(body.lang),
          })
      const id = newId()
      const { description, facts, ...decision } = moderation
      const photo: Photo = {
        id,
        placeId,
        url: `/api/photo?id=${id}`,
        width: Math.max(1, Math.min(4000, Number(body.width) || 1)),
        height: Math.max(1, Math.min(4000, Number(body.height) || 1)),
        ...(caption ? { caption } : {}),
        createdAt: new Date().toISOString(),
        moderation: decision,
        ...(description ? { description } : {}),
        ...(facts ? { facts } : {}),
      }
      if (moderation.status === 'approved') {
        await store.set(`img:${id}`, base64)
        await store.lpush(`p:${placeId}`, JSON.stringify(photo))
        await store.ltrim(`p:${placeId}`, 0, 199)
      } else if (moderation.status === 'pending') {
        // Kept apart: /api/photo serves only approved images
        await store.set(`pending-img:${id}`, base64, 60 * 60 * 24 * 30)
        await store.lpush('queue:photos', JSON.stringify(photo))
        await store.ltrim('queue:photos', 0, 499)
      }
      const visible = moderation.status === 'approved' ? photo : { ...photo, url: '' }
      return send(res, moderation.status === 'rejected' ? 422 : 201, { photo: visible })
    }

    res.setHeader('Allow', 'GET, POST')
    return send(res, 405, { error: 'method' })
  }
}

export function photoFileHandler(deps: Deps) {
  return async (req: Req, res: Res) => {
    const store = deps.store()
    const id = param(req, 'id')
    if (!store || !PHOTO_ID.test(id)) return send(res, 404, { error: 'not-found' })
    const base64 = await store.get(`img:${id}`)
    if (!base64) return send(res, 404, { error: 'not-found' })
    res.statusCode = 200
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.end(Buffer.from(base64, 'base64'))
  }
}
