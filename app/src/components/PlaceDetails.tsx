import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { Building2, Check, Clock, Globe, ImagePlus, MapPin, MessageSquarePlus, Navigation, Pencil, Phone, Share2, TriangleAlert } from 'lucide-react'
import { ASPECT_ORDER, SEVERITY_ORDER, type Evaluation } from '../core/evaluate'
import { getSource } from '../core/sources'
import type { AlertReport, Needs, Place } from '../core/types'
import { experienceCounts, photoFacts } from '../community/summary'
import { useCommunity } from '../community/useCommunity'
import { placeName, placeSubName } from '../format'
import { useI18n } from '../i18n/context'
import { placeSpeech } from '../speechText'
import { findingText, keyFinding } from '../text'
import { SampleTag, VerdictBadge } from './Badges'
import { Lightbox, PhotoGrid, PhotoStrip } from './Gallery'
import { galleryItems, useLightbox } from './galleryItems'
import { ReliabilityIcon } from './Icons'
import { PhotoUploadDialog } from './PhotoUploadDialog'
import { AllData, EntranceSection, FindingRow, PhotoFactsBox } from './PlaceSections'
import { ReadAloud } from './ReadAloud'
import { Reviews } from './Reviews'

export type ReportMode = 'change' | 'temporary'

type Tab = 'overview' | 'photos' | 'reviews' | 'info'
const TABS: Tab[] = ['overview', 'photos', 'reviews', 'info']

type Props = {
  place: Place
  needs: Needs | null
  evaluation: Evaluation | null
  confirmations: string[]
  now: Date
  justConfirmed: boolean
  /** Desktop shows the photos above the name; on phones the name comes first, as the sheet opens low. */
  heroFirst: boolean
  onConfirm: () => void
  onReport: (mode: ReportMode) => void
  onConfirmAlert: (alert: AlertReport) => void
  onRouteTo: () => void
  onShare: () => void
  onDeclare: () => void
}

/** Place page in the style of map apps: photos, rating with the reason, actions and sections. */
export function PlaceDetails(props: Props) {
  const { place, needs, evaluation, confirmations, now, justConfirmed, heroFirst } = props
  const { t, lang, formatDate } = useI18n()
  const community = useCommunity(place, lang)
  const [tab, setTab] = useState<Tab>('overview')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [focusReview, setFocusReview] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({})

  // Keyboard and screen reader users land on the new content
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [place.id])

  const name = placeName(place, lang) || t.categories[place.category]
  const subName = placeSubName(place, lang)
  const verdict = needs && evaluation ? evaluation.verdict : null
  const key = needs && evaluation ? keyFinding(evaluation) : null
  const sample = getSource(place.origin).sample
  const items = galleryItems(community.external, community.photos, name, { by: t.photos.by, aiSaw: t.photos.aiSaw })
  const lightbox = useLightbox(items.length)
  const visibleComments = community.comments.filter((c) => c.moderation.status !== 'rejected')
  const counts = experienceCounts(visibleComments)
  const experience = t.reviews.summary(counts.ok, counts.partial, counts.barrier)
  const aiFacts = photoFacts(community.photos)

  const findings = evaluation
    ? [...evaluation.findings].sort(
        (a, b) =>
          SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity) ||
          ASPECT_ORDER.indexOf(a.aspect) - ASPECT_ORDER.indexOf(b.aspect),
      )
    : []

  const tabLabel: Record<Tab, string> = {
    overview: t.detail.overview,
    photos: items.length ? `${t.detail.photos} (${items.length})` : t.detail.photos,
    reviews: visibleComments.length ? `${t.detail.reviews} (${visibleComments.length})` : t.detail.reviews,
    info: t.detail.info,
  }

  const selectTab = (next: Tab, focus = false) => {
    setTab(next)
    if (focus) tabRefs.current[next]?.focus()
  }

  // Arrow keys move between tabs (WAI-ARIA tabs pattern, automatic activation)
  const onTabKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const index = TABS.indexOf(tab)
    const next =
      e.key === 'ArrowRight' ? TABS[(index + 1) % TABS.length]
      : e.key === 'ArrowLeft' ? TABS[(index - 1 + TABS.length) % TABS.length]
      : e.key === 'Home' ? TABS[0]
      : e.key === 'End' ? TABS[TABS.length - 1]
      : null
    if (!next) return
    e.preventDefault()
    selectTab(next, true)
  }

  const hero = (
    <div className="place-hero">
      {community.loading ? (
        <div className="photo-skeleton" aria-hidden="true" />
      ) : (
        <PhotoStrip items={items} onOpen={lightbox.setOpen} onAdd={() => setUploadOpen(true)} />
      )}
    </div>
  )
  const hasInfo = Boolean(place.address || place.openingHours || place.contact?.website || place.contact?.phone)

  return (
    <article className="place" aria-labelledby="place-title">
      {heroFirst && hero}

      <header className="place-head">
        <h2 id="place-title" tabIndex={-1} ref={headingRef}>
          {name}
        </h2>
        {subName && (
          <p className="sub-name" lang={lang === 'en' ? 'pl' : 'en'}>
            {subName}
          </p>
        )}
        <p className="muted">
          {t.categories[place.category]}
          {place.address ? ` · ${place.address}` : ''}
        </p>
        <p className="place-verdict">
          <VerdictBadge verdict={verdict} size="small" />
          <span>{key ? findingText(key, t) : t.verdictHelp[verdict ?? 'none']}</span>
        </p>
        <ReadAloud lines={placeSpeech(place, needs ? evaluation : null, t, lang)} readKey={place.id} />
        {experience && (
          <p className="muted small">
            {t.reviews.question} {experience}
          </p>
        )}
        {sample && (
          <p className="sample-note">
            <SampleTag /> {t.sampleLong}
          </p>
        )}
      </header>

      <div className="action-row">
        <button type="button" className="action primary-action" onClick={props.onRouteTo}>
          <span className="action-icon" aria-hidden="true">
            <Navigation size={20} />
          </span>
          <span>{t.actions.route}</span>
        </button>
        <button type="button" className="action" onClick={() => setUploadOpen(true)} aria-haspopup="dialog">
          <span className="action-icon" aria-hidden="true">
            <ImagePlus size={20} />
          </span>
          <span>{t.actions.photo}</span>
        </button>
        <button
          type="button"
          className="action"
          onClick={() => {
            setFocusReview(true)
            selectTab('reviews')
          }}
        >
          <span className="action-icon" aria-hidden="true">
            <MessageSquarePlus size={20} />
          </span>
          <span>{t.actions.review}</span>
        </button>
        <button type="button" className="action" onClick={props.onShare} aria-haspopup="dialog">
          <span className="action-icon" aria-hidden="true">
            <Share2 size={20} />
          </span>
          <span>{t.actions.share}</span>
        </button>
      </div>

      {!heroFirst && hero}

      <div className="detail-tabs" role="tablist" aria-label={t.detail.tabs} onKeyDown={onTabKey}>
        {TABS.map((id) => (
          <button
            key={id}
            ref={(el) => {
              tabRefs.current[id] = el
            }}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            className={tab === id ? 'detail-tab active' : 'detail-tab'}
            onClick={() => selectTab(id)}
          >
            {tabLabel[id]}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="tab-panel">
        {tab === 'overview' && (
          <>
            <section className={`verdict-box verdict-${verdict ?? 'none'}`} aria-live="polite">
              <VerdictBadge verdict={verdict} />
              <p>{needs ? t.verdictHelp[verdict ?? 'none'] : t.card.noNeeds}</p>
              {evaluation && needs && (
                <ul className="verdict-facts">
                  {evaluation.weakest && (
                    <li>
                      {t.basedOn}: <ReliabilityIcon reliability={evaluation.weakest} /> {t.reliability[evaluation.weakest]}
                    </li>
                  )}
                  {evaluation.missing > 0 && <li>{t.card.missing(evaluation.missing)}</li>}
                  {evaluation.conflicts > 0 && <li>{t.card.conflicts(evaluation.conflicts)}</li>}
                  {evaluation.stale && <li>{t.card.staleWarning}</li>}
                  {evaluation.usesSample && <li>{t.sampleLong}</li>}
                </ul>
              )}
            </section>

            {needs && evaluation && (
              <section aria-labelledby="findings-title" className="detail-section">
                <h3 id="findings-title">{t.card.findings}</h3>
                <ul className="findings">
                  {findings.map((f, i) => (
                    <FindingRow key={i} finding={f} now={now} onConfirmAlert={props.onConfirmAlert} />
                  ))}
                </ul>
              </section>
            )}

            {aiFacts && <PhotoFactsBox {...aiFacts} />}

            {place.category !== 'stop' && <EntranceSection place={place} now={now} />}

            {visibleComments[0] && (
              <section aria-labelledby="latest-review-title" className="detail-section">
                <h3 id="latest-review-title">{t.detail.reviews}</h3>
                <blockquote className="review-preview">
                  <p>{visibleComments[0].text}</p>
                  <footer className="muted small">
                    {visibleComments[0].nick || t.reviews.anonymous} · {formatDate(visibleComments[0].createdAt)}
                  </footer>
                </blockquote>
                <button type="button" className="btn ghost" onClick={() => selectTab('reviews', true)}>
                  {t.detail.allReviews(visibleComments.length)}
                </button>
              </section>
            )}

            <section aria-labelledby="actions-title" className="detail-section card-actions">
              <h3 id="actions-title">{t.card.actions}</h3>
              {confirmations.length > 0 && (
                <p className="muted small">
                  {t.card.userConfirmations(confirmations.length, formatDate(confirmations[confirmations.length - 1]))}
                </p>
              )}
              <div className="button-row">
                <button type="button" className="btn" onClick={props.onConfirm} disabled={justConfirmed}>
                  <Check size={16} aria-hidden="true" /> {t.card.confirm}
                </button>
                <button type="button" className="btn" onClick={() => props.onReport('change')}>
                  <Pencil size={16} aria-hidden="true" /> {t.card.reportChange}
                </button>
                <button type="button" className="btn" onClick={() => props.onReport('temporary')}>
                  <TriangleAlert size={16} aria-hidden="true" /> {t.card.reportTemporary}
                </button>
              </div>
              <p role="status" className="success">
                {justConfirmed ? t.card.confirmed : ''}
              </p>
            </section>
          </>
        )}

        {tab === 'photos' && (
          <section className="detail-section" aria-label={t.detail.photos}>
            <button type="button" className="btn" onClick={() => setUploadOpen(true)} aria-haspopup="dialog">
              <ImagePlus size={16} aria-hidden="true" /> {t.photos.add}
            </button>
            {items.length > 0 ? <PhotoGrid items={items} onOpen={lightbox.setOpen} /> : <p className="empty">{t.photos.empty}</p>}
            <p className="muted small">{t.photos.rules}</p>
          </section>
        )}

        {tab === 'reviews' && (
          <Reviews comments={community.comments} backend={community.backend} onSubmit={community.comment} autoFocus={focusReview} />
        )}

        {tab === 'info' && (
          <>
            {hasInfo && (
              <ul className="info-list">
                {place.address && (
                  <li>
                    <MapPin size={18} aria-hidden="true" />
                    <span>
                      <span className="visually-hidden">{t.info.address}: </span>
                      {place.address}
                    </span>
                  </li>
                )}
                {place.openingHours && (
                  <li>
                    <Clock size={18} aria-hidden="true" />
                    <span>
                      <span className="visually-hidden">{t.info.hours}: </span>
                      {place.openingHours}
                    </span>
                  </li>
                )}
                {place.contact?.website && (
                  <li>
                    <Globe size={18} aria-hidden="true" />
                    <a href={place.contact.website} target="_blank" rel="noreferrer">
                      <span className="visually-hidden">{t.info.website}: </span>
                      {place.contact.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                    </a>
                  </li>
                )}
                {place.contact?.phone && (
                  <li>
                    <Phone size={18} aria-hidden="true" />
                    <a href={`tel:${place.contact.phone.replace(/[^\d+]/g, '')}`}>
                      <span className="visually-hidden">{t.info.phone}: </span>
                      {place.contact.phone}
                    </a>
                  </li>
                )}
              </ul>
            )}

            <section aria-labelledby="data-title" className="detail-section">
              <h3 id="data-title">{t.info.data}</h3>
              <AllData place={place} />
            </section>

            <section aria-labelledby="fix-title" className="detail-section">
              <h3 id="fix-title">{t.info.fix}</h3>
              <button type="button" className="btn" onClick={props.onDeclare} aria-haspopup="dialog">
                <Building2 size={16} aria-hidden="true" /> {t.owner.button}
              </button>
              {place.osm && (
                <p className="small">
                  <a href={`https://www.openstreetmap.org/edit?${place.osm.type}=${place.osm.id}`} target="_blank" rel="noreferrer">
                    {t.card.fixInOsm}
                  </a>{' '}
                  <span className="muted">– {t.card.fixInOsmHint}</span>
                </p>
              )}
            </section>
          </>
        )}
      </div>

      {lightbox.open !== null && (
        <Lightbox items={items} index={lightbox.open} onIndex={lightbox.setOpen} onClose={() => lightbox.setOpen(null)} />
      )}
      {uploadOpen && <PhotoUploadDialog placeName={name} onUpload={community.photo} onClose={() => setUploadOpen(false)} />}
    </article>
  )
}
