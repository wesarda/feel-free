import { useState } from 'react'
import type { Place } from '../core/types'
import { placeName } from '../format'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'

function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      ;(document.getElementById(id) as HTMLTextAreaElement | null)?.select()
    }
  }
  return (
    <div className="copy-field">
      <label className="field" htmlFor={id}>
        <span>{label}</span>
      </label>
      <textarea id={id} readOnly value={value} rows={value.length > 90 ? 4 : 1} onFocus={(e) => e.target.select()} />
      <div className="button-row">
        <button type="button" className="btn small" onClick={copy}>
          {t.share.copy}
        </button>
        <span role="status" className="muted small">
          {copied ? t.share.copied : ''}
        </span>
      </div>
    </div>
  )
}

/** Link and embeddable card: the B2B entry point for hotels, organisers and venue owners. */
export function ShareDialog({ place, preset, onClose }: { place: Place; preset: string | null; onClose: () => void }) {
  const { t, lang } = useI18n()
  const base = `${window.location.origin}${window.location.pathname}`
  const link = `${base}?place=${encodeURIComponent(place.id)}`
  const embedUrl = `${base}?embed=${encodeURIComponent(place.id)}${preset ? `&needs=${preset}` : ''}&lang=${lang}`
  const name = placeName(place, lang) || t.categories[place.category]
  const snippet = `<iframe src="${embedUrl}" title="${t.share.frameTitle(name).replace(/"/g, '&quot;')}" width="100%" height="460" style="border:0;max-width:480px" loading="lazy"></iframe>`
  return (
    <Dialog title={t.share.title} onClose={onClose}>
      <div className="share">
        <CopyField id="share-link" label={t.share.link} value={link} />
        <h3>{t.share.embed}</h3>
        <p className="muted small">{t.share.embedHelp}</p>
        <CopyField id="share-embed" label={t.share.code} value={snippet} />
        <a href={embedUrl} target="_blank" rel="noreferrer">
          {t.share.preview} ↗
        </a>
      </div>
    </Dialog>
  )
}
