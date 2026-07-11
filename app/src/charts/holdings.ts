import { CH, CW, ML, MR, MT, MB, axisTicks, inrUnit } from './scales'
import { shortName } from '../format'
import type { Fund } from '../engine/types'

export interface HoldingsBar {
  name: string
  marketValue: number
  cy: number
  barY: number
  barH: number
  barW: number
}
export interface XTick {
  value: number
  x: number
  label: string
}
export interface HoldingsGeometry {
  bars: HoldingsBar[]
  xAxis: XTick[]
  x0: number
  unit: { div: number; suf: string }
  topConcentrationPct: number
  truncated: boolean
}

// Plain geometry for the horizontal Holdings-by-Value bar chart — same
// pattern as annualGeometry()/capitalGeometry(), just laid out along X
// instead of Y.
export function holdingsGeometry(funds: Fund[], totalValue: number): HoldingsGeometry | null {
  const f = (funds || [])
    .filter((x) => x.active)
    .sort((a, b) => b.marketValue - a.marketValue)
    .slice(0, 10)
  if (!f.length) return null
  const vmax = Math.max(...f.map((x) => x.marketValue), 1)
  const yt = axisTicks(0, vmax, 4)
  // Math.max(vmax, ...), not just the last tick alone: niceStep's rounding
  // can legitimately produce a last tick BELOW vmax (e.g. vmax=3.4 rounds to
  // ticks [0,1,2,3], not 4 — see niceStep in scales.ts), which used to let
  // the top holding's bar scale past 100% of the drawable width and run off
  // the SVG entirely, taking its value label with it. annual.ts/capital.ts/
  // rolling.ts already guard their own axis max the same way; holdings.ts
  // (and invested.ts's ymax) didn't. Found via a randomized-portfolio sweep
  // (2026-07-11).
  const xmax = Math.max(vmax, yt[yt.length - 1] || vmax)
  const unit = inrUnit(xmax)
  const rowH = (CH - MT - MB) / f.length
  const barH = Math.min(24, rowH * 0.62)
  const x0 = ML + 118
  // Reserve room for the value label drawn just past each bar's end (see
  // HoldingsChart.tsx: `x0 + barW + 5`, textAnchor="start") — without this,
  // the top holding's bar (which can legitimately reach close to xmax's own
  // full width) pushes its label past the SVG's right edge entirely,
  // clipping it. Found via a randomized-portfolio sweep (2026-07-11) where a
  // single large holding's "₹3.4Cr"-style label rendered off-canvas.
  const LABEL_RESERVE = 50
  const xw = CW - MR - x0 - LABEL_RESERVE
  const sx = (v: number) => x0 + (v / xmax) * xw

  const xAxis: XTick[] = yt.map((v) => ({
    value: v,
    x: sx(v),
    label: (v / unit.div).toLocaleString('en-IN', { maximumFractionDigits: v / unit.div < 10 ? 1 : 0 }),
  }))
  const bars: HoldingsBar[] = f.map((x, i) => ({
    name: shortName(x.name),
    marketValue: x.marketValue,
    cy: MT + (i + 0.5) * rowH,
    barY: MT + (i + 0.5) * rowH - barH / 2,
    barH,
    barW: Math.max(1, sx(x.marketValue) - x0),
  }))

  return { bars, xAxis, x0, unit, topConcentrationPct: (f[0].marketValue / totalValue) * 100, truncated: f.length >= 10 }
}

// Plain text (no HTML) — rendered directly via JSX, so no escapeHtml needed
// (the old string-builder needed it only because it fed dangerouslySetInnerHTML).
export function holdingsCaption(geo: HoldingsGeometry): string {
  const top = geo.bars[0]
  return `Top holding “${top.name}” is ${geo.topConcentrationPct.toFixed(0)}% of the portfolio.${geo.truncated ? ' Showing the ten largest positions.' : ''}`
}
