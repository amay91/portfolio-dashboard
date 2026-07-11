import { firstName, fmtDate } from './format'
import type { Portfolio } from './engine/types'

// The Command Deck's masthead: personalised title (first name only, from the
// CAS header — see parsing/cas/investor.ts — full name isn't shown, for
// privacy) and as-of line. Refresh moved into the upload bar (tasks.md U4,
// 2026-07-05) so it sits alongside the other data-source actions. Rendered
// only once a portfolio has loaded (App.tsx shows EmptyState before that) —
// see tasks.md §U for the locked "Command Deck" design this implements.
export function Masthead({ pf, investorName, isSample }: { pf: Portfolio; investorName: string | null; isSample: boolean }) {
  const first = firstName(investorName)
  const title = first ? `${first}'s Portfolio Summary` : isSample ? 'Sample Portfolio Summary' : 'Your Portfolio Summary'
  const asOfLabel = pf.live && pf.liveMatched > 0 ? 'Live NAV' : 'Statement values'

  return (
    <div className="deck-mast">
      <p className="deck-mast-title">{title}</p>
      <span className="deck-mast-meta">
        As of {fmtDate(pf.liveAsOf || pf.valDate)} &middot; {asOfLabel}
      </span>
    </div>
  )
}
