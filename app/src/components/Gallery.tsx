import { useEffect } from 'react'
import { ChevronLeft, ChevronRight, ImagePlus } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'
import type { GalleryItem } from './galleryItems'

export function PhotoStrip({ items, onOpen, onAdd }: { items: GalleryItem[]; onOpen: (index: number) => void; onAdd: () => void }) {
  const { t } = useI18n()
  if (items.length === 0) {
    return (
      <div className="photo-empty">
        <p>{t.photos.empty}</p>
        <button type="button" className="btn glass-btn" onClick={onAdd}>
          <ImagePlus size={18} aria-hidden="true" /> {t.photos.add}
        </button>
      </div>
    )
  }
  return (
    <ul className="photo-strip">
      {items.map((item, i) => (
        <li key={item.key}>
          <button type="button" onClick={() => onOpen(i)} aria-label={t.photos.open(i + 1)}>
            <img src={item.thumb} alt={item.alt} loading="lazy" decoding="async" />
            {item.pending && <span className="photo-badge">{t.photos.waiting}</span>}
          </button>
        </li>
      ))}
      <li>
        <button type="button" className="photo-add" onClick={onAdd}>
          <ImagePlus size={22} aria-hidden="true" />
          <span>{t.photos.add}</span>
        </button>
      </li>
    </ul>
  )
}

export function PhotoGrid({ items, onOpen }: { items: GalleryItem[]; onOpen: (index: number) => void }) {
  const { t } = useI18n()
  return (
    <ul className="photo-grid">
      {items.map((item, i) => (
        <li key={item.key}>
          <button type="button" onClick={() => onOpen(i)} aria-label={t.photos.open(i + 1)}>
            <img src={item.thumb} alt={item.alt} loading="lazy" decoding="async" />
            {item.pending && <span className="photo-badge">{t.photos.waiting}</span>}
          </button>
          {(item.description || item.credit) && <p className="photo-caption">{item.description ?? item.credit}</p>}
        </li>
      ))}
    </ul>
  )
}

export function Lightbox({ items, index, onIndex, onClose }: {
  items: GalleryItem[]
  index: number
  onIndex: (index: number) => void
  onClose: () => void
}) {
  const { t } = useI18n()
  const item = items[index]
  const prev = () => onIndex((index - 1 + items.length) % items.length)
  const next = () => onIndex((index + 1) % items.length)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') onIndex((index - 1 + items.length) % items.length)
      if (e.key === 'ArrowRight') onIndex((index + 1) % items.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onIndex])

  if (!item) return null
  return (
    <Dialog title={`${index + 1} / ${items.length}`} onClose={onClose} variant="lightbox">
      <figure className="lightbox">
        <img src={item.src} alt={item.alt} />
        <figcaption>
          {item.pending && <span className="photo-badge static">{t.photos.waiting}</span>}
          {item.description && <span>{item.description}</span>}
          {item.credit &&
            (item.creditUrl ? (
              <a href={item.creditUrl} target="_blank" rel="noreferrer">
                {item.credit}
              </a>
            ) : (
              <span>{item.credit}</span>
            ))}
        </figcaption>
        {items.length > 1 && (
          <div className="lightbox-nav">
            <button type="button" className="icon-btn glass" onClick={prev} aria-label={t.photos.prev}>
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <button type="button" className="icon-btn glass" onClick={next} aria-label={t.photos.next}>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          </div>
        )}
      </figure>
    </Dialog>
  )
}
