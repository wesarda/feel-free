import { SlidersHorizontal } from 'lucide-react'
import { PRESETS, PRESET_ORDER, samePreset } from '../core/needs'
import type { Needs } from '../core/types'
import { useI18n } from '../i18n/context'
import { PRESET_ICON } from '../icons'

/** Needs as a row of chips, like filters in map apps; details in the settings dialog. */
export function NeedsBar({ needs, onChange, onSettings }: {
  needs: Needs | null
  onChange: (needs: Needs | null) => void
  onSettings: () => void
}) {
  const { t } = useI18n()
  const preset = needs ? samePreset(needs) : null
  return (
    <div className="chips" role="group" aria-label={t.needs.title}>
      {PRESET_ORDER.map((id) => {
        const Icon = PRESET_ICON[id]
        const active = preset === id
        return (
          <button
            key={id}
            type="button"
            className={active ? 'chip glass active' : 'chip glass'}
            aria-pressed={active}
            onClick={() => onChange(active ? null : { ...PRESETS[id] })}
          >
            <Icon size={16} aria-hidden="true" />
            {t.needs.presets[id]}
          </button>
        )
      })}
      <button
        type="button"
        className={needs && !preset ? 'chip glass active' : 'chip glass'}
        onClick={onSettings}
        aria-haspopup="dialog"
      >
        <SlidersHorizontal size={16} aria-hidden="true" />
        {needs && !preset ? t.needs.custom : t.needs.adjust}
      </button>
    </div>
  )
}
