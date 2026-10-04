import { Suspense, lazy } from 'react'
import { PRESET_ORDER } from './core/needs'
import type { Lang, PresetId } from './core/types'
import { I18nProvider } from './i18n/I18nProvider'

// Separate bundles: an embedded card does not need the map
const App = lazy(() => import('./App'))
const EmbedApp = lazy(() => import('./EmbedApp'))

/** `?embed=<place id>` renders the compact card for other websites, anything else the full app. */
export function Root() {
  const params = new URLSearchParams(window.location.search)
  const embed = params.get('embed')
  const lang = params.get('lang')
  const preset = params.get('needs') as PresetId | null
  return (
    <I18nProvider initialLang={embed && (lang === 'pl' || lang === 'en') ? (lang as Lang) : undefined}>
      <Suspense fallback={null}>
        {embed ? <EmbedApp placeId={embed} preset={preset && PRESET_ORDER.includes(preset) ? preset : null} /> : <App />}
      </Suspense>
    </I18nProvider>
  )
}
