import { pct, shortName } from '../format'
import type { Portfolio } from './types'

export interface InsightFlag {
  id: string
  text: string
}

// Expense-ratio norms by category — deliberately coarse (three bands, not a
// per-category table) since m.expense is free text ("0.49% (Direct)") meant
// for display, not a clean benchmark dataset. Index/ETF funds should be
// near-zero cost; debt/liquid funds run cheaper than active equity; the
// broad "active equity/hybrid" band takes everything else. Order matters —
// first match wins, so the narrower index/debt patterns are checked first.
const EXPENSE_BANDS: { match: RegExp; maxPct: number }[] = [
  { match: /index|etf/i, maxPct: 0.3 },
  { match: /debt|liquid|overnight|money market|gilt|ultra short|low duration/i, maxPct: 0.75 },
  { match: /arbitrage/i, maxPct: 0.75 },
]
const DEFAULT_EXPENSE_MAX = 1.5

// Categories where the Nifty 50 is a fair yardstick — small/mid/sector/debt/
// hybrid funds are deliberately excluded, since comparing them against a
// large-cap index would be misleading (different risk/return profile by
// design, not a sign of underperformance).
const BROAD_MARKET_CATEGORY = /large cap|flexi cap|multi cap|equity.*index/i

function parseExpensePct(expense: string): number | null {
  const m = expense.match(/(\d+(?:\.\d+)?)\s*%/)
  return m ? parseFloat(m[1]) : null
}

function expenseMaxFor(category: string): number {
  const band = EXPENSE_BANDS.find((b) => b.match.test(category))
  return band ? band.maxPct : DEFAULT_EXPENSE_MAX
}

// Small, honestly-computable nudges from data the engine already has — not
// a recommendation engine, just "here's what's worth a second look" (review
// item A2). Each flag names the specific fund/figure so it's checkable, not
// a vague warning. Capped and ordered (concentration first — the single
// most universally-understood risk — then benchmark-trailing, then expense,
// each internally worst-first) so a portfolio with many minor issues shows
// the few that matter most rather than a wall of text.
export function computeInsightFlags(pf: Portfolio, niftyAllTimeCagr: number | null): InsightFlag[] {
  const active = pf.funds.filter((f) => f.active)
  const tv = pf.totalValue
  if (!isFinite(tv) || tv <= 0 || !active.length) return []

  const flags: InsightFlag[] = []

  const top = active.slice().sort((a, b) => b.marketValue - a.marketValue)[0]
  const topPct = top ? (top.marketValue / tv) * 100 : 0
  if (top && topPct > 35) {
    flags.push({
      id: 'concentration',
      text: `${shortName(top.name)} is ${topPct.toFixed(0)}% of your portfolio — a single fund having that much weight means its ups and downs dominate your total.`,
    })
  }

  if (niftyAllTimeCagr != null) {
    const niftyPct = niftyAllTimeCagr * 100
    const trailing = active
      .filter((f) => BROAD_MARKET_CATEGORY.test(f.meta.category) && f.cagr != null && f.cagr * 100 < niftyPct - 1)
      .sort((a, b) => a.cagr! - b.cagr!)
      .slice(0, 2)
    for (const f of trailing) {
      flags.push({
        id: `benchmark-${f.isin || f.name}-${f.folio}`,
        text: `${shortName(f.name)}'s return (${pct(f.cagr! * 100)} CAGR) has trailed the Nifty 50 (${pct(niftyPct)}) over your holding period — for a broad-market fund like this, worth checking whether it's earning its fees.`,
      })
    }
  }

  const expensive = active
    .map((f) => ({ f, expensePct: parseExpensePct(f.meta.expense), max: expenseMaxFor(f.meta.category) }))
    .filter((x): x is { f: (typeof active)[number]; expensePct: number; max: number } => x.expensePct != null && x.expensePct > x.max)
    .sort((a, b) => b.expensePct - b.max - (a.expensePct - a.max))
    .slice(0, 2)
  for (const { f, expensePct } of expensive) {
    flags.push({
      id: `expense-${f.isin || f.name}-${f.folio}`,
      text: `${shortName(f.name)} charges ${expensePct.toFixed(2)}% a year — on the high side for a ${f.meta.category} fund. Even 0.5% less compounds meaningfully over decades.`,
    })
  }

  return flags.slice(0, 4)
}
