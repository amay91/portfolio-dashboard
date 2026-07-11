import { describe, expect, it } from 'vitest'
import { rollingGeometry } from './rolling'
import type { Series } from '../engine/types'

function series(rolling: { t: number; ret: number; expanding: boolean; ts?: number }[]): Series {
  return {
    inception: new Date(2020, 0, 1),
    valDate: new Date(2024, 0, 1),
    inceptionYear: 2020,
    line: [],
    drawdown: [],
    // ts defaults to a placeholder derived from `t` (years since inception)
    // when a test doesn't care about the exact calendar date.
    rolling: rolling.map((r) => ({ ts: +new Date(2020, 0, 1) + r.t * 365.25 * 86400000, ...r })),
    annual: [],
    contrib: [],
  }
}

describe('rollingGeometry', () => {
  it('returns null with fewer than 2 points', () => {
    expect(rollingGeometry(series([]))).toBeNull()
    expect(rollingGeometry(series([{ t: 0.5, ret: 0.1, expanding: true }]))).toBeNull()
  })

  it('splits points into the expanding (since-inception) and rolling (trailing-1Y) segments', () => {
    const geo = rollingGeometry(
      series([
        { t: 0.5, ret: 0.05, expanding: true },
        { t: 0.9, ret: 0.08, expanding: true },
        { t: 1.5, ret: 0.12, expanding: false },
        { t: 2.0, ret: 0.15, expanding: false },
      ]),
    )!
    expect(geo.expPoints.map((p) => p.t)).toEqual([0.5, 0.9])
    // rollPoints is bridged from the last expanding point for line continuity
    expect(geo.rollPoints.map((p) => p.t)).toEqual([0.9, 1.5, 2.0])
  })

  it('keeps every monthly sample in `points` — hover/keyboard snaps per month, not aggregated to one per year (task U-hover-2)', () => {
    const geo = rollingGeometry(
      series([
        { t: 0.5, ret: 0.05, expanding: true },
        { t: 0.9, ret: 0.08, expanding: true },
        { t: 1.5, ret: 0.12, expanding: false },
        { t: 1.9, ret: 0.155, expanding: false },
      ]),
    )!
    expect(geo.points.length).toBe(4)
    expect(geo.points.map((p) => +p.retPct.toFixed(3))).toEqual([5, 8, 12, 15.5])
  })

  it('labels each point with the correct expanding/rolling regime and a "Mon YYYY" label derived from its timestamp', () => {
    const geo = rollingGeometry(
      series([
        { t: 0.5, ret: 0.05, expanding: true, ts: +new Date(2020, 5, 1) },
        { t: 1.5, ret: 0.12, expanding: false, ts: +new Date(2021, 5, 1) },
      ]),
    )!
    expect(geo.points[0].expanding).toBe(true)
    expect(geo.points[0].monthLabel).toBe('Jun 2020')
    expect(geo.points[1].expanding).toBe(false)
    expect(geo.points[1].monthLabel).toBe('Jun 2021')
  })

  it('yearTicks stay whole-year x-axis gridlines only, independent of hover granularity', () => {
    const geo = rollingGeometry(
      series([
        { t: 0.5, ret: 0.05, expanding: true },
        { t: 1.9, ret: 0.15, expanding: false },
      ]),
    )!
    expect(geo.yearTicks.map((t) => t.year)).toEqual([0, 1])
  })
})
