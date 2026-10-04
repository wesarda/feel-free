// GET /api/photo?id=<id>: an approved photo as JPEG.
import { deps } from './_lib/deps.js'
import { photoFileHandler } from './_lib/handlers.js'

export default photoFileHandler(deps)
