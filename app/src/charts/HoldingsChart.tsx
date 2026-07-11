import { useCallback, useState } from 'react'
import { CH, CW, MB, ML, MR, MT } from './scales'
import { clampHoverStep, hoverBands } from './interaction'
import { holdingsGeometry } from './holdings'
import { inrCompact } from '../format'
import type { Fund } from '../engine/types'

const TIP_W = 210
const TIP_H = 32

// Holdings by Value as an interactive horizontal bar chart (task review
// #3): every bar carries an always-visible ₹-compact label, and hovering
// (or arrow-keying) a row shows "{fund}, Value: ₹Xl" in a tooltip.
export function HoldingsChart({ funds, totalValue }: { funds: Fund[]; totalValue: number }) {
  const geo = holdingsGeometry(funds, totalValue)
  const [hover, setHover] = useState<number | null>(null)
  const n = geo?.bars.length ?? 0
  const step = useCallback((delta: number) => setHover((h) => clampHoverStep(h, delta, n)), [n])

  if (!geo) return null
  const { bars, xAxis, x0 } = geo
  // Row hit-bands run along Y (one per fund), reusing the same midpoint-band
  // math as the vertical bar charts' X-bands — `x` here stands in for each
  // row's vertical center.
  const rowBands = hoverBands(
    bars.map((b) => ({ x: b.cy })),
    MT,
    CH - MB,
  )
  const active = hover != null ? (bars[hover] ?? null) : null
  const tipX = active ? Math.min(Math.max(x0 + active.barW + 10, ML), CW - MR - TIP_W) : 0
  const tipY = active ? Math.min(Math.max(active.cy - TIP_H / 2, MT), CH - MB - TIP_H) : MT

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Holdings by market value, largest first. Focus the chart and use the left and right arrow keys to inspect a holding."
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          step(1)
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          step(-1)
        } else if (e.key === 'Escape') setHover(null)
      }}
      onBlur={() => setHover(null)}
      onMouseLeave={() => setHover(null)}
    >
      {xAxis.map((t) => (
        <g key={t.value}>
          <line className="chart-grid" x1={t.x} y1={MT} x2={t.x} y2={CH - MB} />
          <text className="chart-tick" x={t.x} y={CH - MB + 16} textAnchor="middle">
            {t.label}
          </text>
        </g>
      ))}
      {bars.map((b, i) => (
        <g key={i}>
          <rect x={x0} y={b.barY} width={b.barW} height={b.barH} rx={2} fill="var(--green)" opacity={0.55 + 0.45 * (b.barW / bars[0].barW)} />
          <text className="chart-tick" x={x0 - 8} y={b.cy + 3} textAnchor="end" style={{ fontSize: 10.5 }}>
            {b.name.length > 22 ? b.name.slice(0, 21) + '…' : b.name}
          </text>
          <text className="chart-tick" x={x0 + b.barW + 5} y={b.cy + 3} textAnchor="start" fill="var(--ink)">
            {inrCompact(b.marketValue)}
          </text>
        </g>
      ))}
      <text className="chart-lbl" x={CW - MR} y={CH - 6} textAnchor="end">
        Market value
      </text>

      {active && <line className="chart-tip-guide" x1={ML} x2={CW - MR} y1={active.cy} y2={active.cy} />}

      {rowBands.map((band, i) => (
        <rect
          key={i}
          className="chart-hit"
          x={ML}
          y={band.x0}
          width={CW - ML - MR}
          height={Math.max(0, band.x1 - band.x0)}
          fill="transparent"
          tabIndex={-1}
          onMouseEnter={() => setHover(i)}
          onFocus={() => setHover(i)}
        />
      ))}

      {active && (
        <g className="chart-tip" transform={`translate(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`} pointerEvents="none">
          <rect width={TIP_W} height={TIP_H} rx={6} />
          <text className="chart-tip-yr" x={10} y={20}>
            {active.name}, Value: {inrCompact(active.marketValue)}
          </text>
        </g>
      )}
    </svg>
  )
}
