import { createContext, useContext } from 'react'
import type { Lang } from '../core/types.ts'
import type { Messages } from './en.ts'

export type I18n = {
  lang: Lang
  t: Messages
  setLang: (lang: Lang) => void
  formatDate: (iso?: string) => string
  formatDateTime: (iso?: string) => string
  formatDistance: (metres: number) => string
}

export const I18nContext = createContext<I18n | null>(null)

export function useI18n(): I18n {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}

export function detectLang(): Lang {
  try {
    return navigator.language.toLowerCase().startsWith('pl') ? 'pl' : 'en'
  } catch {
    return 'pl'
  }
}
