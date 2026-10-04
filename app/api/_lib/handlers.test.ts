import { describe, expect, it } from 'vitest'
import type { Moderation } from '../../src/community/types.js'
import { commentsHandler, healthHandler, photoFileHandler, photosHandler, type Deps } from './handlers.js'
import type { Req, Res } from './http.js'
import { ruleCheck } from './moderation.js'
import { memoryStore } from './store.js'

function request(method: string, url: string, body?: unknown, ip = '1.2.3.4'): Req {
  const raw = body === undefined ? '' : JSON.stringify(body)
  const req = {
    method,
    url,
    headers: { 'x-forwarded-for': ip },
    socket: {},
    async *[Symbol.asyncIterator]() {
      if (raw) yield Buffer.from(raw)
    },
  }
  return req as unknown as Req
}

function response() {
  const out = { status: 0, headers: {} as Record<string, string>, body: '' as string | Buffer }
  const res = {
    set statusCode(v: number) {
      out.status = v
    },
    setHeader(k: string, v: string) {
      out.headers[k.toLowerCase()] = v
    },
    end(data?: string | Buffer) {
      out.body = data ?? ''
    },
  }
  return { res: res as unknown as Res, out, json: () => JSON.parse(String(out.body)) }
}

function setup(decision: Moderation['status'] = 'approved') {
  const store = memoryStore()
  const deps: Deps = {
    store: () => store,
    ruleCheck,
    ai: () => true,
    moderateComment: async () => ({ status: decision, by: 'ai', reason: 'ok', model: 'test' }),
    moderatePhoto: async () => ({
      status: decision,
      by: 'ai',
      reason: 'ok',
      description: 'Wejście z dwoma stopniami',
      facts: { entranceSteps: 2, ramp: false, handrail: true, automaticDoor: null, levelEntrance: false },
    }),
  }
  return { store, deps }
}

const JPEG = `data:image/jpeg;base64,${Buffer.from('fake-jpeg-bytes').toString('base64')}`

describe('comments API', () => {
  it('publishes an approved comment and lists it', async () => {
    const { deps } = setup('approved')
    const post = response()
    await commentsHandler(deps)(request('POST', '/api/comments', { placeId: 'osm-node-1', text: 'Wejście od podwórza, bez schodów', experience: 'ok', lang: 'pl' }), post.res)
    expect(post.out.status).toBe(201)
    expect(post.json().comment.moderation.status).toBe('approved')

    const get = response()
    await commentsHandler(deps)(request('GET', '/api/comments?place=osm-node-1'), get.res)
    expect(get.json().comments.map((c: { text: string }) => c.text)).toEqual(['Wejście od podwórza, bez schodów'])
  })

  it('keeps unmoderated comments out of the public list', async () => {
    const { deps, store } = setup('pending')
    const post = response()
    await commentsHandler(deps)(request('POST', '/api/comments', { placeId: 'osm-node-1', text: 'Winda nie działa' }), post.res)
    expect(post.out.status).toBe(201)
    const get = response()
    await commentsHandler(deps)(request('GET', '/api/comments?place=osm-node-1'), get.res)
    expect(get.json().comments).toEqual([])
    expect(await store.lrange('queue:comments', 0, -1)).toHaveLength(1)
  })

  it('rejects links and phone numbers without calling the AI', async () => {
    const { deps } = setup('approved')
    let called = false
    deps.moderateComment = async () => {
      called = true
      return { status: 'approved', by: 'ai' }
    }
    const post = response()
    await commentsHandler(deps)(request('POST', '/api/comments', { placeId: 'osm-node-1', text: 'Dzwoń 600 700 800 albo www.spam.pl' }), post.res)
    expect(post.out.status).toBe(422)
    expect(post.json().comment.moderation).toMatchObject({ status: 'rejected', by: 'rules' })
    expect(called).toBe(false)
  })

  it('validates input and limits the rate per visitor', async () => {
    const { deps } = setup('approved')
    const bad = response()
    await commentsHandler(deps)(request('POST', '/api/comments', { placeId: 'Bad Id!', text: 'ok ok' }), bad.res)
    expect(bad.out.status).toBe(400)
    let last = 0
    for (let i = 0; i < 11; i++) {
      const r = response()
      await commentsHandler(deps)(request('POST', '/api/comments', { placeId: 'osm-node-2', text: `Komentarz ${i}` }), r.res)
      last = r.out.status
    }
    expect(last).toBe(429)
  })
})

describe('photos API', () => {
  it('stores an approved photo with what the AI saw and serves the image', async () => {
    const { deps } = setup('approved')
    const post = response()
    await photosHandler(deps)(request('POST', '/api/photos', { placeId: 'osm-way-5', placeName: 'Muzeum', category: 'museum', image: JPEG, width: 800, height: 600, lang: 'pl' }), post.res)
    expect(post.out.status).toBe(201)
    const photo = post.json().photo
    expect(photo.facts.entranceSteps).toBe(2)
    expect(photo.url).toMatch(/^\/api\/photo\?id=/)

    const file = response()
    await photoFileHandler(deps)(request('GET', photo.url), file.res)
    expect(file.out.headers['content-type']).toBe('image/jpeg')
    expect(Buffer.from(file.out.body as Buffer).toString()).toBe('fake-jpeg-bytes')
  })

  it('does not serve pending or rejected photos', async () => {
    for (const decision of ['pending', 'rejected'] as const) {
      const { deps } = setup(decision)
      const post = response()
      await photosHandler(deps)(request('POST', '/api/photos', { placeId: 'osm-way-5', image: JPEG, width: 10, height: 10 }), post.res)
      expect(post.json().photo.url).toBe('')
      const list = response()
      await photosHandler(deps)(request('GET', '/api/photos?place=osm-way-5'), list.res)
      expect(list.json().photos).toEqual([])
    }
  })

  it('accepts only JPEG data URLs', async () => {
    const { deps } = setup('approved')
    const post = response()
    await photosHandler(deps)(request('POST', '/api/photos', { placeId: 'osm-way-5', image: 'data:image/svg+xml;base64,PHN2Zz4=' }), post.res)
    expect(post.out.status).toBe(400)
  })
})

describe('health', () => {
  it('reports the store and whether AI moderation is on', async () => {
    const { deps } = setup()
    const r = response()
    await healthHandler(deps, () => '')(request('GET', '/api/health'), r.res)
    expect(r.json()).toMatchObject({ ok: true, store: 'memory', ai: true })
  })
})
