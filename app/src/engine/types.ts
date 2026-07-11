// Statement model — what the parser produces — plus the Phase 2 analysis-
// layer types (Fund, Portfolio) that build on it. Mirrors the shapes in
// reference/engine.js's parseStatement()/analyzeScheme()/analyzePortfolio().

import type { Allocation, FundMeta } from '../reference/fundMeta'

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
