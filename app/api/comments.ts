// GET /api/comments?place=<id> · POST /api/comments { placeId, text, nick?, experience?, lang }
import { deps } from './_lib/deps.js'
import { commentsHandler } from './_lib/handlers.js'

export default commentsHandler(deps)
