import { afterEach, describe, expect, it, vi } from 'vitest'
import { overpass, SourceUnavailableError } from './overpass.ts'

const ok = () => new Response(JSON.stringify({ elements: [] }), { status: 200 })

afterEach(() => vi.unstubAllGlobals())

describe('overpass', () => {
  it('sends a User-Agent only when one is given', async () => {
    const fetchMock = vi.fn(async () => ok())
    vi.stubGlobal('fetch', fetchMock)

    await overpass('node(1);out;', { endpoints: ['https://a.test/api'] })
    await overpass('node(1);out;', { endpoints: ['https://a.test/api'], userAgent: 'FeelFree-test' })

    const headers = fetchMock.mock.calls.map((call) => (call as unknown as [string, RequestInit])[1].headers as Record<string, string>)
    expect(headers[0]['User-Agent']).toBeUndefined()
    expect(headers[1]['User-Agent']).toBe('FeelFree-test')
  })

  it('falls back to the next endpoint and reports every failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.includes('a.test') ? new Response('', { status: 406 }) : ok())))
    const { endpoint } = await overpass('x', { endpoints: ['https://a.test/api', 'https://b.test/api'] })
    expect(endpoint).toBe('https://b.test/api')

    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 429 })))
    const error = await overpass('x', { endpoints: ['https://a.test/api', 'https://b.test/api'] }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(SourceUnavailableError)
    expect((error as SourceUnavailableError).attempts).toEqual(['a.test: HTTP 429', 'b.test: HTTP 429'])
  })

  it('stops waiting for busy servers after the time limit', async () => {
    // A server that never answers until the request is aborted
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: string, init: RequestInit) =>
          new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))),
      ),
    )
    const started = Date.now()
    const error = await overpass('x', { endpoints: ['https://a.test/api', 'https://b.test/api'], deadlineMs: 50 }).catch((e: unknown) => e)
    expect(Date.now() - started).toBeLessThan(1000)
    expect((error as SourceUnavailableError).attempts).toEqual(['a.test: timeout', 'b.test: skipped (time limit)'])
  })
})
