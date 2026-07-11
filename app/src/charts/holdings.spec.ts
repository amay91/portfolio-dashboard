import { describe, expect, it } from 'vitest'
import { holdingsCaption, holdingsGeometry } from './holdings'
import { CW, MR } from './scales'
import type { Fund } from '../engine/types'

function fund(overrides: Partial<Fund>): Fund {
  return {
    isin: 'INF000000000',
    name: 'Test Fund - Direct Plan - Growth',
    house: 'Test AMC',
    folio: '1',
    meta: {
      house: 'Test AMC',
      category: 'Equity',
      taxClass: 'equity',
      alloc: { equity: 1, debt: 0, cash: 0, other: 0 },
      benchmark: '',
      risk: '',
      expense: '',
      exit: '',
      launch: '',
      amc: '',
      note: '',
    },
    units: 100,
    nav: 100,
    navDate: null,
    navLive: false,
    navSource: null,
    liveName: null,
    liveRejected: false,
    rejectedNav: NaN,
    rejectedName: null,
    avgCost: 100,
    investedTotal: 10000,
    costValue: 10000,
    marketValue: 10000,
    hasCostBasis: true,
    unrealised: 0,
    gainPct: 0,
    stcg: 0,
    ltcg: 0,
    realised: 0,
    realisedLT: 0,
    realisedST: 0,
    xirr: null,
    cagr: null,
    allocAmt: { equity: 10000, debt: 0, cash: 0, other: 0 },
    firstDate: null,
    txnCount: 1,
    active: true,
    ...overrides,
  }
}

describe('holdingsGeometry', () => {
  it('returns null when there are no active holdings', () => {
    expect(holdingsGeometry([], 100000)).toBeNull()
    expect(holdingsGeometry([fund({ active: false })], 100000)).toBeNull()
  })

  it('sorts active holdings by market value descending and caps at 10', () => {
    const funds = [fund({ name: 'Small', marketValue: 1000 }), fund({ name: 'Big', marketValue: 5000 }), fund({ name: 'Medium', marketValue: 3000 })]
    const geo = holdingsGeometry(funds, 9000)!
    expect(geo.bars.map((b) => b.name)).toEqual(['Big', 'Medium', 'Small'])
  })

  it('excludes inactive (exited) holdings from the chart', () => {
    const funds = [fund({ name: 'Active', marketValue: 1000, active: true }), fund({ name: 'Exited', marketValue: 5000, active: false })]
    const geo = holdingsGeometry(funds, 1000)!
    expect(geo.bars.map((b) => b.name)).toEqual(['Active'])
  })

  it('computes the top holding\'s concentration against total portfolio value', () => {
    const funds = [fund({ name: 'Top', marketValue: 4000 })]
    const geo = holdingsGeometry(funds, 10000)!
    expect(geo.topConcentrationPct).toBeCloseTo(40, 5)
  })

  it('never lets the top bar exceed the drawable width, even when niceStep rounds the axis max below the true peak value (2026-07-11 regression: a ₹3.4cr holding on a [0,1,2,3]cr axis rendered at 113% width, pushing its label off-canvas)', () => {
    // niceStep(3.4, 4) rounds to a step of 1, producing ticks [0,1,2,3] --
    // stopping at 3, one short of the true 3.4 peak (found via a
    // randomized-portfolio sweep). Using that last tick as xmax unconditionally
    // scaled the bar to (3.4/3) = 113% of the drawable width.
    const funds = [
      fund({ name: 'Big', marketValue: 3_40_00_000 }),
      fund({ name: 'Small', marketValue: 1_00_000 }),
    ]
    const geo = holdingsGeometry(funds, 3_41_00_000)!
    const bigBar = geo.bars[0]
    expect(bigBar.barW).toBeLessThanOrEqual(CW - MR - geo.x0)
  })

  it('leaves room for the value label so the top bar never reaches the SVG\'s right edge (2026-07-11 regression: a dominant holding\'s "₹3.4Cr"-style label rendered off-canvas)', () => {
    // A single dominant holding whose value sits right at the rounded axis
    // max — the exact scenario a randomized-portfolio sweep found: the top
    // bar's right edge used to equal CW - MR precisely, leaving zero room
    // for the label drawn just past it.
    const funds = [fund({ name: 'Dominant', marketValue: 1_00_00_000 })]
    const geo = holdingsGeometry(funds, 1_00_00_000)!
    const barRightEdge = geo.x0 + geo.bars[0].barW
    // HoldingsChart.tsx draws the label starting 5px after the bar, and a
    // realistic worst-case label ("₹999Cr") is well under 40px wide — so the
    // bar's own right edge must leave at least that much clearance.
    expect(CW - MR - barRightEdge).toBeGreaterThanOrEqual(40)
  })
})

describe('holdingsCaption', () => {
  it('names the top holding and its concentration, plain text (no HTML entities)', () => {
    const funds = [fund({ name: 'Kotak Small Cap Fund - Direct Growth', marketValue: 5000 })]
    const geo = holdingsGeometry(funds, 10000)!
    const cap = holdingsCaption(geo)
    expect(cap).toContain('Kotak Small Cap Fund')
    expect(cap).toContain('50%')
    expect(cap).not.toContain('&quot;')
  })
})
