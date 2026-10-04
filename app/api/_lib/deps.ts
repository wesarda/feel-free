import type { Deps } from './handlers.js'
import { aiConfigured, moderateComment, moderatePhoto, ruleCheck } from './moderation.js'
import { getStore } from './store.js'

export const deps: Deps = { store: getStore, moderateComment, moderatePhoto, ruleCheck, ai: aiConfigured }
