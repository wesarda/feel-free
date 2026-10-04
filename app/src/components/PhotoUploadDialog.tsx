import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Camera } from 'lucide-react'
import { CommunityError } from '../community/client'
import type { Photo } from '../community/types'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'

export function PhotoUploadDialog({ placeName, onUpload, onClose }: {
  placeName: string
  onUpload: (file: File, caption: string) => Promise<Photo>
  onClose: () => void
}) {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  // The preview is a temporary object URL: replaced when another file is chosen, released on close
  const previewRef = useRef<string | null>(null)
  useEffect(() => {
    previewRef.current = preview
  })
  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    },
    [],
  )
  const choose = (next: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(next)
    setPreview(next ? URL.createObjectURL(next) : null)
  }

  const reasonText = (reason?: string) => (reason && t.photos.reasons[reason]) || reason || ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const photo = await onUpload(file, caption.trim())
      const status = photo.moderation.status
      setResult(
        status === 'approved'
          ? { ok: true, text: t.photos.approved }
          : status === 'pending'
            ? { ok: true, text: t.photos.pending }
            : { ok: false, text: t.photos.rejected(reasonText(photo.moderation.reason)) },
      )
      if (status !== 'rejected') {
        choose(null)
        setCaption('')
      }
    } catch (error) {
      setResult({
        ok: false,
        text:
          error instanceof CommunityError && error.code === 'rate'
            ? t.reviews.rate
            : (error as Error).message === 'not-image'
              ? t.photos.notImage
              : t.photos.error,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog title={t.photos.add} onClose={onClose}>
      <form className="upload" onSubmit={submit}>
        <p className="muted">{placeName}</p>
        <label className={preview ? 'upload-drop has-file' : 'upload-drop'}>
          <input
            type="file"
            accept="image/*"
            className="visually-hidden"
            onChange={(e) => {
              setResult(null)
              choose(e.target.files?.[0] ?? null)
            }}
          />
          {preview && file ? (
            <img src={preview} alt={t.photos.chosen(file.name)} />
          ) : (
            <>
              <Camera size={28} aria-hidden="true" />
              <span>{t.photos.choose}</span>
            </>
          )}
        </label>
        <label className="field">
          <span>{t.photos.caption}</span>
          <input type="text" value={caption} maxLength={200} onChange={(e) => setCaption(e.target.value)} placeholder={t.photos.captionPlaceholder} />
        </label>
        <p className="muted small">{t.photos.rules}</p>
        <p role="status" className={result ? (result.ok ? 'notice ok' : 'notice bad') : 'visually-hidden'}>
          {result?.text}
        </p>
        <div className="form-actions">
          <button type="button" className="btn ghost" onClick={onClose}>
            {t.close}
          </button>
          <button type="submit" className="btn primary" disabled={!file || busy}>
            {busy ? t.photos.sending : t.photos.send}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
