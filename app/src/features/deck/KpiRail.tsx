import { inr, pct } from '../../format'
import { InsightCard } from './InsightCard'
import { HoverDiv } from '../../ui/HoverLift'
import { InfoTip } from '../../ui/InfoTip'
import { EXPLAIN } from '../../ui/explainers'
import type { Portfolio } from '../../engine/types'

// Total Value and Invested merged into one tile — freed up the 4th KPI slot
// for Insight (tasks.md §U revision, 2026-07-04).
function TotalValueTile({ pf }: { pf: Portfolio }) {
  const gainKnown = isFinite(pf.unrealised) && isFinite(pf.gainPct)
  const gainUp = gainKnown ? pf.unrealised >= 0 : true
  const activeCount = pf.funds.filter((f) => f.active).length

  return (
    <HoverDiv className="deck-tile">
      <p className="deck-lbl">
        Total Value
        <InfoTip text={EXPLAIN.totalValue} label="What does Total Value mean?" align="left" />
      </p>
      <div className="deck-val">{inr(pf.totalValue)}</div>
      {gainKnown && <div className={`deck-sub ${gainUp ? 'deck-pos' : 'deck-neg'}`}>{`${gainUp ? '▲' : '▼'} ${inr(Math.abs(pf.unrealised))} · ${pct(pf.gainPct)}`}</div>}
      <div className="deck-tile-foot">
        <div className="deck-tile-foot-row">
          <span className="deck-mut">Total Invested</span>
          <span className="deck-tile-foot-v">{pf.totalCost > 0 ? inr(pf.totalCost) : '—'}</span>
        </div>
        <div className="deck-tile-foot-sub">
          {activeCount} Fund{activeCount === 1 ? '' : 's'}
        </div>
      </div>
    </HoverDiv>
  )
}

// "Total Gain" -> also carries the ST/LT capital-gains split (previously
// only shown in the now-retired SummaryBand) and the portfolio's investment
// span instead of the redundant word "Unrealised".
function TotalGainTile({ pf }: { pf: Portfolio }) {
  const gainKnown = isFinite(pf.unrealised)
  const gainUp = gainKnown ? pf.unrealised >= 0 : true
  const span = pf.inceptionYears != null ? `Across ${pf.inceptionYears.toFixed(1)} Years` : undefined

  return (
    <HoverDiv className="deck-tile">
      <p className="deck-lbl">
        Total Gain / ST-LT Split
        <InfoTip text={EXPLAIN.totalGain} label="What does Total Gain / ST-LT Split mean?" />
      </p>
      <div className={`deck-val${gainKnown ? '' : ' deck-mut'}`}>{gainKnown ? `${gainUp ? '+' : '−'}${inr(Math.abs(pf.unrealised))}` : '—'}</div>
      {span && <div className="deck-sub deck-mut">{span}</div>}
      <div className="deck-stlt">
        <div>
          <p className="deck-stlt-k">Short Term</p>
          <p className="deck-stlt-v deck-clay">{inr(pf.stcg)}</p>
        </div>
        <div>
          <p className="deck-stlt-k">Long Term</p>
          <p className="deck-stlt-v deck-accent">{inr(pf.ltcg)}</p>
        </div>
      </div>
    </HoverDiv>
  )
}

// "XIRR" -> the money-weighted return is the meaningful figure for a
// portfolio with many irregular cashflows (unlike a simple point-to-point
// CAGR), so this tile shows the portfolio's XIRR over two windows —
// all-time and trailing 1-year — side by side, in the same ink color as
// regular text (no per-column accent color needed; both are the same
// metric, just different windows). Underneath each, in plain white, is the
// Nifty 50 index fund proxy's CAGR over the identical window — a same-period
// equity-benchmark comparison (see marketdata/sources/benchmark.ts for why
// it's a fund proxy, not the raw index).
function XirrTile({ pf, niftyAllTime, nifty1Y }: { pf: Portfolio; niftyAllTime: number | null; nifty1Y: number | null }) {
  return (
    <HoverDiv className="deck-tile">
      <p className="deck-lbl">
        XIRR
        {/* align=left: on mobile the stacked tile puts this icon near the
            viewport's left edge, where a centered 250px popover clips */}
        <InfoTip text={EXPLAIN.xirr} label="What does XIRR mean?" align="left" />
      </p>
      <div className="deck-dual">
        <div>
          <p className="deck-dual-k">All-Time</p>
          <p className="deck-dual-v">{pf.portXirr != null ? pct(pf.portXirr * 100) : '—'}</p>
          <p className="deck-dual-bench">Nifty 50: {niftyAllTime != null ? pct(niftyAllTime * 100) : '—'}</p>
        </div>
        <div>
          <p className="deck-dual-k">1Y</p>
          <p className="deck-dual-v">{pf.portXirr1Y != null ? pct(pf.portXirr1Y * 100) : '—'}</p>
          <p className="deck-dual-bench">Nifty 50: {nifty1Y != null ? pct(nifty1Y * 100) : '—'}</p>
        </div>
      </div>
    </HoverDiv>
  )
}

// The KPI row: Total Value / Invested, Total Gain / ST-LT Split,
// XIRR (All-Time / 1Y vs Nifty 50), Insight — a single full-width row
// directly under the masthead.
export function KpiRail({
  pf,
  niftyAllTime,
  nifty1Y,
  onOpenCommentary,
}: {
  pf: Portfolio
  niftyAllTime: number | null
  nifty1Y: number | null
  onOpenCommentary: () => void
}) {
  return (
    <div className="deck-kpi-rail">
      <TotalValueTile pf={pf} />
      <TotalGainTile pf={pf} />
      <XirrTile pf={pf} niftyAllTime={niftyAllTime} nifty1Y={nifty1Y} />
      <InsightCard pf={pf} onOpenCommentary={onOpenCommentary} />
    </div>
  )
}
