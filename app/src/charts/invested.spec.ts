import { describe, expect, it } from 'vitest'
import { investedCaption, investedGeometry } from './invested'
import { CH, MB, MT } from './scales'
import type { Series } from '../engine/types'

function series(line: { year: number; invested: number; value: number; ts?: number }[]): Series {
  return {
    inception: new Date(2020, 0, 1),
    valDate: new Date(2024, 0, 1),
    inceptionYear: line[0]?.year ?? 2020,
    // ts defaults to a placeholder derived from the decimal `year` when a
    // test doesn't care about the exact calendar date.
    line: line.map((p) => ({ ts: +new Date(Math.floor(p.year), Math.round((p.year % 1) * 12), 1), ...p })),
    drawdown: [],
    rolling: [],
    annual: [],
    contrib: [],
  }
}

describe('investedGeometry', () => {
  it('returns null with fewer than 2 points (nothing to draw a line between)', () => {
    expect(investedGeometry(series([]))).toBeNull()
    expect(investedGeometry(series([{ year: 2020, invested: 1000, value: 1000 }]))).toBeNull()
  })

  it('produces one geometry point per series point, preserving order and raw values', () => {
    const s = series([
      { year: 2020, invested: 100000, value: 100000 },
      { year: 2021, invested: 200000, value: 250000 },
      { year: 2022, invested: 300000, value: 280000 },
    ])
    const geo = investedGeometry(s)!
    expect(geo.points.map((p) => p.year)).toEqual([2020, 2021, 2022])
    expect(geo.points[1].invested).toBe(200000)
    expect(geo.points[1].value).toBe(250000)
  })

  it('covers every whole year from inception to the last point with an x-axis tick', () => {
    const s = series([
      { year: 2020.5, invested: 1000, value: 1000 },
      { year: 2023.2, invested: 5000, value: 6000 },
    ])
    const geo = investedGeometry(s)!
    expect(geo.yearTicks.map((t) => t.year)).toEqual([2021, 2022, 2023])
  })

  it('keeps every monthly sample in `points` — hover/keyboard snaps per month, not aggregated to one per year (task U-hover-2)', () => {
    // series.line is sampled monthly; hover used to aggregate this down to
    // one point per year (choppy), then was changed to snap to every sample
    // instead, so this now asserts the *opposite* of the old aggregation.
    const s = series([
      { year: 2020.9, invested: 1000, value: 1000 },
      { year: 2021.0, invested: 1100, value: 1200 },
      { year: 2021.5, invested: 1500, value: 1900 },
      { year: 2022.1, invested: 2000, value: 2600 },
    ])
    const geo = investedGeometry(s)!
    expect(geo.points.length).toBe(4)
    expect(geo.points.map((p) => p.invested)).toEqual([1000, 1100, 1500, 2000])
  })

  it('labels each point with a "Mon YYYY" string derived from its exact timestamp, not the lossy decimal year', () => {
    const s = series([
      { year: 2020.9, invested: 1000, value: 1000, ts: +new Date(2020, 10, 1) },
      { year: 2021.5, invested: 1500, value: 1900, ts: +new Date(2021, 5, 1) },
    ])
    const geo = investedGeometry(s)!
    expect(geo.points[0].monthLabel).toBe('Nov 2020')
    expect(geo.points[1].monthLabel).toBe('Jun 2021')
  })

  it('regression: the final (current, partial) sample carries the true last point\'s figures', () => {
    // Reported in review: hovering the end of the line showed a mid-year
    // figure instead of the portfolio's actual latest total. Since hover now
    // snaps to every monthly sample directly (not an aggregated "latest
    // within the year"), the true endpoint is simply the last point.
    const s = series([
      { year: 2025.0, invested: 10000, value: 10000 },
      { year: 2026.0, invested: 15000, value: 16000 },
      { year: 2026.5, invested: 19926177, value: 25391395 }, // the true "as of today" endpoint
    ])
    const geo = investedGeometry(s)!
    const last = geo.points[geo.points.length - 1]
    expect(last.invested).toBe(19926177)
    expect(last.value).toBe(25391395)
  })

  it('never plots a point above the chart\'s top edge, even when niceStep rounds the axis max below the true peak value (2026-07-11 regression, same root cause as the holdings-chart bar overflow)', () => {
    // niceStep(1274000, 5) rounds to a step of 200000, producing a last tick
    // of 1,200,000 -- short of the true 1,274,000 peak. Using that tick as
    // ymax unconditionally scaled the value point above y=MT (off the top).
    const s = series([
      { year: 2020, invested: 1000, value: 1000 },
      { year: 2021, invested: 1274000, value: 1274000 },
    ])
    const geo = investedGeometry(s)!
    const top = geo.points[geo.points.length - 1]
    expect(top.y).toBeGreaterThanOrEqual(MT)
    expect(top.y).toBeLessThanOrEqual(CH - MB)
  })

  it('anchors the final point to the portfolio\'s authoritative totals when `latest` is supplied, overriding the series\' own reconstruction', () => {
    // Reported in review: the series' own net-cash-flow "invested" tracking
    // can drift from the KPI tiles' cost basis (e.g. a carried-in opening
    // balance with no dated buy inside the tracked window) — the last point
    // (and its year) must always agree with the dashboard's own totals.
    const s = series([
      { year: 2025.0, invested: 10000, value: 10000 },
      { year: 2026.5, invested: 19515013.4, value: 25165629.48 }, // series' own (slightly off) reconstruction
    ])
    const geo = investedGeometry(s, { value: 25391395, cost: 19926177 })!
    const lastRaw = geo.points[geo.points.length - 1]
    expect(lastRaw.value).toBe(25391395)
    expect(lastRaw.invested).toBe(19926177)
    // Earlier points are untouched — only the endpoint is corrected.
    expect(geo.points[0].value).toBe(10000)
  })
})

describe('investedCaption', () => {
  it('is null when there is no geometry to describe', () => {
    expect(investedCaption(series([]))).toBeNull()
  })

  it('cites the final value/invested totals without doubling the ₹ symbol', () => {
    const s = series([
      { year: 2020, invested: 100000, value: 100000 },
      { year: 2021, invested: 200000, value: 250000 },
    ])
    const cap = investedCaption(s)!
    expect(cap).not.toContain('₹₹')
    expect(cap).toMatch(/Reconstructed from your own transaction prices/)
  })
})
