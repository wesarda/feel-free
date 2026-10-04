import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CityConfig } from '../cities/types.ts'
import type { LngLat } from '../core/types.ts'

const AREA: [number, number, number, number] = [50, 19.9, 50.1, 20]
const ELSEWHERE: [number, number, number, number] = [51, 19.9, 51.1, 20]
const city = { id: 'test', networkSnapshotUrl: 'data/test/network.json', networkBbox: AREA } as CityConfig
const FROM: LngLat = [19.937, 50.061]
const TO: LngLat = [19.939, 50.062]
const WAY = {
  type: 'way',
  id: 1,
  nodes: [1, 2],
  geometry: [
    { lat: 50.061, lon: 19.937 },
    { lat: 50.062, lon: 19.939 },
  ],
  tags: { highway: 'footway' },
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
const snapshot = (bbox: number[]) => json({ city: 'test', fetchedAt: '2026-10-01T02:00:00.000Z', bbox, elements: [WAY] })
/** A server that never answers until the request is aborted. */
const busy = (init?: RequestInit) =>
  new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))))

/** Overpass is requested with POST, the saved copy with a plain GET. */
function stubFetch(overpass: (init?: RequestInit) => Promise<Response>, copy: () => Response) {
  const fetchMock = vi.fn((_url: string, init?: RequestInit) => (init?.method === 'POST' ? overpass(init) : Promise.resolve(copy())))
  vi.stubGlobal('fetch', fetchMock)
  return {
    live: () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'POST').length,
    copies: () => fetchMock.mock.calls.filter(([, init]) => init?.method !== 'POST').length,
  }
}

// The module keeps loaded networks and snapshots in memory, so every test gets a fresh copy of it
const loadNetwork = async (...args: Parameters<typeof import('./network.ts').loadNetwork>) =>
  (await import('./network.ts')).loadNetwork(...args)

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('loadNetwork', () => {
  it('uses live data when Overpass answers', async () => {
    const calls = stubFetch(async () => json({ elements: [WAY] }), () => snapshot(AREA))
    const load = await loadNetwork(city, FROM, TO)
    expect(load.state).toBe('live')
    expect(calls.live()).toBe(1)
    // The saved copy is a large file: not downloaded while live data works
    expect(calls.copies()).toBe(0)
  })

  it('waits at most 2.5 s for busy servers when the saved copy covers the route', async () => {
    const calls = stubFetch(busy, () => snapshot([50, 19.9, 50.1, 20]))
    const pending = loadNetwork(city, FROM, TO)
    await vi.advanceTimersByTimeAsync(2499)
    expect(calls.live()).toBe(1)
    await vi.advanceTimersByTimeAsync(1)

    const load = await pending
    expect(load).toMatchObject({ state: 'cached', fetchedAt: '2026-10-01T02:00:00.000Z' })
    expect(load.state === 'cached' && load.detail).toContain('skipped (time limit)')
    // The other servers are not asked once the limit has passed
    expect(calls.live()).toBe(1)
  })

  it('tries every server for the full time when the saved copy does not cover the route', async () => {
    const calls = stubFetch(busy, () => snapshot(ELSEWHERE))
    const pending = loadNetwork({ ...city, networkBbox: ELSEWHERE }, FROM, TO)
    await vi.advanceTimersByTimeAsync(8000)
    expect(calls.live()).toBe(1)
    await vi.advanceTimersByTimeAsync(82000)

    const load = await pending
    expect(load.state).toBe('unavailable')
    expect(calls.live()).toBe(3)
    expect(calls.copies()).toBe(0)
  })

  it('reads the saved copy once, however many routes are planned', async () => {
    const calls = stubFetch(async () => new Response('', { status: 429 }), () => snapshot([50, 19.9, 50.1, 20]))
    const { loadNetwork } = await import('./network.ts')
    expect((await loadNetwork(city, FROM, TO)).state).toBe('cached')
    expect((await loadNetwork(city, TO, [19.95, 50.065])).state).toBe('cached')
    expect(calls.copies()).toBe(1)
  })

  it('does not make the next routes wait again once the servers have not answered', async () => {
    const calls = stubFetch(busy, () => snapshot([50, 19.9, 50.1, 20]))
    const { loadNetwork, retryLiveNetwork } = await import('./network.ts')
    const first = loadNetwork(city, FROM, TO)
    await vi.advanceTimersByTimeAsync(2500)
    expect((await first).state).toBe('cached')
    expect(calls.live()).toBe(1)

    // Another route in the saved area: the copy at once, the servers are not asked
    expect(await loadNetwork(city, TO, [19.95, 50.065])).toMatchObject({ state: 'cached' })
    expect(calls.live()).toBe(1)

    // "Retry", or two minutes later: the servers are asked again
    retryLiveNetwork()
    const again = loadNetwork(city, FROM, TO)
    await vi.advanceTimersByTimeAsync(2500)
    expect((await again).state).toBe('cached')
    expect(calls.live()).toBe(2)
    await vi.advanceTimersByTimeAsync(120000)
    const later = loadNetwork(city, FROM, TO)
    await vi.advanceTimersByTimeAsync(2500)
    await later
    expect(calls.live()).toBe(3)
  })

  it('goes straight to the saved copy during a simulated outage', async () => {
    const calls = stubFetch(busy, () => snapshot([50, 19.9, 50.1, 20]))
    const load = await loadNetwork(city, FROM, TO, { simulateOutage: true })
    expect(load.state).toBe('cached')
    expect(calls.live()).toBe(0)
  })

  it('stops when the route is cancelled', async () => {
    stubFetch(busy, () => snapshot([50, 19.9, 50.1, 20]))
    const controller = new AbortController()
    const pending = loadNetwork(city, FROM, TO, { signal: controller.signal }).catch((e: unknown) => e)
    await vi.advanceTimersByTimeAsync(100)
    controller.abort()
    expect(await pending).toMatchObject({ name: 'AbortError' })
  })
})
