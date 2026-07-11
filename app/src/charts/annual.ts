import { CW, ML, MR, _sy, axisTicks } from './scales'
import type { AxisTick } from './types'
import type { Series } from '../engine/types'

export interface AnnualBar {
  year: number
  partial: boolean
  retPct: number
  x: number // bar center
  barX: number
  barW: number
  barY: number
  barH: number
  labelY: number // above the bar for a gain, below for a loss
  positive: boolean
}
export interface AnnualGeometry {
  bars: AnnualBar[]
  yAxis: AxisTick[]
}

// Plain geometry for the Calendar-Year Returns bar chart — computed once so
// the interactive React SVG (AnnualChart.tsx) and its tests share the exact
// same scaling math, same pattern as investedGeometry().
export function annualGeometry(s: Series): AnnualGeometry | null {
  const d = (s.annual || []).filter((a): a is typeof a & { ret: number } => a.ret != null)
  if (!d.length) return null
  const r = d.map((a) => a.ret * 100)
  let lo = Math.min(0, ...r)
  let hi = Math.max(0, ...r)
  const yt = axisTicks(lo, hi, 5)
  lo = Math.min(lo, yt[0])
  hi = Math.max(hi, yt[yt.length - 1])
  const n = d.length
  const bw = Math.min(54, ((CW - ML - MR) / n) * 0.6)

  const yAxis: AxisTick[] = yt.map((v) => ({ value: v, y: _sy(v, lo, hi), label: v.toFixed(0) + '%' }))
  const bars: AnnualBar[] = d.map((a, i) => {
    const cx = ML + ((i + 0.5) / n) * (CW - ML - MR)
    const v = a.ret * 100
    const y0 = _sy(0, lo, hi)
    const y1 = _sy(v, lo, hi)
    const top = Math.min(y0, y1)
    const h = Math.max(1.5, Math.abs(y1 - y0))
    const positive = v >= 0
    return { year: a.year, partial: a.partial, retPct: v, x: cx, barX: cx - bw / 2, barW: bw, barY: top, barH: h, labelY: positive ? top - 4 : top + h + 11, positive }
  })

  return { bars, yAxis }
}

export function annualCaption(geo: AnnualGeometry): string {
  const partial = geo.bars.some((b) => b.partial)
  return `Each bar is that year’s money-weighted (Modified Dietz) return, which accounts for when your contributions landed within the year.${partial ? ' The starred year is partial (year-to-date).' : ''}`
}
