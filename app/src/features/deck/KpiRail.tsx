import { inr, pct } from '../../format'
import { InsightCard } from './InsightCard'
import { HoverDiv } from '../../ui/HoverLift'
import { InfoTip } from '../../ui/InfoTip'
import { EXPLAIN } from '../../ui/explainers'
import type { Portfolio } from '../../engine/types'

// Total Value and Invested merged into one tile — freed up the 4th KPI slot
// for Insight (tasks.md §U revision, 2026-07-04). Total Invested sits on the
// same header row as Total Value, right-aligned, at half its type size (user
// request, 2026-07-22, mocked as "Variant A" — no footer divider, since
// nothing is left below the gain line to separate). On mobile the header
// stacks to a single column instead (see deck.css's .hero-head media query)
// — side by side, "₹1,27,08,479" and "₹1,10,67,473" don't both fit a ~330px
// tile at once.
function TotalValueTile({ pf }: { pf: Portfolio }) {
  const gainKnown = isFinite(pf.unrealised) && isFinite(pf.gainPct)
  const gainUp = gainKnown ? pf.unrealised >= 0 : true
  const activeCount = pf.funds.filter((f) => f.active).length
  const totalValueText = inr(pf.totalValue)
  const investedText = pf.totalCost > 0 ? inr(pf.totalCost) : '—'

  return (
    <HoverDiv className="deck-tile deck-tile-hero">
      <div className="hero-head">
        <div className="hero-head-main">
          <p className="deck-lbl">
            Total Value
            <InfoTip text={EXPLAIN.totalValue} label="What does Total Value mean?" align="left" />
          </p>
          {/* key = the formatted text itself (review item #7): React only
              remounts this node — retriggering the CSS .val-update pop —
              when the *displayed* number actually changes (e.g. after
              Refresh), not on every unrelated re-render. */}
          <div className="deck-val val-update" key={totalValueText}>
            {totalValueText}
          </div>
          {gainKnown && <div className={`deck-sub ${gainUp ? 'deck-pos' : 'deck-neg'}`}>{`${gainUp ? '▲' : '▼'} ${inr(Math.abs(pf.unrealised))} · ${pct(pf.gainPct)}`}</div>}
        </div>
        <div className="hero-head-side">
          <p className="deck-lbl">Total Invested</p>
          <div className="hero-invested-v val-update" key={investedText}>
            {investedText}
          </div>
          <div className="hero-invested-sub">
            {activeCount} Fund{activeCount === 1 ? '' : 's'}
          </div>
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
  const gainText = gainKnown ? `${gainUp ? '+' : '−'}${inr(Math.abs(pf.unrealised))}` : '—'

  return (
    <HoverDiv className="deck-tile">
      <p className="deck-lbl">
        Total Gain / ST-LT Split
        <InfoTip text={EXPLAIN.totalGain} label="What does Total Gain / ST-LT Split mean?" />
      </p>
      <div className={`deck-val val-update${gainKnown ? '' : ' deck-mut'}`} key={gainText}>
        {gainText}
      </div>
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
  const allTimeText = pf.portXirr != null ? pct(pf.portXirr * 100) : '—'
  const oneYText = pf.portXirr1Y != null ? pct(pf.portXirr1Y * 100) : '—'

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
          <p className="deck-dual-v val-update" key={allTimeText}>
            {allTimeText}
          </p>
          <p className="deck-dual-bench">Nifty 50: {niftyAllTime != null ? pct(niftyAllTime * 100) : '—'}</p>
        </div>
        <div>
          <p className="deck-dual-k">1Y</p>
          <p className="deck-dual-v val-update" key={oneYText}>
            {oneYText}
          </p>
          <p className="deck-dual-bench">Nifty 50: {nifty1Y != null ? pct(nifty1Y * 100) : '—'}</p>
        </div>
      </div>
    </HoverDiv>
  )
}

// The summary: Total Value on its own full-width "hero" row — the
// portfolio's single most important number, given the visual dominance it
// warrants (review item #3) — followed by the three secondary tiles (Total
// Gain / ST-LT Split, XIRR vs Nifty 50, Insight) in a row underneath. All
// four used to render as equal-weight tiles in one 4-column grid, giving the
// eye no clear entry point.
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
    // id targeted by Reading the Dashboard's spotlight ("Summary row" item,
    // ui/Spotlight.tsx) — a stable identity for that navigation, not a
    // styling hook (the classes below already cover styling). Moved from the
    // (now secondary-only) tile row to this outer wrapper so the spotlight
    // still highlights the summary as a whole, hero included.
    <div id="deck-summary-row">
      <div className="deck-hero-row">
        <TotalValueTile pf={pf} />
      </div>
      <div className="deck-kpi-rail">
        <TotalGainTile pf={pf} />
        <XirrTile pf={pf} niftyAllTime={niftyAllTime} nifty1Y={nifty1Y} />
        <InsightCard pf={pf} onOpenCommentary={onOpenCommentary} />
      </div>
    </div>
  )
}
