// Shared component-test fixtures for T2 (render-smoke coverage). Not a
// *.spec.ts file, so Vitest never picks it up as a test suite itself — it's
// only a builder used BY specs. Every builder takes `Partial<...>` overrides
// so a test only has to state what it actually varies; defaults are a
// plausible, fully-populated "happy path" portfolio so components that
// branch on real data (has cost basis, is live, has geography, etc.) render
// their non-empty path unless a test deliberately overrides toward an edge
// case (e.g. `{ funds: [] }` for an empty-state render).
import type { Diag } from './marketdata/resolve'
import type { Fund, GeoEntry, HouseSummary, Portfolio, Series } from './engine/types'
import type { Allocation, FundMeta } from './reference/fundMeta'

export function makeFundMeta(overrides: Partial<FundMeta> = {}): FundMeta {
  return {
    house: 'Test Mutual Fund',
    category: 'Equity – Flexi Cap',
    taxClass: 'equity',
    alloc: { equity: 0.9, debt: 0.05, cash: 0.05, other: 0 },
    benchmark: 'BSE 500 TRI',
    risk: 'Very High',
    expense: '0.5% (Direct)',
    exit: '1% if redeemed within 365 days, else Nil',
    launch: 'Jan 2020',
    amc: 'https://example.com/scheme',
    note: 'Test fixture fund meta.',
    ...overrides,
  }
}

let fundSeq = 0
export function makeFund(overrides: Partial<Fund> = {}): Fund {
  fundSeq += 1
  return {
    isin: `INF000K0${String(fundSeq).padStart(4, '0')}`,
    name: `Test Fund ${fundSeq} - Direct Plan - Growth`,
    house: 'Test Mutual Fund',
    folio: String(fundSeq),
    meta: makeFundMeta(),
    units: 1000,
    nav: 50,
    navDate: new Date('2026-07-01'),
    navLive: true,
    navSource: 'AMFI',
    liveName: null,
    liveRejected: false,
    rejectedNav: NaN,
    rejectedName: null,
    avgCost: 40,
    investedTotal: 400000,
    costValue: 400000,
    marketValue: 500000,
    hasCostBasis: true,
    unrealised: 100000,
    gainPct: 25,
    stcg: 20000,
    ltcg: 80000,
    realised: 0,
    realisedLT: 0,
    realisedST: 0,
    xirr: 0.15,
    cagr: 0.12,
    allocAmt: { equity: 450000, debt: 25000, cash: 25000, other: 0 },
    firstDate: new Date('2021-01-01'),
    txnCount: 12,
    active: true,
    ...overrides,
  }
}

export function makeHouseSummary(overrides: Partial<HouseSummary> = {}): HouseSummary {
  return { house: 'Test Mutual Fund', cost: 400000, value: 500000, hasCost: true, ...overrides }
}

export function makeGeo(overrides: Partial<GeoEntry>[] = []): GeoEntry[] {
  if (overrides.length) return overrides.map((o) => ({ country: 'India', pct: 1, ...o }))
  return [
    { country: 'India', pct: 0.82 },
    { country: 'United States', pct: 0.18 },
  ]
}

// A small but multi-year Series so invested/annual/rolling/capital chart
// geometry builders all produce a non-null result (each needs >=2 points in
// its own field — see charts/{invested,annual,rolling,capital}.spec.ts).
export function makeSeries(overrides: Partial<Series> = {}): Series {
  return {
    inception: new Date('2021-01-01'),
    valDate: new Date('2026-07-01'),
    inceptionYear: 2021,
    line: [
      { year: 2021, ts: +new Date('2021-01-01'), invested: 100000, value: 100000 },
      { year: 2022, ts: +new Date('2022-01-01'), invested: 250000, value: 260000 },
      { year: 2023, ts: +new Date('2023-01-01'), invested: 400000, value: 380000 },
      { year: 2024, ts: +new Date('2024-01-01'), invested: 400000, value: 500000 },
    ],
    drawdown: [
      { t: 0, dd: 0 },
      { t: 1, dd: -0.08 },
    ],
    rolling: [
      { t: 0.5, ts: +new Date('2021-07-01'), ret: 0.1, expanding: true },
      { t: 1, ts: +new Date('2022-01-01'), ret: 0.12, expanding: false },
      { t: 2, ts: +new Date('2023-01-01'), ret: 0.08, expanding: false },
    ],
    annual: [
      { year: 2021, ret: 0.1, partial: false },
      { year: 2022, ret: -0.04, partial: false },
      { year: 2023, ret: 0.15, partial: true },
    ],
    contrib: [
      { year: 2021, amount: 100000 },
      { year: 2022, amount: 150000 },
      { year: 2023, amount: 150000 },
    ],
    ...overrides,
  }
}

export function makePortfolio(overrides: Partial<Portfolio> = {}): Portfolio {
  const funds = overrides.funds ?? [makeFund()]
  return {
    valDate: new Date('2026-07-01'),
    funds,
    totalCost: 400000,
    totalValue: 500000,
    valuedCost: 400000,
    unrealised: 100000,
    someUnknownBasis: false,
    gainPct: 25,
    stcg: 20000,
    ltcg: 80000,
    realised: 0,
    alloc: { equity: 450000, debt: 25000, cash: 20000, other: 5000 },
    contrib: {
      equity: [{ name: funds[0]?.name ?? 'Test Fund', house: 'Test Mutual Fund', amount: 450000 }],
      debt: [],
      cash: [],
      other: [],
    },
    portXirr: 0.15,
    portXirr1Y: 0.1,
    portCagr: 0.13,
    allTimeReturn: 0.13,
    inceptionDate: new Date('2021-01-01'),
    inceptionYears: 5.5,
    live: true,
    liveMatched: funds.length,
    liveTotal: funds.length,
    liveAsOf: new Date('2026-07-01'),
    liveSource: 'AMFI',
    houses: [makeHouseSummary()],
    geo: makeGeo(),
    series: makeSeries(),
    ...overrides,
  }
}

export function makeAllocation(overrides: Partial<Allocation> = {}): Allocation {
  return { equity: 450000, debt: 25000, cash: 20000, other: 5000, ...overrides }
}

export function makeDiag(overrides: Partial<Diag> = {}): Diag {
  return { amfiOk: true, captnemoUsed: false, mfapiUsed: false, reachable: true, ...overrides }
}
