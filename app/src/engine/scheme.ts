import { weightedCAGR } from './cagr'
import { ltcgMonths, realisedGains, unrealisedGains } from './gains'
import type { LiveMatch } from './harmonise'
import type { Scheme, Txn, Fund } from './types'
import { type CashFlow, xirr } from './xirr'
import { FUND_META, inferMeta } from '../reference/fundMeta'
import { fundHouseFullName } from '../reference/fundHouses'

// A statement can list the same scheme under two different folios (e.g. two
// SIPs set up at different times). Grouped so every downstream consumer
// (funds[], houses, allocation, fund cards, data sources...) sees one row
// per scheme with consolidated totals, not a near-duplicate per folio. Must
// run BEFORE analyzeScheme, not after: XIRR/CAGR/lot-based gains are not
// additive across two already-computed Funds, but merging the raw Txn lists
// first and running analyzeScheme once produces a correct combined result
// "for free", reusing all existing lot/cash-flow logic unchanged. See
// docs/DECISIONS.md "Same scheme across multiple folios".
function sumOrNaN(a: number, b: number): number {
  const af = isFinite(a)
  const bf = isFinite(b)
  if (!af && !bf) return NaN
  return (af ? a : 0) + (bf ? b : 0)
}

export function groupSchemesByIdentity(schemes: Scheme[]): Scheme[] {
  const order: string[] = []
  const merged: Record<string, Scheme> = {}
  for (const s of schemes) {
    const key = s.isin || s.name
    const existing = merged[key]
    if (!existing) {
      merged[key] = { ...s, txns: s.txns.slice() }
      order.push(key)
      continue
    }
    existing.txns = existing.txns.concat(s.txns)
    existing.closingUnits = sumOrNaN(existing.closingUnits, s.closingUnits)
    existing.marketValue = sumOrNaN(existing.marketValue, s.marketValue)
    existing.costValue = sumOrNaN(existing.costValue, s.costValue)
    if (!existing.folio.split(', ').includes(s.folio)) existing.folio = existing.folio ? `${existing.folio}, ${s.folio}` : s.folio
    if (s.navDate && (!existing.navDate || s.navDate > existing.navDate)) {
      existing.nav = s.nav
      existing.navDate = s.navDate
    }
  }
  for (const key of order) merged[key].txns.sort((a: Txn, b: Txn) => a.date.getTime() - b.date.getTime())
  return order.map((key) => merged[key])
}

// Per-scheme analysis: balances, average cost, capital gains (STCG/LTCG),
// XIRR/CAGR, and look-through allocation in rupees. Ported from
// reference/engine.js analyzeScheme.
//
// `live` (optional) = a plausibility-gated live-NAV match from the
// market-data layer (Phase 3; undefined until then, in which case this
// operates entirely on the statement's own NAV — the Phase 2 gate). When
// present it overrides the statement's NAV and valuation date, so gains,
// XIRR/CAGR and allocation reflect the latest available price rather than
// the statement's as-of date.
export function analyzeScheme(s: Scheme, valDate: Date, live?: LiveMatch | null): Fund {
  const meta = FUND_META[s.isin] || inferMeta(s.name)
  const buys = s.txns.filter((t) => t.units > 0).map((t) => ({ ...t, invested: t.amount + (t.stamp || 0) }))
  const sells = s.txns.filter((t) => t.units < 0)

  const investedTotal = buys.reduce((a, b) => a + b.invested, 0)
  const unitsBought = buys.reduce((a, b) => a + b.units, 0)
  const avgCost = unitsBought > 0 ? investedTotal / unitsBought : NaN

  const units = isFinite(s.closingUnits) ? s.closingUnits : unitsBought + sells.reduce((a, b) => a + b.units, 0)

  // Live NAV, with a sanity check: a live NAV is only trusted if it's in a
  // plausible range of the statement's own NAV. Statement and live dates
  // are days apart, so a live NAV that differs by more than ~3x almost
  // certainly means the holding was matched to the WRONG fund (e.g. a ₹886
  // fund matched to a ₹18 one). In that case we reject the live value and
  // keep the statement NAV, flagging it. See docs/DECISIONS.md
  // "Plausibility gate".
  const LIVE_LO = 1 / 3
  const LIVE_HI = 3
  const rawLiveNav = live && isFinite(live.nav) ? live.nav : NaN
  let liveNav = rawLiveNav
  let liveRejected = false
  if (isFinite(rawLiveNav) && isFinite(s.nav) && s.nav > 0) {
    const ratio = rawLiveNav / s.nav
    if (ratio < LIVE_LO || ratio > LIVE_HI) {
      liveNav = NaN
      liveRejected = true
    }
  }
  const nav = isFinite(liveNav) ? liveNav : s.nav
  const navDate = isFinite(liveNav) && live && live.date ? live.date : s.navDate
  const navLive = isFinite(liveNav)
  // Prefer recomputing value from live NAV × units; else fall back to the
  // statement's stated market value (units × statement NAV).
  const marketValue =
    navLive && isFinite(units)
      ? units * liveNav
      : isFinite(s.marketValue)
        ? s.marketValue
        : isFinite(units) && isFinite(nav)
          ? units * nav
          : NaN
  // The per-fund valuation date used for holding-period and terminal-value timing.
  const asOf = navDate || valDate
  // We only "know" a cost basis if the statement gives a Total Cost Value,
  // or if there were purchases inside the statement period. A holding
  // carried in as an opening balance with no in-period buys (and no TCV)
  // has an unknown basis.
  const hasCostBasis = isFinite(s.costValue) || investedTotal > 0
  const costValue = isFinite(s.costValue) ? s.costValue : investedTotal > 0 ? investedTotal : NaN

  // Unrealised gains, split STCG / LTCG by per-lot holding period (to the as-of date).
  const thr = ltcgMonths(meta.taxClass)
  const { stcg, ltcg } = unrealisedGains(buys, unitsBought, units, nav, asOf, thr)
  const unrealised = hasCostBasis ? marketValue - costValue : NaN

  // Realised gains from redemptions.
  const { realised, realisedLT, realisedST } = realisedGains(
    sells,
    buys[0] ? buys[0].date : null,
    unitsBought,
    investedTotal,
    thr,
  )

  // Cash-flow series for XIRR (includes redemptions; terminal = current value at as-of).
  const flows: CashFlow[] = buys.map((b) => ({ date: b.date, amount: -b.invested }))
  for (const sell of sells) flows.push({ date: sell.date, amount: Math.abs(sell.amount) })
  if (marketValue > 0) flows.push({ date: asOf, amount: marketValue })
  const irr = xirr(flows)
  const cagr = marketValue > 0 ? weightedCAGR(buys, marketValue, asOf, costValue) : irr

  // Look-through allocation in rupees.
  const a = meta.alloc
  const allocAmt = {
    equity: marketValue * (a.equity || 0),
    debt: marketValue * (a.debt || 0),
    cash: marketValue * (a.cash || 0),
    other: marketValue * (a.other || 0),
  }

  return {
    isin: s.isin,
    name: s.name,
    house: fundHouseFullName(meta.house || s.house),
    folio: s.folio,
    meta,
    units,
    nav,
    navDate: asOf,
    navLive,
    navSource: (live && live.source) || null,
    liveName: (live && live.name) || null,
    liveRejected,
    rejectedNav: liveRejected ? rawLiveNav : NaN,
    rejectedName: liveRejected ? (live && live.name) || null : null,
    avgCost,
    investedTotal,
    costValue,
    marketValue,
    hasCostBasis,
    unrealised,
    gainPct: hasCostBasis && costValue > 0 ? (unrealised / costValue) * 100 : NaN,
    stcg,
    ltcg,
    realised,
    realisedLT,
    realisedST,
    xirr: irr,
    cagr,
    allocAmt,
    firstDate: buys[0] ? buys[0].date : null,
    txnCount: s.txns.length,
    active: marketValue > 0,
  }
}
