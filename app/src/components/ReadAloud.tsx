import { useContext, useEffect, useRef, useState } from 'react'
import { Square, Volume2 } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { speak, speechSupported, stopSpeaking } from '../speech'
import { VoiceContext } from '../vision'

/**
 * Shown when the voice is switched on in the vision settings: reads the text when the place or route
 * opens (`readKey` changes) and again on request. Screen reader users keep the voice off.
 */
export function ReadAloud({ lines, readKey }: { lines: string[]; readKey: string }) {
  const { t, lang } = useI18n()
  const voice = useContext(VoiceContext)
  const [speaking, setSpeaking] = useState(false)
  // The text can change while it is on screen (the needs, the language); reading starts from the latest
  const latest = useRef({ lines, lang })
  useEffect(() => {
    latest.current = { lines, lang }
  })

  const start = () => setSpeaking(speak(latest.current.lines, latest.current.lang, () => setSpeaking(false)))
  const stop = () => {
    stopSpeaking()
    setSpeaking(false)
  }

  useEffect(() => {
    if (!voice) return
    setSpeaking(speak(latest.current.lines, latest.current.lang, () => setSpeaking(false)))
    return stopSpeaking
  }, [voice, readKey])

  if (!voice || !speechSupported()) return null
  return (
    <button type="button" className="btn small read-aloud" aria-pressed={speaking} onClick={speaking ? stop : start}>
      {speaking ? <Square size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
      {speaking ? t.vision.stop : t.vision.readAloud}
    </button>
  )
}
