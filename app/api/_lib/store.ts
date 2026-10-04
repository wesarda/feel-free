/*
 * Tiny key-value + list storage for comments and photos, the same idea as in vortex_space/api/_lib.js:
 *   - Upstash Redis over its REST API when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
 *     (or KV_REST_API_URL + KV_REST_API_TOKEN from the Vercel integration) are set: production;
 *   - a JSON file (.data/community.json) on a developer's machine (`npm run dev`);
 *   - memory, for tests.
 * On Vercel without a database there is no store: /api/health says so and the app keeps
 * comments and photos in the browser.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

export type Store = {
  kind: 'upstash' | 'file' | 'memory'
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSeconds?: number): Promise<void>
  del(key: string): Promise<void>
  incr(key: string, ttlSeconds?: number): Promise<number>
  lpush(key: string, value: string): Promise<void>
  lrange(key: string, start: number, stop: number): Promise<string[]>
  ltrim(key: string, start: number, stop: number): Promise<void>
}

type Entry = { v: string; exp: number }

export function memoryStore(): Store & { dump(): unknown; load(data: unknown): void } {
  const kv = new Map<string, Entry>()
  const lists = new Map<string, string[]>()
  const live = (key: string) => {
    const e = kv.get(key)
    if (e && e.exp && e.exp < Date.now()) {
      kv.delete(key)
      return undefined
    }
    return e
  }
  const slice = (list: string[], start: number, stop: number) => list.slice(start, stop < 0 ? list.length + stop + 1 : stop + 1)
  return {
    kind: 'memory',
    async get(key) {
      return live(key)?.v ?? null
    },
    async set(key, value, ttl) {
      kv.set(key, { v: value, exp: ttl ? Date.now() + ttl * 1000 : 0 })
    },
    async del(key) {
      kv.delete(key)
      lists.delete(key)
    },
    async incr(key, ttl) {
      const e = live(key)
      const n = (e ? Number(e.v) : 0) + 1
      kv.set(key, { v: String(n), exp: e ? e.exp : ttl ? Date.now() + ttl * 1000 : 0 })
      return n
    },
    async lpush(key, value) {
      lists.set(key, [value, ...(lists.get(key) ?? [])])
    },
    async lrange(key, start, stop) {
      return slice(lists.get(key) ?? [], start, stop)
    },
    async ltrim(key, start, stop) {
      lists.set(key, slice(lists.get(key) ?? [], start, stop))
    },
    dump() {
      return { kv: Object.fromEntries(kv), lists: Object.fromEntries(lists) }
    },
    load(data) {
      const d = data as { kv?: Record<string, Entry>; lists?: Record<string, string[]> }
      for (const [k, e] of Object.entries(d.kv ?? {})) if (!e.exp || e.exp > Date.now()) kv.set(k, e)
      for (const [k, l] of Object.entries(d.lists ?? {})) lists.set(k, l)
    },
  }
}

function fileStore(file: string): Store {
  const mem = memoryStore()
  let loaded = false
  const load = () => {
    if (loaded) return
    loaded = true
    try {
      mem.load(JSON.parse(readFileSync(file, 'utf8')))
    } catch {
      // no file yet
    }
  }
  const save = () => {
    try {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, JSON.stringify(mem.dump()))
    } catch {
      // read-only disk: keep data in memory
    }
  }
  const wrap =
    <A extends unknown[], R>(fn: (...a: A) => Promise<R>, write: boolean) =>
    async (...a: A) => {
      load()
      const r = await fn(...a)
      if (write) save()
      return r
    }
  return {
    kind: 'file',
    get: wrap(mem.get, false),
    set: wrap(mem.set, true),
    del: wrap(mem.del, true),
    incr: wrap(mem.incr, true),
    lpush: wrap(mem.lpush, true),
    lrange: wrap(mem.lrange, false),
    ltrim: wrap(mem.ltrim, true),
  }
}

function upstashStore(url: string, token: string): Store {
  const cmd = async (args: (string | number)[]) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
    })
    const data = (await response.json().catch(() => ({}))) as { result?: unknown; error?: string }
    if (!response.ok || data.error) throw new Error(`database: ${data.error ?? response.status}`)
    return data.result
  }
  return {
    kind: 'upstash',
    async get(key) {
      const v = await cmd(['GET', key])
      return v == null ? null : String(v)
    },
    async set(key, value, ttl) {
      await cmd(ttl ? ['SET', key, value, 'EX', ttl] : ['SET', key, value])
    },
    async del(key) {
      await cmd(['DEL', key])
    },
    async incr(key, ttl) {
      const n = Number(await cmd(['INCR', key]))
      if (n === 1 && ttl) await cmd(['EXPIRE', key, ttl])
      return n
    },
    async lpush(key, value) {
      await cmd(['LPUSH', key, value])
    },
    async lrange(key, start, stop) {
      return ((await cmd(['LRANGE', key, start, stop])) as string[] | null) ?? []
    },
    async ltrim(key, start, stop) {
      await cmd(['LTRIM', key, start, stop])
    },
  }
}

let current: Store | null | undefined
let problem = ''

/** Why there is no database although settings exist (never contains a secret). */
export function storeProblem(): string {
  getStore()
  return problem
}

export function getStore(): Store | null {
  if (current !== undefined) return current
  const env = process.env
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '').trim().replace(/\/+$/, '')
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '').trim()
  if (url && !url.startsWith('https://')) {
    problem = 'UPSTASH_REDIS_REST_URL must be the REST URL starting with https://'
    current = null
  } else if (url && !token) {
    problem = 'UPSTASH_REDIS_REST_TOKEN is missing'
    current = null
  } else if (url && token) {
    current = upstashStore(url, token)
  } else if (!env.VERCEL) {
    current = fileStore(env.KBB_DATA_FILE || join(process.cwd(), '.data', 'community.json'))
  } else {
    current = null
  }
  return current
}

/** For tests. */
export function setStore(store: Store | null) {
  current = store
  problem = ''
}
