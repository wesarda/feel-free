// GET /api/health: whether comments and photos are stored on the server and moderated by AI.
import { deps } from './_lib/deps.js'
import { healthHandler } from './_lib/handlers.js'
import { storeProblem } from './_lib/store.js'

export default healthHandler(deps, storeProblem)
