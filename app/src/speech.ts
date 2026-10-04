import type { Lang } from './core/types.ts'

/** Reading aloud with the speech synthesis built into the browser: nothing is sent anywhere. */

const LOCALE: Record<Lang, string> = { pl: 'pl-PL', en: 'en-GB' }

const synth = () => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null)

export const speechSupported = () => synth() !== null

// Stopping fires the end callbacks of what was being read; the counter tells them they are out of date
let session = 0

/**
 * Reads the lines one by one (browsers cut long single utterances short) and calls `onEnd` after the
 * last one or when the browser refuses to speak. Anything still being read is stopped first.
 */
export function speak(lines: string[], lang: Lang, onEnd?: () => void): boolean {
  const s = synth()
  const text = lines.map((l) => l.trim()).filter(Boolean)
  if (!s || text.length === 0) return false
  s.cancel()
  const mine = ++session
  const voice = s.getVoices().find((v) => v.lang.toLowerCase().startsWith(lang))
  text.forEach((line, i) => {
    const utterance = new SpeechSynthesisUtterance(line)
    utterance.lang = LOCALE[lang]
    if (voice) utterance.voice = voice
    const finish = () => {
      if (mine === session) onEnd?.()
    }
    if (i === text.length - 1) utterance.onend = finish
    utterance.onerror = finish
    s.speak(utterance)
  })
  return true
}

export function stopSpeaking() {
  session++
  synth()?.cancel()
}
