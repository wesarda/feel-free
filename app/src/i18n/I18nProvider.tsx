import { useEffect, useMemo, type ReactNode } from 'react'
import type { Lang } from '../core/types'
import { useLocalStorage } from '../useLocalStorage'
import { I18nContext, detectLang, type I18n } from './context'
import { en } from './en'
import { pl } from './pl'

const MESSAGES = { pl, en }

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [stored, setLang] = useLocalStorage<Lang>('kbb.lang', initialLang ?? detectLang())
  const lang: Lang = initialLang ?? (stored === 'en' ? 'en' : 'pl')

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = MESSAGES[lang].appTitle
  }, [lang])

  const value = useMemo<I18n>(() => {
    const locale = lang === 'pl' ? 'pl-PL' : 'en-GB'
    const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' })
    const dateTimeFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })
    const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    const format = (f: Intl.DateTimeFormat) => (iso?: string) => {
      const time = iso ? Date.parse(iso) : NaN
      return Number.isNaN(time) ? MESSAGES[lang].undated : f.format(time)
    }
    return {
      lang,
      t: MESSAGES[lang],
      setLang,
      formatDate: format(dateFormat),
      formatDateTime: format(dateTimeFormat),
      formatDistance: (m) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${number.format(m / 1000)} km`),
    }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
