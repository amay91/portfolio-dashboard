import { describe, expect, it } from 'vitest'
import { analyzeScheme, groupSchemesByIdentity } from './scheme'
import type { Scheme } from './types'

// analyzeScheme has its own independent plausibility check (defense in
// depth alongside analyzePortfolio's liveFor pre-filter — see
// marketdata/liveIntegration.spec.ts for the portfolio-level regression
// lock). This exercises that check directly, which requires calling
// analyzeScheme with an unfiltered `live` candidate — something
// analyzePortfolio never does on its own.

const baseScheme: Scheme = {
  house: 'ICICI Prudential Mutual Fund',
  name: 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth',
  isin: 'INF109K016O4',
  folio: '1',
  txns: [{ date: new Date(Date.UTC(2018, 8, 7)), desc: 'Purchase', amount: 50000, units: 2055.135, price: 24.3293, balance: 2055.135, stamp: 0 }],
  nav: 39.1597,
  navDate: new Date(Date.UTC(2026, 5, 29)),
  marketValue: 80500,
  closingUnits: 2055.135,
  costValue: 50000,
}

describe('analyzeScheme — live-NAV plausibility gate', () => {
  it('applies a plausible live NAV: navLive true, marketValue recomputed', () => {
    const f = analyzeScheme(baseScheme, new Date(Date.UTC(2026, 5, 30)), {
      nav: 39.21,
      date: new Date(Date.UTC(2026, 5, 30)),
      source: 'mf.captnemo.in',
    })
    expect(f.navLive).toBe(true)
    expect(f.liveRejected).toBe(false)
    expect(f.nav).toBe(39.21)
    expect(f.marketValue).toBeCloseTo(2055.135 * 39.21, 2)
  })

  it('rejects an implausible live NAV (outside 1/3x-3x) and falls back to the statement NAV', () => {
    const decoyNav = baseScheme.nav / 4
    const f = analyzeScheme(baseScheme, new Date(Date.UTC(2026, 5, 30)), {
      nav: decoyNav,
      date: new Date(Date.UTC(2026, 5, 30)),
      source: 'decoy-source',
      name: 'Some Wrong Fund',
    })
    expect(f.navLive).toBe(false)
    expect(f.liveRejected).toBe(true)
    expect(f.rejectedNav).toBe(decoyNav)
    expect(f.rejectedName).toBe('Some Wrong Fund')
    expect(f.nav).toBe(baseScheme.nav) // fell back to statement NAV
    expect(f.marketValue).toBe(baseScheme.marketValue) // statement's own market value, untouched
  })

  it('operates correctly with no live candidate at all (statement-only, Phase 2 gate)', () => {
    const f = analyzeScheme(baseScheme, new Date(Date.UTC(2026, 5, 30)), null)
    expect(f.navLive).toBe(false)
    expect(f.liveRejected).toBe(false)
    expect(f.nav).toBe(baseScheme.nav)
    expect(f.marketValue).toBe(baseScheme.marketValue)
  })
})

// A real statement can list the same scheme under two folios (e.g. two SIPs
// set up at different times) — found via vandana_kfintech.txt (3 ISINs each
// duplicated across folios) and via a real user statement where the same
// fund's two folios showed up as two near-duplicate cards/rows everywhere in
// the dashboard. groupSchemesByIdentity must merge these into one Scheme
// BEFORE analyzeScheme runs, since XIRR/CAGR/lot-based gains cannot be
// correctly derived by combining two already-computed Funds after the fact
// (see docs/DECISIONS.md "Same scheme across multiple folios").
describe('groupSchemesByIdentity — same scheme across multiple folios', () => {
  function folioScheme(overrides: Partial<Scheme> = {}): Scheme {
    return {
      house: 'ICICI Prudential Mutual Fund',
      name: 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth',
      isin: 'INF109K016O4',
      folio: '111',
      txns: [{ date: new Date(Date.UTC(2022, 0, 1)), desc: 'Purchase', amount: 10000, units: 100, price: 100, balance: 100, stamp: 0 }],
      nav: 120,
      navDate: new Date(Date.UTC(2026, 5, 30)),
      marketValue: 12000,
      closingUnits: 100,
      costValue: 10000,
      ...overrides,
    }
  }

  it('merges two folios of the same ISIN into one Scheme: sums units/cost/value, unions folios, concatenates+sorts txns', () => {
    const a = folioScheme({
      folio: '111',
      txns: [{ date: new Date(Date.UTC(2022, 6, 1)), desc: 'Purchase', amount: 10000, units: 100, price: 100, balance: 100, stamp: 0 }],
      closingUnits: 100,
      marketValue: 12000,
      costValue: 10000,
    })
    const b = folioScheme({
      folio: '222',
      txns: [{ date: new Date(Date.UTC(2022, 0, 1)), desc: 'Purchase', amount: 20000, units: 200, price: 100, balance: 200, stamp: 0 }],
      closingUnits: 200,
      marketValue: 24000,
      costValue: 20000,
    })
    const [merged, ...rest] = groupSchemesByIdentity([a, b])
    expect(rest).toHaveLength(0)
    expect(merged.folio).toBe('111, 222')
    expect(merged.closingUnits).toBe(300)
    expect(merged.marketValue).toBe(36000)
    expect(merged.costValue).toBe(30000)
    expect(merged.txns).toHaveLength(2)
    // sorted chronologically — b's Jan txn (invested first) must come before a's July txn,
    // even though a was passed in first, since firstDate/lot order depend on this.
    expect(merged.txns[0].date).toEqual(new Date(Date.UTC(2022, 0, 1)))
    expect(merged.txns[1].date).toEqual(new Date(Date.UTC(2022, 6, 1)))
  })

  it('leaves schemes with different identities (different ISIN/name) untouched, in order', () => {
    const a = folioScheme({ isin: 'INF109K016O4', folio: '111' })
    const b = folioScheme({ isin: 'INF090I01PD7', name: 'Some Other Fund - Direct Plan - Growth', folio: '222' })
    const out = groupSchemesByIdentity([a, b])
    expect(out).toHaveLength(2)
    expect(out[0].isin).toBe('INF109K016O4')
    expect(out[1].isin).toBe('INF090I01PD7')
  })

  it("produces a correct combined avgCost/XIRR when fed through analyzeScheme — not derivable by averaging two separately-computed Funds", () => {
    // Folio 1: bought 100 units for 10,000 on 2022-01-01. Folio 2: bought 200
    // units for 22,000 (higher NAV) on 2023-01-01. Combined avgCost must be
    // (10000+22000)/300, not an average of the two folios' own per-unit costs.
    const a = folioScheme({
      folio: '111',
      txns: [{ date: new Date(Date.UTC(2022, 0, 1)), desc: 'Purchase', amount: 10000, units: 100, price: 100, balance: 100, stamp: 0 }],
      closingUnits: 100,
      marketValue: 12000,
      costValue: 10000,
    })
    const b = folioScheme({
      folio: '222',
      txns: [{ date: new Date(Date.UTC(2023, 0, 1)), desc: 'Purchase', amount: 22000, units: 200, price: 110, balance: 200, stamp: 0 }],
      closingUnits: 200,
      marketValue: 24000,
      costValue: 22000,
    })
    const [merged] = groupSchemesByIdentity([a, b])
    const f = analyzeScheme(merged, new Date(Date.UTC(2026, 5, 30)), null)
    expect(f.units).toBe(300)
    expect(f.avgCost).toBeCloseTo(32000 / 300, 6)
    expect(f.firstDate).toEqual(new Date(Date.UTC(2022, 0, 1))) // earliest across both folios
    expect(f.xirr).not.toBeNull()
  })
})
