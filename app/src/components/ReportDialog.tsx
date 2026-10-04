import { useState, type FormEvent } from 'react'
import type { AlertType, FactKey, FactValues, LngLat, Place } from '../core/types'
import { CORRECTABLE, MAP_ALERT_TYPES, PLACE_ALERT_TYPES } from '../data/reports'
import { formatValue, placeName } from '../format'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'

export type ReportTarget =
  | { mode: 'change'; place: Place }
  | { mode: 'temporary'; place: Place }
  | { mode: 'map'; coords: LngLat }

export type ReportResult =
  | { kind: 'alert'; alertType: AlertType; comment: string }
  | { kind: 'correction'; factKey: FactKey; value: FactValues[FactKey]; comment: string }

export function ReportDialog({ target, onSave, onClose }: {
  target: ReportTarget
  onSave: (result: ReportResult) => void
  onClose: () => void
}) {
  const { t, lang } = useI18n()
  const alertTypes = target.mode === 'map' ? MAP_ALERT_TYPES : PLACE_ALERT_TYPES
  const [alertType, setAlertType] = useState<AlertType>(alertTypes[0])
  const [factIndex, setFactIndex] = useState(0)
  const [valueIndex, setValueIndex] = useState(0)
  const [comment, setComment] = useState('')

  const title =
    target.mode === 'change' ? t.report.titleChange : target.mode === 'temporary' ? t.report.titleTemporary : t.report.titleMap
  const correctable = CORRECTABLE[factIndex]

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const text = comment.trim().slice(0, 500)
    if (target.mode === 'change') {
      onSave({ kind: 'correction', factKey: correctable.key, value: correctable.options[valueIndex], comment: text })
    } else {
      onSave({ kind: 'alert', alertType, comment: text })
    }
  }

  return (
    <Dialog title={title} onClose={onClose}>
      <form className="report-form" onSubmit={submit}>
        {target.mode !== 'map' && <p className="muted">{placeName(target.place, lang)}</p>}

        {target.mode === 'change' ? (
          <>
            <label className="field">
              <span>{t.report.whatIsWrong}</span>
              <select
                value={factIndex}
                onChange={(e) => {
                  setFactIndex(Number(e.target.value))
                  setValueIndex(0)
                }}
              >
                {CORRECTABLE.map((c, i) => (
                  <option key={c.key} value={i}>
                    {t.facts[c.key]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>{t.report.correctValue}</span>
              <select value={valueIndex} onChange={(e) => setValueIndex(Number(e.target.value))}>
                {correctable.options.map((option, i) => (
                  <option key={String(option)} value={i}>
                    {formatValue(correctable.key, option as never, t)}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <label className="field">
            <span>{t.report.problem}</span>
            <select value={alertType} onChange={(e) => setAlertType(e.target.value as AlertType)}>
              {alertTypes.map((type) => (
                <option key={type} value={type}>
                  {t.alertTypes[type]}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          <span>{t.report.details}</span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={t.report.detailsPlaceholder}
          />
        </label>
        <p className="muted small">{t.report.privacy}</p>
        <p className="muted small">{t.report.prototypeNote}</p>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t.cancel}
          </button>
          <button type="submit" className="btn primary">
            {t.report.send}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
