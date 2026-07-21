import { inr, pct, shortSchemeName } from '../../format'
import { HoverDiv } from '../../ui/HoverLift'
import { InfoTip } from '../../ui/InfoTip'
import { EXPLAIN } from '../../ui/explainers'
import type { Portfolio } from '../../engine/types'

// Top-5 active holdings by market value, for the lean view. The full
// sortable table (every column, every holding) lives behind Portfolio
// Analysis — see tasks.md U2.
export function TopHoldings({ pf }: { pf: Portfolio }) {
  const top = pf.funds
    .filter((f) => f.active)
    .slice()
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 5)

  if (!top.length) return null

  return (
    // id targeted by Reading the Dashboard's spotlight (ui/Spotlight.tsx).
    <HoverDiv className="deck-card deck-holdings" id="deck-top-holdings">
      <table className="deck-tbl">
        <thead>
          <tr>
            <th>Holding</th>
            <th className="deck-rt deck-rt-value">Value</th>
            <th className="deck-rt deck-rt-gain">Total Gain</th>
            <th className="deck-rt deck-rt-cagr">
              CAGR
              <InfoTip text={EXPLAIN.cagr} label="What does CAGR mean?" align="right" />
            </th>
          </tr>
        </thead>
        <tbody>
          {top.map((f) => (
            // folio, not just isin/name: the same scheme can legitimately
            // be held across multiple folios — see FundCards.tsx's comment.
            <tr key={`${f.isin || f.name}-${f.folio}`}>
              <td className="deck-nm">{shortSchemeName(f.name)}</td>
              <td className="deck-rt deck-rt-value">{inr(f.marketValue)}</td>
              <td className={`deck-rt deck-rt-gain ${isFinite(f.unrealised) ? (f.unrealised >= 0 ? 'deck-pos' : 'deck-neg') : 'deck-mut'}`}>
                {isFinite(f.unrealised) ? `${f.unrealised >= 0 ? '+' : '−'}${inr(Math.abs(f.unrealised))}` : '—'}
              </td>
              <td className={`deck-rt deck-rt-cagr ${f.cagr != null ? 'deck-accent' : 'deck-mut'}`}>{f.cagr != null ? pct(f.cagr * 100) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </HoverDiv>
  )
}
