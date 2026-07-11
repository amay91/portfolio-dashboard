import { _sx, _sy, axisTicks, inrUnit } from './scales'
import type { AxisTick } from './types'
import { inr } from '../format'
import type { Series } from '../engine/types'

export interface InvestedPoint {
  year: number
  ts: number
  monthLabel: string
  value: number
  invested: number
  x: number
  y: number
  iy: number
}
export interface YearTick {
  year: number
  x: number
}
export interface InvestedGeometry {
  points: InvestedPoint[]
  yAxis: AxisTick[]
  yearTicks: YearTick[]
  unit: { div: number; suf: string }
}

// "Mon YYYY" — local time, matching series.ts's own monthly grid (built via
// native local Date mutations, not UTC), so the label always names the same
// calendar month the sample actually represents.
function monthLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

// The portfolio's current headline totals (the KPI tiles), used to correct
// the series' own reconstructed endpoint — see `latest` below.
export interface LatestTotals {
  value: number
  cost: number
}

// All the scaled coordinates the Invested-vs-Value chart needs to draw
// itself, computed once as plain data so both the interactive React SVG
// (InvestedChart.tsx) and its tests can consume it without duplicating the
// scaling math. Null when there's nothing to draw a line between.
//
// `latest`, when supplied, overrides the series' own last sample with the
// portfolio's authoritative current totals (`pf.totalValue`/`pf.totalCost`)
// before any scaling happens. The series' own net-cash-flow reconstruction
// of "invested" can drift slightly from the KPI tiles' cost basis (e.g. a
// carried-in opening balance with no dated buy transaction inside the
// tracked window contributes to `totalCost` but not to the series' flow
// tally) — reported in review as the hover tooltip disagreeing with the
// dashboard's own Total Value/Invested figures. Without `latest`, the raw
// series data is used as-is (kept optional so callers with only synthetic
// series data — tests — don't need a portfolio to call this).
export function investedGeometry(s: Series, latest?: LatestTotals): InvestedGeometry | null {
  const d = s.line
  if (!d || d.length < 2) return null
  const raw = latest ? [...d.slice(0, -1), { ...d[d.length - 1], value: latest.value, invested: latest.cost }] : d

  const xmin = s.inceptionYear
  const xmax = Math.max(...raw.map((p) => p.year), xmin + 0.5)
  const vmax = Math.max(...raw.map((p) => Math.max(p.value, p.invested)), 1)
  const rawTicks = axisTicks(0, vmax, 5)
  // Math.max(vmax, ...): niceStep's rounding can produce a last tick below
  // vmax (see the identical fix + comment in holdings.ts), which used to let
  // the value/invested line plot above the chart's top gridline instead of
  // being scaled to fit under it. annual.ts/capital.ts/rolling.ts already
  // guard this the same way.
  const ymax = Math.max(vmax, rawTicks[rawTicks.length - 1] || vmax)
  const unit = inrUnit(ymax)

  // One point per monthly sample (see series.ts's monthly grid) — this is
  // both what draws the line AND, as of task U-hover-2, what the hover/
  // keyboard tooltip snaps to (previously aggregated down to one point per
  // calendar year, which made the tooltip jump in large, choppy steps).
  const points = raw.map((p) => ({
    year: p.year,
    ts: p.ts,
    monthLabel: monthLabel(p.ts),
    value: p.value,
    invested: p.invested,
    x: _sx(p.year, xmin, xmax),
    y: _sy(p.value, 0, ymax),
    iy: _sy(p.invested, 0, ymax),
  }))
  const yAxis = rawTicks.map((v) => ({
    value: v,
    y: _sy(v, 0, ymax),
    label: (v / unit.div).toLocaleString('en-IN', { maximumFractionDigits: v / unit.div < 10 ? 1 : 0 }),
  }))
  const yearTicks: YearTick[] = []
  for (let yr = Math.ceil(xmin); yr <= Math.floor(xmax + 1e-9); yr++) yearTicks.push({ year: yr, x: _sx(yr, xmin, xmax) })

  return { points, yAxis, yearTicks, unit }
}

// The gallery caption under the Invested-vs-Value slide — plain text (no
// HTML), safe to render directly via JSX.
export function investedCaption(s: Series, latest?: LatestTotals): string | null {
  const geo = investedGeometry(s, latest)
  if (!geo) return null
  const last = geo.points[geo.points.length - 1]
  return `Reconstructed from your own transaction prices and today’s NAVs — the value line ends exactly at the current ${inr(last.value)} market value against ${inr(last.invested)} of net capital deployed. Switches between funds net out, so the invested line reflects external money only.`
}
