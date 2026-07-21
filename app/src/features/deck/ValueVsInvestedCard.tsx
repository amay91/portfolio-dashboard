import { InvestedChart } from '../../charts/InvestedChart'
import { investedGeometry } from '../../charts/invested'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

// The deck's centre chart card. Renders the same interactive InvestedChart
// used by gallery slide 1 (task U2a) — recolored for free via the app-wide
// dark tokens (--green/--teal/etc. in ui/tokens.css), no `.deck`-scoping
// needed.
export function ValueVsInvestedCard({ pf }: { pf: Portfolio }) {
  const hasChart = pf.series != null && investedGeometry(pf.series) != null

  return (
    // id targeted by Reading the Dashboard's spotlight (ui/Spotlight.tsx).
    <HoverDiv className="deck-card" id="deck-vvsi-card">
      <div className="deck-charthead">
        <p className="deck-sec">Value vs Invested</p>
      </div>
      {hasChart ? (
        <div className="deck-chart-svg">
          <InvestedChart series={pf.series!} latest={{ value: pf.totalValue, cost: pf.totalCost }} />
        </div>
      ) : (
        <p className="deck-empty">Not enough transaction history yet to chart value over time.</p>
      )}
    </HoverDiv>
  )
}
