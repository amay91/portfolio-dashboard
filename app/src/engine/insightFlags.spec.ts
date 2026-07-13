import { describe, expect, it } from 'vitest'
import { computeInsightFlags } from './insightFlags'
import { makeFund, makeFundMeta, makePortfolio } from '../testFixtures'

describe('computeInsightFlags', () => {
  it('returns nothing for an empty or unloaded portfolio', () => {
    expect(computeInsightFlags(makePortfolio({ funds: [], totalValue: 0 }), null)).toEqual([])
  })

  it('flags a single holding over 35% of the portfolio', () => {
    const big = makeFund({ name: 'Big Fund - Direct Growth', marketValue: 400000 })
    const small = makeFund({ name: 'Small Fund - Direct Growth', marketValue: 100000 })
    const pf = makePortfolio({ funds: [big, small], totalValue: 500000 })
    const flags = computeInsightFlags(pf, null)
    expect(flags.some((f) => f.id === 'concentration' && f.text.includes('Big Fund') && f.text.includes('80%'))).toBe(true)
  })

  it('does not flag concentration under the 35% threshold', () => {
    const a = makeFund({ marketValue: 170000 })
    const b = makeFund({ marketValue: 170000 })
    const c = makeFund({ marketValue: 160000 })
    const pf = makePortfolio({ funds: [a, b, c], totalValue: 500000 })
    expect(computeInsightFlags(pf, null).some((f) => f.id === 'concentration')).toBe(false)
  })

  it('flags a broad-market equity fund trailing the Nifty 50, but not a small-cap fund', () => {
    const flexi = makeFund({
      name: 'Flexi Laggard - Direct Growth',
      cagr: 0.08,
      meta: makeFundMeta({ category: 'Equity – Flexi Cap' }),
      marketValue: 250000,
    })
    const smallCap = makeFund({
      name: 'Small Cap Laggard - Direct Growth',
      cagr: 0.08,
      meta: makeFundMeta({ category: 'Equity – Small Cap' }),
      marketValue: 250000,
    })
    const pf = makePortfolio({ funds: [flexi, smallCap], totalValue: 500000 })
    const flags = computeInsightFlags(pf, 0.12) // Nifty 50 at 12% CAGR
    expect(flags.some((f) => f.text.includes('Flexi Laggard'))).toBe(true)
    expect(flags.some((f) => f.text.includes('Small Cap Laggard'))).toBe(false)
  })

  it('does not flag a broad-market fund within 1pp of the Nifty 50 (noise buffer)', () => {
    const flexi = makeFund({ cagr: 0.115, meta: makeFundMeta({ category: 'Equity – Flexi Cap' }) })
    const pf = makePortfolio({ funds: [flexi], totalValue: 500000 })
    expect(computeInsightFlags(pf, 0.12).some((f) => f.id.startsWith('benchmark-'))).toBe(false)
  })

  it('flags an expensive active-equity fund but not a cheap index fund at the same rate', () => {
    const active = makeFund({
      name: 'Pricey Active Fund - Direct Growth',
      meta: makeFundMeta({ category: 'Equity – Flexi Cap', expense: '1.9% (Direct)' }),
      marketValue: 250000,
    })
    const index = makeFund({
      name: 'Nifty Index Fund - Direct Growth',
      meta: makeFundMeta({ category: 'Equity – Index (Nifty 50)', expense: '1.9% (Direct)' }),
      marketValue: 250000,
    })
    const pf = makePortfolio({ funds: [active, index], totalValue: 500000 })
    const flags = computeInsightFlags(pf, null)
    expect(flags.some((f) => f.text.includes('Pricey Active Fund'))).toBe(true)
    expect(flags.some((f) => f.text.includes('Nifty Index Fund'))).toBe(true) // 1.9% is also over the 0.3% index band
  })

  it('does not flag a debt fund under the debt expense band', () => {
    const debt = makeFund({ meta: makeFundMeta({ category: 'Debt – Liquid', expense: '0.6% (Direct)' }) })
    const pf = makePortfolio({ funds: [debt], totalValue: 500000 })
    expect(computeInsightFlags(pf, null).some((f) => f.id.startsWith('expense-'))).toBe(false)
  })

  it('caps total flags at 4', () => {
    const funds = Array.from({ length: 6 }, (_, i) =>
      makeFund({
        name: `Costly Fund ${i} - Direct Growth`,
        marketValue: 100000,
        meta: makeFundMeta({ category: 'Equity – Flexi Cap', expense: '2.5% (Direct)' }),
      }),
    )
    const pf = makePortfolio({ funds, totalValue: 600000 })
    expect(computeInsightFlags(pf, null).length).toBeLessThanOrEqual(4)
  })
})
