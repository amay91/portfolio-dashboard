import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzePortfolio } from './portfolio'
import { FIXTURES } from '../../tests/fixtures/expected'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

// Phase 2 gate: analyzePortfolio (statement NAV only, no live-NAV layer —
// that's Phase 3) reproduces each fixture's known total market value exactly.
// This is the portfolio-rollup-level counterpart to the parser-level gate in
// parsing/cas/fixtures.spec.ts; the two totals coincide because
// analyzeScheme's statement-only fallback matches statementOnlyTotal there.
describe('analyzePortfolio — golden fixtures (statement-only)', () => {
  for (const [file, expected] of Object.entries(FIXTURES)) {
    it(`${file} totalValue matches its known total`, () => {
      const text = readFixture(file)
      const pf = analyzePortfolio(text)
      expect(Math.round(pf.totalValue)).toBe(expected)
    })
  }

  it('geography sums to 100% for alok_2026 and sample', () => {
    for (const file of ['alok_2026.txt', 'sample.txt']) {
      const pf = analyzePortfolio(readFixture(file))
      const sum = pf.geo.reduce((a, g) => a + g.pct, 0)
      expect(Math.abs(sum - 1)).toBeLessThan(0.005)
    }
  })

  it('all-time return (money-weighted XIRR since inception) is a sane finite number for alok_2026', () => {
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    expect(pf.allTimeReturn).not.toBeNull()
    expect(isFinite(pf.allTimeReturn as number)).toBe(true)
    expect(pf.inceptionDate).not.toBeNull()
    expect((pf.inceptionDate as Date).getTime()).toBeLessThan(pf.valDate.getTime())
  })

  it('AXIS: all-time return survives even though realised gains come entirely from an exited round-trip', () => {
    // See docs/DECISIONS.md "Exited/zero-balance folios: hidden but retained"
    // — AXIS is the proof case. The engine never drops exited funds from
    // `funds` (active:false), so realised gains and the money-weighted
    // return still reflect that history.
    const pf = analyzePortfolio(readFixture('axis.txt'))
    expect(pf.realised).not.toBe(0)
    expect(pf.allTimeReturn).not.toBeNull()
    expect(isFinite(pf.allTimeReturn as number)).toBe(true)
  })

  it('trailing 1-year XIRR is a sane finite number distinct from the all-time figure (alok_2026 spans many years)', () => {
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    expect(pf.portXirr1Y).not.toBeNull()
    expect(isFinite(pf.portXirr1Y as number)).toBe(true)
    // A trailing-1Y window and an all-time-since-2015 window are different
    // periods — the two figures coinciding exactly would be suspicious.
    expect(pf.portXirr1Y).not.toBe(pf.portXirr)
  })

  it('trailing 1-year XIRR is null when the portfolio has under a year of history (no window to anchor a starting value)', () => {
    const pf = analyzePortfolio(readFixture('axis.txt'))
    if (pf.inceptionYears !== null && pf.inceptionYears < 1) {
      expect(pf.portXirr1Y).toBeNull()
    }
  })

  it('no phantom loss on a switched/partially-redeemed fund (CAGR uses remaining cost basis)', () => {
    // ICICI Prudential Arbitrage Fund (INF109K016O4) in alok_2026 was
    // partially switched — its market value is well above zero and its
    // per-fund CAGR must not read as a large loss purely from gross
    // historical purchases dwarfing the surviving value.
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    const arb = pf.funds.find((f) => f.isin === 'INF109K016O4')
    expect(arb).toBeDefined()
    expect(arb!.marketValue).toBeGreaterThan(0)
    expect(arb!.cagr).not.toBeNull()
    expect(arb!.cagr as number).toBeGreaterThan(-0.5) // sanity: not a phantom near-total-loss
  })

  it('never shows the same scheme twice in funds[], even when a statement holds it across multiple folios', () => {
    // vandana_kfintech.txt is a real fixture with 3 ISINs each duplicated
    // across two folios (INF109K01Q49, INF109K016O4, INF109K012K1) — before
    // groupSchemesByIdentity, this produced two near-duplicate Fund entries
    // per such ISIN (the bug a real user hit: the same fund shown twice
    // under Data Sources/Fund Cards). The golden totalValue gate (above)
    // already proves consolidation doesn't change the portfolio-level total;
    // this proves it also collapses the per-fund list correctly.
    const pf = analyzePortfolio(readFixture('vandana_kfintech.txt'))
    const keys = pf.funds.map((f) => f.isin || f.name)
    expect(new Set(keys).size).toBe(keys.length)
    const dupIsin = pf.funds.find((f) => f.isin === 'INF109K016O4')
    expect(dupIsin?.folio).toContain(', ') // both folios present, joined
  })
})
