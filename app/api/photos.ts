// GET /api/photos?place=<id> · POST /api/photos { placeId, placeName, category, image (JPEG data URL), width, height, caption?, lang }
import { deps } from './_lib/deps.js'
import { photosHandler } from './_lib/handlers.js'

export default photosHandler(deps)
