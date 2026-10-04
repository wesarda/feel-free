import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Runs the Vercel functions from app/api inside `npm run dev`, so comments and photos work locally
 * (stored in .data/community.json; AI moderation when ANTHROPIC_API_KEY is in .env.local).
 */
function apiDev(): Plugin {
  return {
    name: 'kbb-api-dev',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost')
        const route = url.pathname.match(/^\/api\/([a-z]+)$/)?.[1]
        if (!route) return next()
        try {
          const mod = (await server.ssrLoadModule(`/api/${route}.ts`)) as { default: (q: unknown, s: unknown) => Promise<void> }
          Object.assign(req, { query: Object.fromEntries(url.searchParams) })
          await mod.default(req, res)
        } catch (error) {
          const missing = String(error).includes('Failed to load url')
          if (!missing) console.error(error)
          res.statusCode = missing ? 404 : 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: missing ? 'not-found' : 'server' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Server-side secrets for the local API (not exposed to the browser: no VITE_ prefix)
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
    if (!(key in process.env)) process.env[key] = value
  }
  return {
    plugins: [react(), apiDev()],
    // Pre-bundling breaks the URL maplibre-gl uses to spawn its web worker
    optimizeDeps: { exclude: ['maplibre-gl'] },
    // maplibre-gl runs its worker as an ES module (see MapView: setWorkerUrl)
    worker: { format: 'es' },
  }
})
