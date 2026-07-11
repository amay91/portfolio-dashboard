import { describe, expect, it } from 'vitest'
import { xirr } from './xirr'

describe('xirr', () => {
  it('returns null for fewer than 2 non-zero flows', () => {
    expect(xirr([{ date: new Date('2024-01-01'), amount: -100 }])).toBeNull()
    expect(xirr([])).toBeNull()
  })

  it('matches a hand-computable IRR: invest 100, get back 121 exactly 2 years later (10% p.a.)', () => {
    const r = xirr([
      { date: new Date(Date.UTC(2022, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 121 },
    ])
    expect(r).not.toBeNull()
    expect(r as number).toBeCloseTo(0.1, 2)
  })

  it('matches ~100% annualized return: invest 100, get back 200 exactly 1 year later', () => {
    const r = xirr([
      { date: new Date(Date.UTC(2023, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 200 },
    ])
    expect(r).not.toBeNull()
    expect(r as number).toBeCloseTo(1.0, 1)
  })

  it('is order-independent (sorts flows by date internally)', () => {
    const a = xirr([
      { date: new Date(Date.UTC(2022, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 121 },
    ])
    const b = xirr([
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 121 },
      { date: new Date(Date.UTC(2022, 0, 1)), amount: -100 },
    ])
    expect(a).toBeCloseTo(b as number, 6)
  })

  it('handles multiple staggered contributions (a simple SIP-like series)', () => {
    // Three equal 100 investments a year apart, redeemed for 400 at year 2 —
    // a positive but unremarkable return; just checking it converges to a
    // sane, non-null, non-extreme value rather than a specific constant.
    const r = xirr([
      { date: new Date(Date.UTC(2022, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2023, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 400 },
    ])
    expect(r).not.toBeNull()
    expect(r as number).toBeGreaterThan(0)
    expect(r as number).toBeLessThan(1)
  })

  it('ignores zero-amount flows', () => {
    const withZero = xirr([
      { date: new Date(Date.UTC(2022, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2023, 0, 1)), amount: 0 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 121 },
    ])
    const withoutZero = xirr([
      { date: new Date(Date.UTC(2022, 0, 1)), amount: -100 },
      { date: new Date(Date.UTC(2024, 0, 1)), amount: 121 },
    ])
    expect(withZero).toBeCloseTo(withoutZero as number, 6)
  })
})
