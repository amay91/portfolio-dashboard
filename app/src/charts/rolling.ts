import { _sx, _sy, axisTicks } from './scales'
import type { AxisTick } from './types'
import type { Series } from '../engine/types'

export interface RollingPoint {
  t: number
  ts: number
  monthLabel: string
  retPct: number
  expanding: boolean
  x: number
  y: number
}
export interface YearTick {
  year: number
  x: number
}
export interface RollingGeometry {
  points: RollingPoint[] // every monthly sample — what the hover/keyboard tooltip snaps to
  expPoints: RollingPoint[] // the dashed since-inception segment (drawn first)
  rollPoints: RollingPoint[] // the solid trailing-1Y segment, bridged from the last expanding point
  yAxis: AxisTick[]
  yearTicks: YearTick[] // x-axis gridlines only (whole years since inception) — unrelated to hover granularity
}

// "Mon YYYY" — local time, matching series.ts's own monthly grid.
function monthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

export function rollingGeometry(s: Series): RollingGeometry | null {
  const d = s.rolling
  if (!d || d.length < 2) return null
  const xmax = Math.max(...d.map((p) => p.t), 1)
  const r = d.map((p) => p.ret * 100)
  let lo = Math.min(0, ...r)
  let hi = Math.max(0, ...r)
  const yt = axisTicks(lo, hi, 5)
  lo = Math.min(lo, yt[0])
  hi = Math.max(hi, yt[yt.length - 1])

  const points: RollingPoint[] = d.map((p) => ({
    t: p.t,
    ts: p.ts,
    monthLabel: monthLabel(p.ts),
    retPct: p.ret * 100,
    expanding: p.expanding,
    x: _sx(p.t, 0, xmax),
    y: _sy(p.ret * 100, lo, hi),
  }))
  const exp = points.filter((p) => p.expanding)
  const roll = points.filter((p) => !p.expanding)
  const rollPoints = exp.length && roll.length ? [exp[exp.length - 1], ...roll] : roll

  const yAxis: AxisTick[] = yt.map((v) => ({ value: v, y: _sy(v, lo, hi), label: v.toFixed(0) + '%' }))

  const yearTicks: YearTick[] = []
  for (let yr = 0; yr <= Math.floor(xmax + 1e-9); yr++) yearTicks.push({ year: yr, x: _sx(yr, 0, xmax) })

  return { points, expPoints: exp, rollPoints, yAxis, yearTicks }
}

export const ROLLING_CAPTION =
  'Each point is the money-weighted return over the preceding 12 months. Until a full year of history exists, the dashed line shows the cumulative since-inception return instead, so the early portfolio still has a meaningful reading.'
