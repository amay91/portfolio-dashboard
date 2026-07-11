import { weightedCAGR } from './cagr'
import { yearsBetween } from './dates'
import { fuzzyLive, isin0, liveKey, navPlausible } from './harmonise'
import type { LiveMatch, LiveNavMap } from './harmonise'
import { analyzeScheme, groupSchemesByIdentity } from './scheme'
import { buildPortfolioSeries } from './series'
import type { Fund, GeoEntry, HouseSummary, Portfolio, Scheme } from './types'
import { xirr } from './xirr'
import type { CashFlow } from './xirr'
import { parseStatement } from '../parsing/cas/parse'
import { geoFor } from '../reference/geo'
import type { Allocation } from '../reference/fundMeta'

export interface AnalyzePortfolioOpts {
  live?: LiveNavMap | null
  valDateStr?: string
}

// Portfolio roll-up: parses the statement, then delegates to
// analyzePortfolioFromSchemes. Statement-only is the Phase 2 gate:
// `analyzePortfolio(text).totalValue` must match each fixture's known total
// exactly — see portfolio.spec.ts.
export function analyzePortfolio(text: string, opts?: AnalyzePortfolioOpts): Portfolio {
  return analyzePortfolioFromSchemes(parseStatement(text), opts)
}

// The actual roll-up, operating on already-parsed schemes: resolves each
// scheme against an (optional) live-NAV map, analyzes every scheme, then
// aggregates totals, allocation, geography, AMC roll-up, and the
// money-weighted since-inception return. Ported from reference/engine.js
// analyzePortfolio. Split out from analyzePortfolio (text) so a caller with
// already-parsed Scheme[] (e.g. the Sample Portfolio path in App.tsx) doesn't
// have to round-trip through statement text.
//
// opts.live = { byIsin, byName, rows, source } — a plausibility-gated
// live-NAV map from the market-data layer (Phase 3; omit for statement-only
// analysis).
export function analyzePortfolioFromSchemes(rawSchemes: Scheme[], opts?: AnalyzePortfolioOpts): Portfolio {
  // Consolidate the same scheme held across multiple folios into one Scheme
  // (merged txns, summed units/cost/value) before any analysis runs, so
  // every downstream figure — funds[], houses, allocation, portfolio XIRR,
  // the chart series — is computed from one row per scheme, not per folio.
  const schemes = groupSchemesByIdentity(rawSchemes)
  const live = opts?.live || null

  // Resolve a live NAV for each scheme, returning only a *plausible* match:
  // ISIN (raw or O/0-folded) -> alias name key -> fuzzy core-token. A
  // candidate whose NAV is wildly off the statement NAV is skipped (wrong
  // fund), so the holding falls through to the next source rather than
  // being mis-valued.
  const liveFor = (s: Scheme): LiveMatch | null => {
    if (!live) return null
    const ok = (r?: LiveMatch | null): r is LiveMatch => !!r && navPlausible(r.nav, s.nav)
    let r: LiveMatch | null | undefined
    if (s.isin && live.byIsin) r = live.byIsin[s.isin] || live.byIsin[isin0(s.isin) || '']
    if (ok(r)) return r
    r = live.byName ? live.byName[liveKey(s.name)] : undefined
    if (ok(r)) return r
    r = live.rows ? fuzzyLive(s.name, live.rows) : undefined
    if (ok(r)) return r
    return null
  }

  // Valuation date = latest NAV date available (live if we have it, else statement).
  let valDate: Date | null = opts?.valDateStr ? new Date(opts.valDateStr) : null
  for (const s of schemes) {
    const lv = liveFor(s)
    const d = lv && lv.date ? lv.date : s.navDate
    if (d && (!valDate || d > valDate)) valDate = d
  }
  if (!valDate) valDate = new Date()

  const funds: Fund[] = schemes
    .map((s) => analyzeScheme(s, valDate as Date, liveFor(s)))
    .filter((f) => isFinite(f.marketValue))
  const liveMatched = funds.filter((f) => f.navLive).length
  const liveAsOf = funds.reduce<Date | null>(
    (mx, f) => (f.navLive && f.navDate && (!mx || f.navDate > mx) ? f.navDate : mx),
    null,
  )

  // Cost totals only count active funds whose basis we actually know.
  const costFunds = funds.filter((f) => f.active && f.hasCostBasis)
  const totalCost = costFunds.reduce((a, f) => a + f.costValue, 0)
  const totalValue = funds.reduce((a, f) => a + f.marketValue, 0)
  // Market value of holdings whose cost we know (so gain % is apples-to-apples).
  const valuedCost = costFunds.reduce((a, f) => a + f.marketValue, 0)
  const unrealised = totalCost > 0 ? valuedCost - totalCost : NaN
  const someUnknownBasis = funds.some((f) => f.active && !f.hasCostBasis)
  const stcg = funds.reduce((a, f) => a + f.stcg, 0)
  const ltcg = funds.reduce((a, f) => a + f.ltcg, 0)
  const realised = funds.reduce((a, f) => a + f.realised, 0)

  const alloc: Allocation = { equity: 0, debt: 0, cash: 0, other: 0 }
  for (const f of funds) {
    alloc.equity += f.allocAmt.equity
    alloc.debt += f.allocAmt.debt
    alloc.cash += f.allocAmt.cash
    alloc.other += f.allocAmt.other
  }

  // Look-through country concentration (current holdings, weighted by market value)
  const geoAcc: Record<string, number> = {}
  let geoBase = 0
  for (const f of funds) {
    if (!(isFinite(f.marketValue) && f.marketValue > 0)) continue
    const g = geoFor(f.meta, f.name)
    geoBase += f.marketValue
    for (const c in g) geoAcc[c] = (geoAcc[c] || 0) + f.marketValue * g[c]
  }
  const geo: GeoEntry[] =
    geoBase > 0
      ? Object.keys(geoAcc)
          .map((c) => ({ country: c, pct: geoAcc[c] / geoBase }))
          .sort((a, b) => b.pct - a.pct)
      : []

  // portfolio XIRR over all cash flows + single terminal value
  const allFlows: CashFlow[] = []
  for (const s of schemes) {
    const buys = s.txns.filter((t) => t.units > 0)
    for (const b of buys) allFlows.push({ date: b.date, amount: -(b.amount + (b.stamp || 0)) })
    for (const sell of s.txns.filter((t) => t.units < 0)) allFlows.push({ date: sell.date, amount: Math.abs(sell.amount) })
  }
  if (totalValue > 0) allFlows.push({ date: valDate, amount: totalValue })
  const portXirr = xirr(allFlows)

  // Trailing 1-year XIRR: the same money-weighted method, scoped to the last
  // 12 months, with a synthetic "starting value" outflow standing in for
  // whatever was held at the start of that window (the standard way to XIRR
  // an ongoing portfolio's recent-period return). The starting value comes
  // from the chart series' nearest monthly sample to one year ago — a small
  // approximation (not an exact-day interpolation) that's consistent with
  // the series' own monthly grid.
  const series = buildPortfolioSeries(schemes, liveFor, valDate)
  let portXirr1Y: number | null = null
  if (series && series.line.length) {
    const oneYearAgo = new Date(valDate)
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    if (oneYearAgo >= series.inception) {
      const y = oneYearAgo.getFullYear()
      const targetYear = y + (+oneYearAgo - +new Date(y, 0, 1)) / (365.25 * 86400000)
      let closest = series.line[0]
      for (const p of series.line) if (Math.abs(p.year - targetYear) < Math.abs(closest.year - targetYear)) closest = p
      const flows1Y: CashFlow[] = []
      if (closest.value > 0) flows1Y.push({ date: oneYearAgo, amount: -closest.value })
      for (const s of schemes) {
        for (const b of s.txns.filter((t) => t.units > 0 && t.date > oneYearAgo)) flows1Y.push({ date: b.date, amount: -(b.amount + (b.stamp || 0)) })
        for (const sell of s.txns.filter((t) => t.units < 0 && t.date > oneYearAgo)) flows1Y.push({ date: sell.date, amount: Math.abs(sell.amount) })
      }
      if (totalValue > 0) flows1Y.push({ date: valDate, amount: totalValue })
      portXirr1Y = xirr(flows1Y)
    }
  }

  const activeBuys: { date: Date; amount: number }[] = []
  for (const s of schemes) {
    const held = isFinite(s.closingUnits) ? s.closingUnits > 0.0005 : isFinite(s.marketValue) && s.marketValue > 0
    if (!held) continue
    for (const b of s.txns.filter((t) => t.units > 0)) activeBuys.push({ date: b.date, amount: b.amount + (b.stamp || 0) })
  }
  const portCagr = weightedCAGR(activeBuys, valuedCost, valDate, totalCost)

  // ---- All-Time Return: the portfolio's compounded annual growth since
  // inception. Inception = the earliest purchase across every scheme (held
  // or since exited). For a portfolio funded by contributions at many
  // different dates, the correct "CAGR since inception" is the
  // money-weighted annualized return over the whole life — i.e. the XIRR
  // across all flows, which already runs from the first investment to
  // today. (A naive value/cost point-to-point CAGR would spread mostly-
  // recent capital over the full span and badly understate the result.)
  let inceptionDate: Date | null = null
  for (const s of schemes) {
    for (const b of s.txns.filter((t) => t.units > 0)) {
      if (!inceptionDate || b.date < inceptionDate) inceptionDate = b.date
    }
  }
  const inceptionYears = inceptionDate ? yearsBetween(inceptionDate, valDate) : null
  const allTimeReturn = portXirr // annualized, money-weighted, since inception

  // contributions to each allocation bucket (for drill-down)
  const contrib: Portfolio['contrib'] = { equity: [], debt: [], cash: [], other: [] }
  for (const f of funds) {
    for (const k of ['equity', 'debt', 'cash', 'other'] as const) {
      if (f.allocAmt[k] > 0.5) contrib[k].push({ name: f.name, house: f.house, amount: f.allocAmt[k] })
    }
  }
  for (const k of ['equity', 'debt', 'cash', 'other'] as const) contrib[k].sort((a, b) => b.amount - a.amount)

  return {
    valDate,
    funds,
    totalCost,
    totalValue,
    valuedCost,
    unrealised,
    someUnknownBasis,
    gainPct: totalCost > 0 ? (unrealised / totalCost) * 100 : NaN,
    stcg,
    ltcg,
    realised,
    alloc,
    contrib,
    portXirr,
    portXirr1Y,
    portCagr,
    allTimeReturn,
    inceptionDate,
    inceptionYears,
    live: !!live,
    liveMatched,
    liveTotal: funds.length,
    liveAsOf,
    liveSource: (live && live.source) || null,
    houses: summariseHouses(funds),
    geo,
    series,
  }
}

export function summariseHouses(funds: Fund[]): HouseSummary[] {
  const map: Record<string, HouseSummary> = {}
  for (const f of funds) {
    const h = f.house || 'Other'
    if (!map[h]) map[h] = { house: h, cost: 0, value: 0, hasCost: false }
    if (f.active && isFinite(f.costValue)) {
      map[h].cost += f.costValue
      map[h].hasCost = true
    }
    map[h].value += f.marketValue
  }
  return Object.values(map).sort((a, b) => b.value - a.value)
}
