import { describe, expect, it } from 'vitest'
import { donutPaths } from './donutGeometry'

describe('donutPaths', () => {
  it('fractions reflect each value proportion to total', () => {
    const slices = donutPaths([
      { key: 'equity', value: 75 },
      { key: 'debt', value: 25 },
    ])
    expect(slices[0].frac).toBeCloseTo(0.75, 6)
    expect(slices[1].frac).toBeCloseTo(0.25, 6)
  })

  it('produces one path per input value, each a well-formed SVG path string', () => {
    const slices = donutPaths([
      { key: 'equity', value: 40 },
      { key: 'debt', value: 30 },
      { key: 'cash', value: 20 },
      { key: 'other', value: 10 },
    ])
    expect(slices).toHaveLength(4)
    for (const s of slices) expect(s.d).toMatch(/^M[\d.-]+ [\d.-]+ A150 150 0 [01] 1/)
  })

  it('does not divide by zero when total value is 0', () => {
    const slices = donutPaths([
      { key: 'equity', value: 0 },
      { key: 'debt', value: 0 },
    ])
    expect(slices.every((s) => isFinite(s.frac))).toBe(true)
  })
})
