import { createContext, useEffect } from 'react'
import { useLocalStorage } from './useLocalStorage'

/** Display and voice settings for people who see poorly. */
export type Vision = {
  /** Larger text, solid panels, stronger borders. */
  lowVision: boolean
  /** Places and routes are read aloud by the browser's speech synthesis. */
  voice: boolean
}

/** Whether places and routes are read aloud; read by the "Read aloud" buttons wherever they are. */
export const VoiceContext = createContext(false)

const OFF: Vision = { lowVision: false, voice: false }

/** Saved in the browser; the look is applied to the whole page through an attribute on <html> (see index.css). */
export function useVision() {
  const [stored, setVision] = useLocalStorage<Vision>('kbb.vision', OFF)
  // Tolerates a value saved by another version: only the settings that exist now are taken from it
  const saved: Partial<Vision> = stored && typeof stored === 'object' ? stored : {}
  const vision: Vision = { lowVision: saved.lowVision === true, voice: saved.voice === true }
  const { lowVision } = vision

  useEffect(() => {
    document.documentElement.toggleAttribute('data-low-vision', lowVision)
  }, [lowVision])

  return [vision, setVision] as const
}
