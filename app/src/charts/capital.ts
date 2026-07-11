import { CW, ML, MR, _sy, axisTicks, inrUnit } from './scales'
import type { AxisTick } from './types'
import type { Series } from '../engine/types'

export interface CapitalBar {
  year: number
  amount: number
  x: number
  barX: number
  barW: number
  barY: number
  barH: number
  labelY: number
  positive: boolean
}
export interface CapitalGeometry {
  bars: CapitalBar[]
  yAxis: AxisTick[]
  unit: { div: number; suf: string }
}

// Plain geometry for the Net Capital Added by Year bar chart — same pattern
// as annualGeometry().
export function capitalGeometry(s: Series): CapitalGeometry | null {
  const d = s.contrib
  if (!d || !d.length) return null
  const vals = d.map((c) => c.amount)
  let lo = Math.min(0, ...vals)
  let hi = Math.max(0, ...vals)
  const yt = axisTicks(lo, hi, 5)
  lo = Math.min(lo, yt[0])
  hi = Math.max(hi, yt[yt.length - 1])
  const unit = inrUnit(Math.max(hi, -lo, 1))
  const n = d.length
  const bw = Math.min(54, ((CW - ML - MR) / n) * 0.6)

  const yAxis: AxisTick[] = yt.map((v) => ({
    value: v,
    y: _sy(v, lo, hi),
    label: (v / unit.div).toLocaleString('en-IN', { maximumFractionDigits: Math.abs(v) / unit.div < 10 ? 1 : 0 }),
  }))
  const bars: CapitalBar[] = d.map((c, i) => {
    const cx = ML + ((i + 0.5) / n) * (CW - ML - MR)
    const y0 = _sy(0, lo, hi)
    const y1 = _sy(c.amount, lo, hi)
    const top = Math.min(y0, y1)
    const h = Math.max(1.5, Math.abs(y1 - y0))
    const positive = c.amount >= 0
    return { year: c.year, amount: c.amount, x: cx, barX: cx - bw / 2, barW: bw, barY: top, barH: h, labelY: positive ? top - 4 : top + h + 11, positive }
  })

  return { bars, yAxis, unit }
}

export const CAPITAL_CAPTION =
  'Net of redemptions and internal switches, so this is the fresh capital you committed each year — a view of your saving/investing cadence rather than market movement.'
