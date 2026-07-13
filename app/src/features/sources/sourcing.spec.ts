import { describe, expect, it } from 'vitest'
import { sourceFor } from './sourcing'
import type { Fund } from '../../engine/types'

function fund(overrides: Partial<Fund>): Fund {
  return {
    isin: 'INF090I01PD7',
    name: 'Test Fund - Direct Plan - Growth',
    house: 'Test Mutual Fund',
    folio: '1',
    meta: {} as Fund['meta'],
    units: 100,
    nav: 20,
    navDate: new Date('2026-07-02'),
    navLive: false,
    navSource: null,
    liveName: null,
    liveRejected: false,
    rejectedNav: NaN,
    rejectedName: null,
    avgCost: 10,
    investedTotal: 1000,
    costValue: 1000,
    marketValue: 2000,
    hasCostBasis: true,
    unrealised: 1000,
    gainPct: 100,
    stcg: 0,
    ltcg: 1000,
    realised: 0,
    realisedLT: 0,
    realisedST: 0,
    xirr: 0.1,
    cagr: 0.1,
    allocAmt: { equity: 2000, debt: 0, cash: 0, other: 0 },
    firstDate: new Date('2020-01-01'),
    txnCount: 1,
    active: true,
    ...overrides,
  }
}

describe('sourceFor', () => {
  it('live match: reports the source and NAV date', () => {
    const s = sourceFor(fund({ navLive: true, navSource: 'mf.captnemo.in' }), true, { reachable: true })
    expect(s.live).toBe(true)
    expect(s.source).toBe('mf.captnemo.in')
    expect(s.reason).toContain('mf.captnemo.in')
    expect(s.status).toBe('Pass')
  })

  it('live match across a rename: surfaces the current name', () => {
    const s = sourceFor(fund({ navLive: true, navSource: 'AMFI', liveName: 'New Fund Name - Direct Plan - Growth', name: 'Old Fund Name - Direct Plan - Growth' }), true, { reachable: true })
    expect(s.current).toBe('New Fund Name - Direct Plan - Growth')
    expect(s.reason).toContain('renamed')
    // reassures the user the match is intentional, not a mix-up
    expect(s.reason).toContain('same fund')
  })

  it('exited fund: needs no live NAV', () => {
    const s = sourceFor(fund({ active: false, marketValue: 0 }), true, { reachable: true })
    expect(s.live).toBe(false)
    expect(s.source).toBe('—')
    expect(s.reason).toContain('Fully sold')
  })

  it('rejected decoy: explains the plausibility rejection with both NAVs', () => {
    const s = sourceFor(fund({ liveRejected: true, rejectedNav: 5, rejectedName: 'Wrong Fund', nav: 20 }), true, { reachable: true })
    expect(s.source).toBe('Statement')
    expect(s.reason).toContain('₹5')
    expect(s.reason).toContain('₹20')
    expect(s.reason).toContain('Wrong Fund')
  })

  it('unreachable network: explains it was a connectivity issue and what to do', () => {
    const s = sourceFor(fund({}), false, null)
    expect(s.reason).toContain("couldn't be reached")
    expect(s.reason).toContain('connection problem')
    expect(s.reason).toContain('Refresh')
  })

  it('no match found (reachable but missed): names the sources tried and what to do', () => {
    const s = sourceFor(fund({}), true, { reachable: true })
    expect(s.reason).toContain('AMFI, mf.captnemo.in, mfapi.in')
    expect(s.reason).toContain(fund({}).isin)
    expect(s.reason).toContain('Refresh')
    expect(s.status).toBe('Fail')
  })

  it('status mirrors navLive exactly, matching engine/datacheck.ts\'s per-fund classification', () => {
    expect(sourceFor(fund({ navLive: true }), true, { reachable: true }).status).toBe('Pass')
    expect(sourceFor(fund({ navLive: false, liveRejected: true, rejectedNav: 5, nav: 20 }), true, { reachable: true }).status).toBe('Fail')
    expect(sourceFor(fund({ navLive: false }), false, null).status).toBe('Fail')
  })
})
