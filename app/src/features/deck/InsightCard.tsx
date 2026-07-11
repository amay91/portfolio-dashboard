import { buildInsight } from '../commentary/insight'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

// Now the 4th KPI tile (tasks.md §U revision, 2026-07-04) — was previously a
// standalone card under the Allocation section.
export function InsightCard({ pf, onOpenCommentary }: { pf: Portfolio; onOpenCommentary: () => void }) {
  return (
    <HoverDiv className="deck-tile deck-insight">
      <p className="deck-sec deck-insight-head">
        <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}>
          <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9c-.6.5-.9 1.3-.9 2.1H9.4c0-.8-.3-1.6-.9-2.1A6 6 0 0 1 12 3z" />
        </svg>
        Insight
      </p>
      <p className="deck-insight-text">{buildInsight(pf)}</p>
      <button className="deck-ilink" onClick={onOpenCommentary}>
        Full Commentary
        <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path d="M5 12h13M13 6l6 6-6 6" />
        </svg>
      </button>
    </HoverDiv>
  )
}
