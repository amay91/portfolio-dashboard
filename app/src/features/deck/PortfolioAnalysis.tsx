import { firstName } from '../../format'
import { ADVANCED_TILES } from './advancedTiles'
import type { SectionId } from './advancedTiles'
import { HoverButton } from '../../ui/HoverLift'

// Permanent "«Name»'s Portfolio Analysis" header + 6 section buttons —
// replaces the old single "Show Advanced" toggle (tasks.md §U revision,
// 2026-07-04). By default this behaves as an accordion: selecting a section
// closes whatever else was open (`openSections`/`onSelect`, owned by App.tsx
// so DataCheck's "Details Shown in Data Sources" link can jump straight to
// Data Sources too). "View All" opens every section at once for anyone who
// wants the full page in one go. An open button flips to a white
// background / black text.
export function PortfolioAnalysis({
  investorName,
  openSections,
  onSelect,
  onViewAll,
}: {
  investorName: string | null
  openSections: Partial<Record<SectionId, boolean>>
  onSelect: (id: SectionId) => void
  onViewAll: () => void
}) {
  const first = firstName(investorName)
  const title = first ? `${first}'s Portfolio Analysis` : 'Your Portfolio Analysis'

  return (
    <div className="deck">
      {/* id targeted by Reading the Dashboard's spotlight (ui/Spotlight.tsx) —
          the always-visible button row itself, since the 6 sections it opens
          aren't in the DOM until expanded. */}
      <div className="deck-frame deck-frame-compact" id="portfolio-analysis">
        <div className="pa-header">
          <p className="deck-mast-title">{title}</p>
          <span className="deck-mast-space" />
          <button className="deck-btn" onClick={onViewAll}>
            View All
          </button>
        </div>
        <div className="deck-adv-tiles deck-adv-tiles-standalone" role="group" aria-label="Portfolio analysis sections">
          {ADVANCED_TILES.map((t) => {
            const open = !!openSections[t.id]
            return (
              <HoverButton key={t.id} className={`deck-advt${open ? ' deck-advt-open' : ''}`} aria-expanded={open} aria-controls={t.id} onClick={() => onSelect(t.id)}>
                <svg className="deck-advt-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
                  <path d={t.iconPath} />
                </svg>
                {t.label}
              </HoverButton>
            )
          })}
        </div>
      </div>
    </div>
  )
}
