import { ALargeSmall, ArrowLeft, Menu, Route, Search, X } from 'lucide-react'
import { useI18n } from '../i18n/context'

export function SearchBar({ query, onQuery, onFocus, onBack, onMenu, onVision, onDirections }: {
  query: string
  onQuery: (q: string) => void
  onFocus?: () => void
  onBack?: () => void
  onMenu?: () => void
  /** Desktop only: on a phone the vision button is on the map, next to the map credits. */
  onVision?: () => void
  onDirections: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="search-bar glass" role="search">
      {onBack ? (
        <button type="button" className="icon-btn" onClick={onBack} aria-label={t.search.back}>
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      ) : onMenu ? (
        <button type="button" className="icon-btn" onClick={onMenu} aria-label={t.menu.open} aria-haspopup="dialog">
          <Menu size={20} aria-hidden="true" />
        </button>
      ) : (
        <span className="search-icon" aria-hidden="true">
          <Search size={20} />
        </span>
      )}
      <label htmlFor="search-input" className="visually-hidden">
        {t.search.label}
      </label>
      <input
        id="search-input"
        type="search"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onFocus={onFocus}
        placeholder={t.search.placeholder}
        autoComplete="off"
        enterKeyHint="search"
      />
      {query && (
        <button type="button" className="icon-btn" onClick={() => onQuery('')} aria-label={t.search.clear}>
          <X size={18} aria-hidden="true" />
        </button>
      )}
      <span className="search-divider" aria-hidden="true" />
      {onVision && (
        <button type="button" className="icon-btn" onClick={onVision} aria-label={t.vision.open} title={t.vision.open} aria-haspopup="dialog">
          <ALargeSmall size={24} aria-hidden="true" />
        </button>
      )}
      <button type="button" className="icon-btn accent" onClick={onDirections} aria-label={t.search.directions} title={t.search.directions}>
        <Route size={20} aria-hidden="true" />
      </button>
    </div>
  )
}
