import { describe, expect, it } from 'vitest'
import { weightedCAGR } from './cagr'

describe('weightedCAGR', () => {
  it('matches a hand-computable case: single buy, 100 -> 200 over exactly 1 year', () => {
    const r = weightedCAGR(
      [{ date: new Date(Date.UTC(2023, 0, 1)), amount: 100 }],
      200,
      new Date(Date.UTC(2024, 0, 1)),
    )
    expect(r).not.toBeNull()
    expect(r as number).toBeCloseTo(1.0, 2)
  })

  it('uses costOverride (remaining cost basis) instead of gross historical cost', () => {
    // Bought 1000 total, but 900 was redeemed -> remaining cost basis is 100.
    // Without the override this would compute against the full 1000 and read
    // as a phantom loss even though the surviving value doubled.
    const buys = [
      { date: new Date(Date.UTC(2020, 0, 1)), amount: 500 },
      { date: new Date(Date.UTC(2021, 0, 1)), amount: 500 },
    ]
    const withoutOverride = weightedCAGR(buys, 200, new Date(Date.UTC(2024, 0, 1)))
    const withOverride = weightedCAGR(buys, 200, new Date(Date.UTC(2024, 0, 1)), 100)
    expect(withoutOverride).not.toBeNull()
    expect(withOverride).not.toBeNull()
    expect(withoutOverride as number).toBeLessThan(0) // phantom loss without the override
    expect(withOverride as number).toBeGreaterThan(0) // genuine gain with it
  })

  it('returns null for a non-positive gross cost or end value', () => {
    expect(weightedCAGR([], 100, new Date())).toBeNull()
    expect(weightedCAGR([{ date: new Date(), amount: 100 }], 0, new Date())).toBeNull()
  })

  it('returns null when the weighted purchase epoch is not before the end date', () => {
    const r = weightedCAGR(
      [{ date: new Date(Date.UTC(2024, 0, 1)), amount: 100 }],
      200,
      new Date(Date.UTC(2023, 0, 1)), // end date before the buy
    )
    expect(r).toBeNull()
  })
})
