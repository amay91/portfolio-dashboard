import { CH, CW, ML, MR, MT, MB } from './scales'
import type { GeoEntry } from '../engine/types'

const COLORS: Record<string, string> = {
  India: 'var(--green)',
  'United States': 'var(--series-2)',
  'Gold & Commodities': 'var(--brass)',
  China: 'var(--clay)',
  'Other International': 'var(--geo-other)',
}
const pick = (c: string) => COLORS[c] || 'var(--geo-fallback)'

export interface GeoBar {
  country: string
  color: string
  pctValue: number
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
export interface GeographyGeometry {
  bars: GeoBar[]
  xAxis: XTick[]
  x0: number
  indiaPct: number
  intlPct: number
}

// Plain geometry for the horizontal Geographical Concentration bar chart —
// same pattern as holdingsGeometry().
export function geographyGeometry(geo: GeoEntry[]): GeographyGeometry | null {
  const g = (geo || []).filter((x) => x.pct > 0.0005)
  if (!g.length) return null
  const rowH = (CH - MT - MB) / Math.max(g.length, 1)
  const barH = Math.min(26, rowH * 0.6)
  const x0 = ML + 128
  // Reserve room for the "%" label drawn just past each bar's end (see
  // GeographyChart.tsx: `x0 + barW + 6`, textAnchor="start") — without this,
  // a country at or near xmax (e.g. a 100.0% single-country concentration)
  // pushes its own label past the SVG's right edge. Same class of bug as
  // holdings.ts's LABEL_RESERVE, found the same way.
  const LABEL_RESERVE = 40
  const xw = CW - MR - x0 - LABEL_RESERVE
  const xmax = Math.max(1, Math.ceil((g[0].pct * 100) / 10) * 10)
  const sx = (v: number) => x0 + (v / xmax) * xw
  const step = xmax <= 20 ? 5 : xmax <= 50 ? 10 : 20

  const xAxis: XTick[] = []
  for (let v = 0; v <= xmax + 0.1; v += step) xAxis.push({ value: v, x: sx(v), label: `${v}%` })

  const bars: GeoBar[] = g.map((x, i) => {
    const pctValue = x.pct * 100
    return {
      country: x.country,
      color: pick(x.country),
      pctValue,
      cy: MT + (i + 0.5) * rowH,
      barY: MT + (i + 0.5) * rowH - barH / 2,
      barH,
      barW: Math.max(1, sx(pctValue) - x0),
    }
  })

  const indiaPct = (g.find((x) => x.country === 'India') || { pct: 0 }).pct * 100
  return { bars, xAxis, x0, indiaPct, intlPct: 100 - indiaPct }
}

export function geographyCaption(geo: GeographyGeometry): string {
  return `Roughly ${geo.indiaPct.toFixed(0)}% sits in India and ${geo.intlPct.toFixed(0)}% outside it (chiefly US equity via international sleeves, plus a gold/commodity bucket that isn’t country-specific). Figures are factsheet-level estimates, since the CAS doesn’t disclose country splits. A large home-country weight is normal for Indian investors but worth watching — global diversification reduces single-country risk.`
}
