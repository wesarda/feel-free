import type { ChangeEvent } from 'react'
import { PRESETS, PRESET_ORDER, normalizeNeeds, samePreset } from '../core/needs'
import type { Needs } from '../core/types'
import { useI18n } from '../i18n/context'
import { PRESET_ICON } from '../icons'
import { Dialog } from './Dialog'

type NumberKey = 'maxSteps' | 'maxKerbCm' | 'minWidthCm' | 'maxSlopePct' | 'walkingSpeedKmh'
type FlagKey = 'avoidCobblestones' | 'needElevator' | 'needAccessibleToilet' | 'needBabyChanging' | 'needRestPlaces'

const OPTIONS: Record<NumberKey, number[]> = {
  maxSteps: [0, 1, 2, 3, 5, 99],
  maxKerbCm: [0, 2, 3, 7, 12, 99],
  minWidthCm: [0, 70, 80, 90, 100],
  maxSlopePct: [5, 6, 8, 10, 12, 99],
  walkingSpeedKmh: [2.5, 3, 3.6, 4, 4.5, 5],
}
const FLAGS: FlagKey[] = ['avoidCobblestones', 'needElevator', 'needAccessibleToilet', 'needBabyChanging', 'needRestPlaces']

export function NeedsDialog({ needs, onChange, onClose }: {
  needs: Needs | null
  onChange: (needs: Needs | null) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const preset = needs ? samePreset(needs) : null
  // The form edits a copy of the current needs; without any, it starts from the wheelchair preset
  const current = needs ?? normalizeNeeds(PRESETS.wheelchair)!

  const labels: Record<NumberKey, [string, (n: number) => string]> = {
    maxSteps: [t.needs.maxSteps, t.needs.stepsOption],
    maxKerbCm: [t.needs.maxKerb, t.needs.kerbOption],
    minWidthCm: [t.needs.minWidth, t.needs.widthOption],
    maxSlopePct: [t.needs.maxSlope, t.needs.slopeOption],
    walkingSpeedKmh: [t.needs.speed, t.needs.speedOption],
  }
  const setNumber = (key: NumberKey) => (e: ChangeEvent<HTMLSelectElement>) => onChange({ ...current, [key]: Number(e.target.value) })
  const setFlag = (key: FlagKey) => (e: ChangeEvent<HTMLInputElement>) => onChange({ ...current, [key]: e.target.checked })

  return (
    <Dialog title={t.needs.title} onClose={onClose}>
      <div className="needs-dialog">
        <div className="segmented" role="group" aria-label={t.needs.title}>
          {PRESET_ORDER.map((id) => {
            const Icon = PRESET_ICON[id]
            return (
              <button
                key={id}
                type="button"
                className={preset === id ? 'segment active' : 'segment'}
                aria-pressed={preset === id}
                onClick={() => onChange({ ...PRESETS[id] })}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{t.needs.presets[id]}</span>
              </button>
            )
          })}
        </div>
        <div className="form-grid">
          {(Object.keys(OPTIONS) as NumberKey[]).map((key) => {
            const [label, format] = labels[key]
            const value = current[key]
            const options = OPTIONS[key].includes(value) ? OPTIONS[key] : [...OPTIONS[key], value].sort((a, b) => a - b)
            return (
              <label key={key} className="field">
                <span>{label}</span>
                <select value={value} onChange={setNumber(key)}>
                  {options.map((n) => (
                    <option key={n} value={n}>
                      {format(n)}
                    </option>
                  ))}
                </select>
              </label>
            )
          })}
        </div>
        <div className="checks">
          {FLAGS.map((key) => (
            <label key={key} className="check">
              <input type="checkbox" checked={current[key]} onChange={setFlag(key)} />
              <span>{t.needs[key]}</span>
            </label>
          ))}
        </div>
        <p className="muted small">{t.needs.privacy}</p>
        <div className="form-actions">
          {needs && (
            <button type="button" className="btn ghost" onClick={() => onChange(null)}>
              {t.needs.reset}
            </button>
          )}
          <button type="button" className="btn primary" onClick={onClose}>
            {t.needs.done}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
