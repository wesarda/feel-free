import { createHash } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Store } from './store.js'

/** Vercel parses `query` and JSON `body`; the local dev server does not, so both are optional. */
export type Req = IncomingMessage & { query?: Record<string, string | string[] | undefined>; body?: unknown }
export type Res = ServerResponse

export function send(res: Res, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(data))
}

export function param(req: Req, name: string): string {
  const fromQuery = req.query?.[name]
  if (typeof fromQuery === 'string') return fromQuery
  const url = new URL(req.url ?? '/', 'http://localhost')
  return url.searchParams.get(name) ?? ''
}

export async function readJson(req: Req, limitBytes: number): Promise<Record<string, unknown>> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') return JSON.parse(req.body) as Record<string, unknown>
    return req.body as Record<string, unknown>
  }
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > limitBytes) throw new Error('too-large')
    chunks.push(chunk as Buffer)
  }
  const raw = Buffer.concat(chunks).toString('utf8')
  return raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
}

/** Anonymous key per visitor and day, for rate limits. The IP address itself is never stored. */
export function visitorKey(req: Req): string {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${day}|${process.env.KBB_SALT ?? 'kbb'}`).digest('hex').slice(0, 20)
}

export async function withinLimit(store: Store, req: Req, kind: string, limit: number): Promise<boolean> {
  const hour = Math.floor(Date.now() / 3600000)
  const count = await store.incr(`rl:${kind}:${visitorKey(req)}:${hour}`, 3600)
  return count <= limit
}

export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const str = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '')
