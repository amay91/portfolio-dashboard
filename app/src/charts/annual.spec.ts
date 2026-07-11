import { describe, expect, it } from 'vitest'
import { annualCaption, annualGeometry } from './annual'
import type { Series } from '../engine/types'

function series(annual: { year: number; ret: number | null; partial: boolean }[]): Series {
  return {
    inception: new Date(2020, 0, 1),
    valDate: new Date(2024, 0, 1),
    inceptionYear: 2020,
    line: [],
    drawdown: [],
    rolling: [],
    annual,
    contrib: [],
  }
}

describe('annualGeometry', () => {
  it('returns null when there are no calendar years with a computed return', () => {
    expect(annualGeometry(series([]))).toBeNull()
    expect(annualGeometry(series([{ year: 2020, ret: null, partial: false }]))).toBeNull()
  })

  it('skips years with a null return (not enough history that year) but keeps the rest', () => {
    const geo = annualGeometry(
      series([
        { year: 2020, ret: null, partial: false },
        { year: 2021, ret: 0.12, partial: false },
        { year: 2022, ret: -0.05, partial: false },
      ]),
    )!
    expect(geo.bars.map((b) => b.year)).toEqual([2021, 2022])
  })

  it('marks a bar positive/negative correctly, matching the sign convention used for its colour and label', () => {
    const geo = annualGeometry(
      series([
        { year: 2021, ret: 0.204, partial: false },
        { year: 2022, ret: -0.183, partial: false },
      ]),
    )!
    expect(geo.bars[0].positive).toBe(true)
    expect(geo.bars[0].retPct).toBeCloseTo(20.4, 5)
    expect(geo.bars[1].positive).toBe(false)
    expect(geo.bars[1].retPct).toBeCloseTo(-18.3, 5)
  })

  it('carries the partial flag through for the current (year-to-date) bar', () => {
    const geo = annualGeometry(
      series([
        { year: 2025, ret: 0.05, partial: false },
        { year: 2026, ret: 0.03, partial: true },
      ]),
    )!
    expect(geo.bars[1].partial).toBe(true)
    expect(geo.bars[0].partial).toBe(false)
  })
})

describe('annualCaption', () => {
  it('mentions the partial-year caveat only when a bar is actually partial', () => {
    const full = annualGeometry(series([{ year: 2021, ret: 0.1, partial: false }]))!
    expect(annualCaption(full)).not.toMatch(/partial/)

    const withPartial = annualGeometry(series([{ year: 2026, ret: 0.03, partial: true }]))!
    expect(annualCaption(withPartial)).toMatch(/partial/)
  })
})
