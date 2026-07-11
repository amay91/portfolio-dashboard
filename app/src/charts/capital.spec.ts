import { describe, expect, it } from 'vitest'
import { capitalGeometry } from './capital'
import type { Series } from '../engine/types'

function series(contrib: { year: number; amount: number }[]): Series {
  return {
    inception: new Date(2020, 0, 1),
    valDate: new Date(2024, 0, 1),
    inceptionYear: 2020,
    line: [],
    drawdown: [],
    rolling: [],
    annual: [],
    contrib,
  }
}

describe('capitalGeometry', () => {
  it('returns null when there is no net-flow history', () => {
    expect(capitalGeometry(series([]))).toBeNull()
  })

  it('marks a bar positive/negative by the sign of net capital flow, matching its colour', () => {
    const geo = capitalGeometry(
      series([
        { year: 2021, amount: 1000000 },
        { year: 2022, amount: -200000 },
      ]),
    )!
    expect(geo.bars[0].positive).toBe(true)
    expect(geo.bars[1].positive).toBe(false)
  })

  it('picks an inrUnit scale that fits the largest magnitude flow (positive or negative)', () => {
    const geo = capitalGeometry(
      series([
        { year: 2021, amount: 500000 },
        { year: 2022, amount: -12000000 }, // larger in magnitude, negative
      ]),
    )!
    expect(geo.unit.suf).toBe('₹ crore')
  })
})
