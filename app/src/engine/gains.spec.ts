import { describe, expect, it } from 'vitest'
import { ltcgMonths, realisedGains, unrealisedGains } from './gains'

describe('ltcgMonths', () => {
  it('is 12 months for equity', () => {
    expect(ltcgMonths('equity')).toBe(12)
  })
  it('is 24 months for debt', () => {
    expect(ltcgMonths('debt')).toBe(24)
  })
})

describe('unrealisedGains', () => {
  it('classifies a lot held over the equity 12-month threshold as LTCG', () => {
    const buys = [{ date: new Date(Date.UTC(2022, 0, 1)), units: 100, price: 10 }]
    const asOf = new Date(Date.UTC(2024, 0, 1)) // 24 months later
    const { stcg, ltcg } = unrealisedGains(buys, 100, 100, 15, asOf, 12)
    expect(ltcg).toBeCloseTo(100 * (15 - 10), 6) // 500
    expect(stcg).toBe(0)
  })

  it('classifies a lot held under the threshold as STCG', () => {
    const buys = [{ date: new Date(Date.UTC(2024, 0, 1)), units: 100, price: 10 }]
    const asOf = new Date(Date.UTC(2024, 5, 1)) // ~5 months later
    const { stcg, ltcg } = unrealisedGains(buys, 100, 100, 15, asOf, 12)
    expect(stcg).toBeCloseTo(100 * (15 - 10), 6)
    expect(ltcg).toBe(0)
  })

  it('scales each lot by the surviving fraction when units were partially sold', () => {
    // Bought 100, only 50 remain held (half sold) -> each lot counted at half.
    const buys = [{ date: new Date(Date.UTC(2022, 0, 1)), units: 100, price: 10 }]
    const asOf = new Date(Date.UTC(2024, 0, 1))
    const { ltcg } = unrealisedGains(buys, 100, 50, 15, asOf, 12)
    expect(ltcg).toBeCloseTo(50 * (15 - 10), 6) // 250, not 500
  })

  it('returns zero gains when units held is effectively zero', () => {
    const buys = [{ date: new Date(Date.UTC(2022, 0, 1)), units: 100, price: 10 }]
    const { stcg, ltcg } = unrealisedGains(buys, 100, 0, 15, new Date(), 12)
    expect(stcg).toBe(0)
    expect(ltcg).toBe(0)
  })
})

describe('realisedGains', () => {
  it('returns all zeros when there were no sells', () => {
    expect(realisedGains([], null, 100, 1000, 12)).toEqual({ realised: 0, realisedLT: 0, realisedST: 0 })
  })

  it('classifies a full redemption held over the threshold as LTCG', () => {
    const sells = [{ date: new Date(Date.UTC(2024, 0, 1)), amount: -1500, units: -100 }]
    const r = realisedGains(sells, new Date(Date.UTC(2022, 0, 1)), 100, 1000, 12)
    expect(r.realised).toBeCloseTo(500, 6) // proceeds 1500 - cost 1000
    expect(r.realisedLT).toBeCloseTo(500, 6)
    expect(r.realisedST).toBe(0)
  })

  it('classifies a full redemption held under the threshold as STCG', () => {
    const sells = [{ date: new Date(Date.UTC(2024, 5, 1)), amount: -1500, units: -100 }]
    const r = realisedGains(sells, new Date(Date.UTC(2024, 0, 1)), 100, 1000, 12)
    expect(r.realisedLT).toBe(0)
    expect(r.realisedST).toBeCloseTo(500, 6)
  })

  it('scales sold cost proportionally on a partial redemption', () => {
    // Bought 100 units for 1000 total; sold 25 (a quarter) for 375.
    const sells = [{ date: new Date(Date.UTC(2024, 0, 1)), amount: -375, units: -25 }]
    const r = realisedGains(sells, new Date(Date.UTC(2022, 0, 1)), 100, 1000, 12)
    expect(r.realised).toBeCloseTo(375 - 250, 6) // cost = 1000 * (25/100) = 250
  })
})
