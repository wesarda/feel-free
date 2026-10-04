import { ALargeSmall, Info, TriangleAlert } from 'lucide-react'
import { useI18n } from '../i18n/context'
import { Dialog } from './Dialog'

/** Side menu like in map apps: language, vision settings, reporting a problem on the map, about the data. */
export function MenuDrawer({ mapReports, onVision, onReportOnMap, onAbout, onClose }: {
  mapReports: number
  onVision: () => void
  onReportOnMap: () => void
  onAbout: () => void
  onClose: () => void
}) {
  const { t, lang, setLang } = useI18n()
  return (
    <Dialog title={t.appTitle} onClose={onClose} variant="drawer">
      <div className="menu">
        <p className="muted">{t.tagline}</p>
        <div className="menu-row">
          <span id="menu-lang">{t.language}</span>
          <div className="segmented small" role="group" aria-labelledby="menu-lang">
            {(['pl', 'en'] as const).map((l) => (
              <button
                key={l}
                type="button"
                lang={l}
                aria-pressed={lang === l}
                className={lang === l ? 'segment active' : 'segment'}
                onClick={() => setLang(l)}
              >
                {l === 'pl' ? 'Polski' : 'English'}
              </button>
            ))}
          </div>
        </div>
        <ul className="menu-list">
          <li>
            <button type="button" className="menu-item" onClick={onVision}>
              <ALargeSmall size={20} aria-hidden="true" />
              <span>{t.vision.open}</span>
            </button>
          </li>
          <li>
            <button type="button" className="menu-item" onClick={onReportOnMap}>
              <TriangleAlert size={20} aria-hidden="true" />
              <span>{t.places.reportBarrier}</span>
            </button>
          </li>
          <li>
            <button type="button" className="menu-item" onClick={onAbout}>
              <Info size={20} aria-hidden="true" />
              <span>{t.aboutData}</span>
            </button>
          </li>
        </ul>
        {mapReports > 0 && <p className="muted small">{t.report.mapReports(mapReports)}</p>}
        <div className="menu-footer muted small">
          <p>{t.footer.attribution}</p>
          <p>{t.footer.mapCredits}</p>
          <p>{t.footer.sample}</p>
          <p>{t.map.textAlternative}</p>
        </div>
      </div>
    </Dialog>
  )
}
