import { useEffect, useMemo, useState } from 'react'
import type { CityConfig } from '../cities/types'
import { planRoute, type RoutePlan } from '../core/route/plan'
import type { AlertReport, LngLat, Needs, Place } from '../core/types'
import { loadNetwork, retryLiveNetwork, type NetworkLoad } from './network'

export type Endpoint = { kind: 'place'; placeId: string } | { kind: 'point'; coords: LngLat }

export type RouteStatus =
  | { state: 'idle' }
  | { state: 'loading' }
  | { state: 'unavailable'; detail: string }
  | { state: 'ready'; source: 'live' | 'cached'; fetchedAt: string; plan: RoutePlan | null }

export function findPlace(places: Place[], id: string): Place | undefined {
  return places.find((p) => p.id === id || p.aliases?.includes(id))
}

export function endpointCoords(endpoint: Endpoint | null, places: Place[]): LngLat | null {
  if (!endpoint) return null
  if (endpoint.kind === 'point') return endpoint.coords
  return findPlace(places, endpoint.placeId)?.coords ?? null
}

/**
 * Loads the footway network around the chosen points and plans the route. Changing the needs
 * re-plans instantly on the loaded network; changing the points loads the network again.
 */
export function useRoute(
  city: CityConfig,
  places: Place[],
  needs: Needs | null,
  alerts: AlertReport[],
  { simulateOutage }: { simulateOutage: boolean },
) {
  const [from, setFrom] = useState<Endpoint | null>(null)
  const [to, setTo] = useState<Endpoint | null>(null)
  const [attempt, setAttempt] = useState(0)
  const a = endpointCoords(from, places)
  const b = endpointCoords(to, places)
  // The key carries everything a request depends on, so effects and memos can depend on it alone
  const key = a && b ? JSON.stringify({ a, b, simulateOutage, attempt }) : null
  const [loaded, setLoaded] = useState<{ key: string; load: NetworkLoad } | null>(null)

  useEffect(() => {
    if (!key) return
    const request = JSON.parse(key) as { a: LngLat; b: LngLat; simulateOutage: boolean }
    const controller = new AbortController()
    loadNetwork(city, request.a, request.b, { signal: controller.signal, simulateOutage: request.simulateOutage })
      .then((load) => setLoaded({ key, load }))
      .catch(() => {
        // aborted
      })
    return () => controller.abort()
  }, [city, key])

  const status: RouteStatus = useMemo(() => {
    if (!key) return { state: 'idle' }
    if (!loaded || loaded.key !== key) return { state: 'loading' }
    const load = loaded.load
    if (load.state === 'unavailable') return { state: 'unavailable', detail: load.detail }
    const request = JSON.parse(key) as { a: LngLat; b: LngLat }
    return {
      state: 'ready',
      source: load.state,
      fetchedAt: load.fetchedAt,
      plan: needs ? planRoute(load.graph, request.a, request.b, needs, alerts) : null,
    }
  }, [key, loaded, needs, alerts])

  return {
    from,
    to,
    setFrom,
    setTo,
    swap: () => {
      setFrom(to)
      setTo(from)
    },
    clear: () => {
      setFrom(null)
      setTo(null)
    },
    retry: () => {
      retryLiveNetwork()
      setAttempt((n) => n + 1)
    },
    status,
  }
}
