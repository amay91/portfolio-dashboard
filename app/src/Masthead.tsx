import { firstName, fmtDate } from './format'
import { HoverButton } from './ui/HoverLift'
import { InfoTip } from './ui/InfoTip'
import type { Portfolio } from './engine/types'

// The Command Deck's masthead: personalised title (first name only, from the
// CAS header — see parsing/cas/investor.ts — full name isn't shown, for
// privacy), as-of line, and a Save as PNG button (top-right, above the
// Insight tile — see CommandDeck.tsx for the actual capture logic; this
// component just renders the trigger). Refresh moved into the upload bar
// (tasks.md U4, 2026-07-05) so it sits alongside the other data-source
// actions. Rendered only once a portfolio has loaded (App.tsx shows
// EmptyState before that) — see tasks.md §U for the locked "Command Deck"
// design this implements.
export function Masthead({
  pf,
  investorName,
  isSample,
  onSaveAsPng,
  savingPng,
}: {
  pf: Portfolio
  investorName: string | null
  isSample: boolean
  onSaveAsPng: () => void
  savingPng: boolean
}) {
  const first = firstName(investorName)
  const title = first ? `${first}'s Portfolio Summary` : isSample ? 'Sample Portfolio Summary' : 'Your Portfolio Summary'
  const asOfLabel = pf.live && pf.liveMatched > 0 ? 'Live NAV' : 'Statement values'

  return (
    <>
      <div className="deck-mast">
        <p className="deck-mast-title">{title}</p>
        <span className="deck-mast-meta">
          As of {fmtDate(pf.liveAsOf || pf.valDate)} &middot; {asOfLabel}
        </span>
        {/* Discoverability pointer to the Help menu (top-right) — a first-time
            visitor may not realise Instructions / Reading the Dashboard / etc.
            live in there. 'help' glyph (a "?") to distinguish it from the ⓘ
            metric explainers; align="left" so its hover popover opens rightward
            into the frame from this left-of-centre spot. */}
        <InfoTip
          glyph="help"
          align="left"
          label="Where to find help and guides"
          text="New here? The Help menu (top-right) has step-by-step Instructions, a guide to Reading the Dashboard, Privacy & Data details, and FAQs."
        />
        <div className="deck-mast-space" />
        {/* deck-mast-pngbtn is excluded from the PNG capture itself (CommandDeck.tsx's `filter`) — otherwise the button would appear inside its own screenshot. */}
        <HoverButton className={`deck-btn deck-mast-pngbtn${savingPng ? ' spin' : ''}`} onClick={onSaveAsPng} disabled={savingPng} aria-label="Save portfolio summary as PNG">
          <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
            <path d="M12 4v11m0 0-4-4m4 4 4-4" />
            <path d="M5 18v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1" />
          </svg>
          {savingPng ? 'Saving…' : 'Save as PNG'}
        </HoverButton>
      </div>
      {/* Explicit in-content callout, not just the masthead title (review
          item A5) — a first-time visitor scrolling straight to the numbers
          could easily miss "Sample Portfolio Summary" as the only signal
          this isn't their real data. */}
      {isSample && (
        <p className="deck-sample-note">
          This is example data so you can see how the dashboard works. Drop your own CAMS / KFintech statement in the box above to see your real numbers.
        </p>
      )}
    </>
  )
}
