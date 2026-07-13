// Statement model — what the parser produces — plus the Phase 2 analysis-
// layer types (Fund, Portfolio) that build on it. Mirrors the shapes in
// reference/engine.js's parseStatement()/analyzeScheme()/analyzePortfolio().
//
// Two different "this value is missing" conventions coexist here (review
// item C3 — documented rather than migrated to one convention everywhere,
// since that would mean touching every reader across engine/charts/UI for
// no behavior change):
//   - `T | null` (xirr, cagr, portXirr, portCagr, allTimeReturn,
//     inceptionYears, liveAsOf, …) — a *structural* absence: there wasn't
//     enough data to define the value at all (e.g. too few cash flows to
//     solve an XIRR), so `null` reads naturally as "not applicable."
//   - plain `number` carrying `NaN` (avgCost, costValue, unrealised,
//     gainPct, closingUnits/marketValue after scheme-merging in
//     engine/scheme.ts's sumOrNaN, …) — a *data-quality* gap: the raw
//     statement didn't give us a cost basis or a parseable amount for this
//     specific field. Always paired with a sibling signal a caller should
//     check first — `Fund.hasCostBasis`, `Portfolio.someUnknownBasis`, or a
//     plain `isFinite()` guard — rather than being tested for directly with
//     `Number.isNaN()` at the read site.
import type { Allocation, FundMeta } from '../reference/fundMeta'

// The floor below which a scheme's reported closing balance is treated as
// fully redeemed rather than a genuine tiny holding — real CAMS/KFintech
// statements often leave a dust-sized fractional-unit remainder (rounding,
// not an actual position) after a full exit. Shared by every "is this
// scheme currently held" check (review item C3 — previously the same
// `0.0005` magic number, and in one place a subtly different fallback
// order, independently copy-pasted into engine/gains.ts, engine/portfolio.ts,
// and marketdata/resolve.ts).
export const MIN_HELD_UNITS = 0.0005

// closingUnits is the primary signal — a statement that reports it at all is
// authoritative, so a below-threshold reading means genuinely not held, full
// stop, regardless of whatever marketValue happens to say. marketValue is
// only consulted as a fallback when closingUnits itself is missing (NaN).
export function isSchemeHeld(s: Pick<Scheme, 'closingUnits' | 'marketValue'>): boolean {
  return isFinite(s.closingUnits) ? s.closingUnits > MIN_HELD_UNITS : isFinite(s.marketValue) && s.marketValue > 0
}

export interface Txn {
  date: Date
  desc: string
  amount: number
  units: number
  price: number
  balance: number
  stamp: number
}

export interface Scheme {
  house: string
  name: string
  isin: string
  folio: string
  txns: Txn[]
  nav: number
  navDate: Date | null
  marketValue: number
  closingUnits: number
  costValue: number
}

// Per-scheme analysis result — see engine/scheme.ts analyzeScheme().
export interface Fund {
  isin: string
  name: string
  house: string
  folio: string
  meta: FundMeta
  units: number
  nav: number
  navDate: Date | null
  navLive: boolean
  navSource: string | null
  liveName: string | null
  liveRejected: boolean
  rejectedNav: number
  rejectedName: string | null
  avgCost: number
  investedTotal: number
  costValue: number
  marketValue: number
  hasCostBasis: boolean
  unrealised: number
  gainPct: number
  stcg: number
  ltcg: number
  realised: number
  realisedLT: number
  realisedST: number
  xirr: number | null
  cagr: number | null
  allocAmt: Allocation
  firstDate: Date | null
  txnCount: number
  active: boolean
}

// AMC roll-up — see engine/portfolio.ts summariseHouses().
export interface HouseSummary {
  house: string
  cost: number
  value: number
  hasCost: boolean
}

// Portfolio geography entry — see reference/geo.ts geoFor().
export interface GeoEntry {
  country: string
  pct: number
}

// Charts time series — see engine/series.ts buildPortfolioSeries(). null
// when there isn't enough dated transaction history to build one.
export interface Series {
  inception: Date
  valDate: Date
  inceptionYear: number
  // `ts` is the exact sample timestamp (epoch ms) — `year` is a decimal-year
  // approximation derived from it, kept for existing consumers (see
  // portfolio.ts) and for x-axis positioning; charts needing an exact
  // calendar month/year (hover tooltips) should read `ts`, not reconstruct
  // it from `year`, which loses precision across leap years.
  line: { year: number; ts: number; invested: number; value: number }[]
  drawdown: { t: number; dd: number }[]
  rolling: { t: number; ts: number; ret: number; expanding: boolean }[]
  annual: { year: number; ret: number | null; partial: boolean }[]
  contrib: { year: number; amount: number }[]
}

// Portfolio-level analysis result — see engine/portfolio.ts analyzePortfolio().
export interface Portfolio {
  valDate: Date
  funds: Fund[]
  totalCost: number
  totalValue: number
  valuedCost: number
  unrealised: number
  someUnknownBasis: boolean
  gainPct: number
  stcg: number
  ltcg: number
  realised: number
  alloc: Allocation
  contrib: Record<keyof Allocation, { name: string; house: string; amount: number }[]>
  portXirr: number | null
  portXirr1Y: number | null
  portCagr: number | null
  allTimeReturn: number | null
  inceptionDate: Date | null
  inceptionYears: number | null
  live: boolean
  liveMatched: number
  liveTotal: number
  liveAsOf: Date | null
  liveSource: string | null
  houses: HouseSummary[]
  geo: GeoEntry[]
  series: Series | null
}
