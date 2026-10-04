/** Minimal Overpass API client with endpoint fallback and timeouts. Works in the browser and in Node. */

export type OverpassElement = {
  type: 'node' | 'way' | 'relation'
  id: number
  lat?: number
  lon?: number
  center?: { lat: number; lon: number }
  nodes?: number[]
  geometry?: { lat: number; lon: number }[]
  tags?: Record<string, string>
  timestamp?: string
  version?: number
}

export type OverpassResult = {
  elements: OverpassElement[]
  osm3s?: { timestamp_osm_base?: string }
}

/** Public instances, tried in order. Each has its own usage policy; heavy use needs an own instance. */
export const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
]

export class SourceUnavailableError extends Error {
  readonly attempts: string[]
  constructor(attempts: string[]) {
    super(`Overpass unavailable: ${attempts.join('; ')}`)
    this.name = 'SourceUnavailableError'
    this.attempts = attempts
  }
}

export async function overpass(
  query: string,
  {
    signal,
    timeoutMs = 30000,
    endpoints = OVERPASS_ENDPOINTS,
    deadlineMs,
    userAgent,
  }: {
    signal?: AbortSignal
    /** Per endpoint. */
    timeoutMs?: number
    endpoints?: string[]
    /** For all endpoints together: when a saved copy can stand in, there is no point waiting for every busy server. */
    deadlineMs?: number
    /** Outside the browser only: overpass-api.de answers HTTP 406 to generic agents such as "node". */
    userAgent?: string
  } = {},
): Promise<{ data: OverpassResult; endpoint: string }> {
  const attempts: string[] = []
  const stopAt = deadlineMs === undefined ? Infinity : Date.now() + deadlineMs
  for (const endpoint of endpoints) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const left = stopAt - Date.now()
    if (left <= 0) {
      attempts.push(`${new URL(endpoint).host}: skipped (time limit)`)
      continue
    }
    const controller = new AbortController()
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort)
    const timer = setTimeout(abort, Math.min(timeoutMs, left))
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...(userAgent ? { 'User-Agent': userAgent } : {}),
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      })
      if (!response.ok) {
        attempts.push(`${new URL(endpoint).host}: HTTP ${response.status}`)
        continue
      }
      const data = (await response.json()) as OverpassResult
      if (!Array.isArray(data.elements)) {
        attempts.push(`${new URL(endpoint).host}: invalid response`)
        continue
      }
      return { data, endpoint }
    } catch (error) {
      if (signal?.aborted) throw error
      attempts.push(`${new URL(endpoint).host}: ${controller.signal.aborted ? 'timeout' : (error as Error).message}`)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }
  throw new SourceUnavailableError(attempts)
}
