import { Masthead } from '../../Masthead'
import { AllocationSection } from '../allocation/AllocationSection'
import { KpiRail } from './KpiRail'
import { TopHoldings } from './TopHoldings'
import { ValueVsInvestedCard } from './ValueVsInvestedCard'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

// The lean "Command Deck": masthead + KPI row (Total Value/Invested, Total
// Gain/ST-LT Split, XIRR vs Nifty 50, Insight) + a 2-column grid (chart + top
// holdings stacked on the left; Allocation alone, sized to match their
// combined height, on the right). This is the whole of the default view —
// see tasks.md §U for the locked design. The old "Show Advanced" launcher
// row has moved out to its own always-visible PortfolioAnalysis component.
export function CommandDeck({
  pf,
  investorName,
  isSample,
  niftyAllTime,
  nifty1Y,
  onOpenCommentary,
}: {
  pf: Portfolio
  investorName: string | null
  isSample: boolean
  niftyAllTime: number | null
  nifty1Y: number | null
  onOpenCommentary: () => void
}) {
  return (
    <div className="deck">
      <div className="deck-frame">
        <Masthead pf={pf} investorName={investorName} isSample={isSample} />
        <KpiRail pf={pf} niftyAllTime={niftyAllTime} nifty1Y={nifty1Y} onOpenCommentary={onOpenCommentary} />
        <div className="deck-grid-2col">
          <div className="deck-col deck-col-chart">
            <ValueVsInvestedCard pf={pf} />
            <TopHoldings pf={pf} />
          </div>
          <div className="deck-col deck-col-alloc">
            <HoverDiv className="deck-card deck-alloc-card">
              <p className="deck-sec deck-alloc-head">Allocation</p>
              <AllocationSection pf={pf} />
            </HoverDiv>
          </div>
        </div>
      </div>
    </div>
  )
}
