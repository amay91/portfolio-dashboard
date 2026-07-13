import { computeInsightFlags } from '../../engine/insightFlags'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

// A small, always-visible "worth a look" list (review item A2) — renders
// nothing when there's nothing to flag. Deliberately sits between the KPI
// row and the chart/holdings grid, needing no age/retirement input at all
// (unlike the concentration note buried inside collapsed Commentary — see
// tasks.md R3/R4), so a first-time visitor sees it without doing anything.
export function WorthALook({ pf, niftyAllTime }: { pf: Portfolio; niftyAllTime: number | null }) {
  const flags = computeInsightFlags(pf, niftyAllTime)
  if (!flags.length) return null

  return (
    <HoverDiv className="deck-card deck-worthalook">
      <p className="deck-sec deck-worthalook-head">
        <svg className="deck-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} aria-hidden="true">
          <path d="M12 9v4M12 16.5h.01M10.3 3.9 2.7 17.1a1.8 1.8 0 0 0 1.55 2.7h15.5a1.8 1.8 0 0 0 1.56-2.7L13.7 3.9a1.8 1.8 0 0 0-3.13 0Z" />
        </svg>
        Worth a Look
      </p>
      <ul className="deck-worthalook-list">
        {flags.map((f) => (
          <li key={f.id}>{f.text}</li>
        ))}
      </ul>
    </HoverDiv>
  )
}
