import { useI18n } from '../i18n/context'
import { speak, speechSupported, stopSpeaking } from '../speech'
import type { Vision } from '../vision'
import { Dialog } from './Dialog'

/** Settings for people who see poorly; each one works on its own. */
export function VisionDialog({ vision, onChange, onClose }: { vision: Vision; onChange: (vision: Vision) => void; onClose: () => void }) {
  const { t, lang } = useI18n()
  const canSpeak = speechSupported()
  const options: { key: keyof Vision; title: string; hint: string; disabled?: boolean }[] = [
    { key: 'lowVision', title: t.vision.lowVision, hint: t.vision.lowVisionHint },
    { key: 'voice', title: t.vision.voice, hint: canSpeak ? t.vision.voiceHint : t.vision.voiceUnsupported, disabled: !canSpeak },
  ]
  const toggle = (key: keyof Vision, value: boolean) => {
    onChange({ ...vision, [key]: value })
    // The answer to switching the voice on is the voice itself
    if (key === 'voice') {
      if (value) speak([t.vision.voiceOn], lang)
      else stopSpeaking()
    }
  }
  return (
    <Dialog title={t.vision.title} onClose={onClose}>
      <div className="vision-options">
        {options.map(({ key, title, hint, disabled }) => (
          <label key={key} className="check">
            <input type="checkbox" checked={vision[key]} disabled={disabled} onChange={(e) => toggle(key, e.target.checked)} />
            <span>
              <strong>{title}</strong>
              <span className="muted">{hint}</span>
            </span>
          </label>
        ))}
      </div>
      <button type="button" className="btn primary wide" onClick={onClose}>
        {t.vision.done}
      </button>
    </Dialog>
  )
}
