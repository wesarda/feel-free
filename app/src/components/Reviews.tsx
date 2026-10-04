import { useEffect, useRef, useState, type FormEvent } from 'react'
import { CommunityError, type Backend } from '../community/client'
import { experienceCounts } from '../community/summary'
import { LIMITS, type Comment, type Experience } from '../community/types'
import { useI18n } from '../i18n/context'

const EXPERIENCES: Experience[] = ['ok', 'partial', 'barrier']

export function Reviews({ comments, backend, onSubmit, autoFocus }: {
  comments: Comment[]
  backend: Backend | null
  onSubmit: (text: string, nick: string, experience?: Experience) => Promise<Comment>
  /** Set when the person asked to write a review, so the form gets the focus. */
  autoFocus?: boolean
}) {
  const { t, formatDate } = useI18n()
  const textRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    if (autoFocus) textRef.current?.focus()
  }, [autoFocus])
  const [experience, setExperience] = useState<Experience | undefined>()
  const [text, setText] = useState('')
  const [nick, setNick] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  const reasonText = (reason?: string) => (reason && t.photos.reasons[reason]) || reason || ''

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (text.trim().length < LIMITS.commentMin) {
      setNotice({ ok: false, text: t.reviews.tooShort })
      return
    }
    setBusy(true)
    setNotice(null)
    try {
      const comment = await onSubmit(text.trim(), nick.trim(), experience)
      const status = comment.moderation.status
      setNotice(
        status === 'approved'
          ? { ok: true, text: t.reviews.published }
          : status === 'pending'
            ? { ok: true, text: t.reviews.pending }
            : { ok: false, text: t.reviews.rejected(reasonText(comment.moderation.reason)) },
      )
      if (status !== 'rejected') {
        setText('')
        setExperience(undefined)
      }
    } catch (error) {
      setNotice({ ok: false, text: error instanceof CommunityError && error.code === 'rate' ? t.reviews.rate : t.reviews.error })
    } finally {
      setBusy(false)
    }
  }

  const counts = experienceCounts(comments)
  const summary = t.reviews.summary(counts.ok, counts.partial, counts.barrier)

  return (
    <div className="reviews">
      {summary && (
        <p className="reviews-summary">
          {t.reviews.question} <strong>{summary}</strong>
        </p>
      )}

      <form className="review-form" onSubmit={submit}>
        <fieldset className="segmented-field">
          <legend>{t.reviews.question}</legend>
          <div className="segmented small">
            {EXPERIENCES.map((e) => (
              <button
                key={e}
                type="button"
                className={experience === e ? `segment active exp-${e}` : 'segment'}
                aria-pressed={experience === e}
                onClick={() => setExperience(experience === e ? undefined : e)}
              >
                {t.reviews.exp[e]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="field">
          <span>{t.reviews.text}</span>
          <textarea
            ref={textRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={LIMITS.commentMax}
            placeholder={t.reviews.placeholder}
          />
        </label>
        <label className="field">
          <span>{t.reviews.nick}</span>
          <input type="text" value={nick} maxLength={LIMITS.nickMax} onChange={(e) => setNick(e.target.value)} autoComplete="nickname" />
        </label>
        <p className="muted small">{backend?.mode === 'local' ? t.reviews.localMode : t.reviews.rules}</p>
        <p role="status" className={notice ? (notice.ok ? 'notice ok' : 'notice bad') : 'visually-hidden'}>
          {notice?.text}
        </p>
        <div className="form-actions">
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? t.reviews.publishing : t.reviews.publish}
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="empty">{t.reviews.empty}</p>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <li key={c.id} className="comment">
              <div className="comment-head">
                <strong>{c.nick || t.reviews.anonymous}</strong>
                <span className="muted small">{formatDate(c.createdAt)}</span>
                {c.experience && <span className={`exp-chip exp-${c.experience}`}>{t.reviews.exp[c.experience]}</span>}
              </div>
              <p>{c.text}</p>
              <span className={`mod-chip mod-${c.moderation.status}`}>
                {t.reviews.status[c.moderation.status]}
                {c.mine && c.moderation.status !== 'approved' ? ` · ${t.photos.yours}` : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
