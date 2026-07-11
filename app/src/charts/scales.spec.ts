import { describe, expect, it } from 'vitest'
import { axisTicks, inrUnit, niceStep } from './scales'

describe('niceStep', () => {
  it('picks a round step for a given range/target', () => {
    expect(niceStep(100, 5)).toBe(20)
    expect(niceStep(10, 5)).toBe(2)
  })
  it('returns 1 for a non-positive range', () => {
    expect(niceStep(0, 5)).toBe(1)
    expect(niceStep(-5, 5)).toBe(1)
  })
})

describe('axisTicks', () => {
  it('produces evenly-stepped ticks that cover [min,max]', () => {
    const t = axisTicks(0, 100, 5)
    expect(t[0]).toBeLessThanOrEqual(0)
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(100)
    for (let i = 1; i < t.length; i++) expect(t[i] - t[i - 1]).toBeCloseTo(t[1] - t[0], 6)
  })
})

describe('inrUnit', () => {
  it('picks crore/lakh/thousands/rupee units by magnitude', () => {
    expect(inrUnit(2e7).suf).toBe('₹ crore')
    expect(inrUnit(2e5).suf).toBe('₹ lakh')
    expect(inrUnit(2e3).suf).toBe('₹ 000s')
    expect(inrUnit(50).suf).toBe('₹')
  })
})
