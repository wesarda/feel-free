import { useState, type FormEvent } from 'react'
import { resolve } from '../core/facts'
import type { FactKey, FactValues, Place } from '../core/types'
import { formatValue, placeName } from '../format'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'

/** What an owner can declare, with the values offered. Booleans are yes/no. */
const FIELDS: { key: FactKey; options: FactValues[FactKey][] }[] = [
  { key: 'entranceSteps', options: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12] },
  { key: 'stepHeightCm', options: [5, 10, 12, 15, 17, 20] },
  { key: 'ramp', options: [true, false] },
  { key: 'rampSlopePct', options: [4, 5, 6, 7, 8, 10, 12, 15] },
  { key: 'platformLift', options: [true, false] },
  { key: 'thresholdCm', options: [0, 1, 2, 3, 5, 8] },
  { key: 'doorWidthCm', options: [70, 75, 80, 85, 90, 100, 120, 150, 200] },
  { key: 'automaticDoor', options: [true, false] },
  { key: 'floors', options: [1, 2, 3, 4, 5, 6] },
  { key: 'elevator', options: [true, false] },
  { key: 'accessibleToilet', options: [true, false] },
  { key: 'babyChanging', options: [true, false] },
  { key: 'seating', options: [true, false] },
  { key: 'disabledParking', options: [true, false] },
]

export function OwnerDialog({ place, now, onSave, onClose }: {
  place: Place
  now: Date
  onSave: (values: Partial<FactValues>, comment: string) => void
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  // Start from what we already know, so the owner mostly confirms or corrects
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const { key, options } of FIELDS) {
      const best = resolve(place.facts, key, now).best?.value
      const index = options.findIndex((o) => o === best)
      initial[key] = index >= 0 ? String(index) : ''
    }
    return initial
  })
  const [comment, setComment] = useState('')
  const [attested, setAttested] = useState(false)

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const declared: Partial<FactValues> = {}
    for (const { key, options } of FIELDS) {
      if (values[key] !== '') (declared as Record<string, unknown>)[key] = options[Number(values[key])]
    }
    onSave(declared, comment.trim().slice(0, 500))
  }

  return (
    <Dialog title={t.owner.title} onClose={onClose} wide>
      <form className="report-form owner-form" onSubmit={submit}>
        <p>
          <strong>{placeName(place, lang) || t.categories[place.category]}</strong>
        </p>
        <p className="muted">{t.owner.intro}</p>
        <div className="owner-grid">
          {FIELDS.map(({ key, options }) => (
            <label key={key} className="field">
              <span>{t.facts[key]}</span>
              <select value={values[key]} onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}>
                <option value="">{t.owner.unknown}</option>
                {options.map((option, i) => (
                  <option key={String(option)} value={i}>
                    {formatValue(key, option as never, t)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <label className="field">
          <span>{t.report.details}</span>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={2} maxLength={500} placeholder={t.owner.commentPlaceholder} />
        </label>
        <label className="check">
          <input type="checkbox" checked={attested} onChange={(e) => setAttested(e.target.checked)} required />
          <span>{t.owner.attest}</span>
        </label>
        <p className="muted small">{t.owner.note}</p>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn primary" disabled={!attested}>
            {t.owner.save}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
