import { useCallback, useState } from 'react'
import { CH, CW, MB, ML, MR, MT } from './scales'
import { clampHoverStep, hoverBands } from './interaction'
import { annualGeometry } from './annual'
import { pct } from '../format'
import type { Series } from '../engine/types'

const TIP_W = 200
const TIP_H = 32

// Calendar-Year Returns as an interactive bar chart (task review #3):
// every bar carries an always-visible, signed % label, and hovering (or
// arrow-keying) a bar shows "{year}, Return: {±x.x%}" in a tooltip — same
// hover/keyboard pattern as InvestedChart, applied to bars instead of a
// line.
export function AnnualChart({ series }: { series: Series }) {
  const geo = annualGeometry(series)
  const [hover, setHover] = useState<number | null>(null)
  const n = geo?.bars.length ?? 0
  const step = useCallback((delta: number) => setHover((h) => clampHoverStep(h, delta, n)), [n])

  if (!geo) return null
  const { bars, yAxis } = geo
  const bands = hoverBands(bars, ML, CW - MR)
  const active = hover != null ? (bars[hover] ?? null) : null
  const tipX = active ? Math.min(Math.max(active.x - TIP_W / 2, ML), CW - MR - TIP_W) : 0
  const tipY = active ? Math.max(Math.min(active.barY, active.labelY) - TIP_H - 8, MT) : MT

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Calendar-year returns, by year. Focus the chart and use the left and right arrow keys to inspect a year."
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
      {yAxis.map((t) => (
        <g key={t.value}>
          <line className="chart-grid" x1={ML} y1={t.y} x2={CW - MR} y2={t.y} />
          <text className="chart-tick" x={ML - 8} y={t.y + 3} textAnchor="end">
            {t.label}
          </text>
        </g>
      ))}
      {bars.map((b) => (
        <g key={b.year}>
          <rect x={b.barX} y={b.barY} width={b.barW} height={b.barH} rx={2} fill={b.positive ? 'var(--green)' : 'var(--clay)'} opacity={b.partial ? 0.45 : 1} />
          <text className="chart-tick" x={b.x} y={CH - MB + 16} textAnchor="middle">
            {b.year}
            {b.partial ? '*' : ''}
          </text>
          <text className="chart-tick" x={b.x} y={b.labelY} textAnchor="middle" fill={b.positive ? 'var(--green)' : 'var(--clay)'}>
            {pct(b.retPct, 1, true)}
          </text>
        </g>
      ))}
      <text className="chart-lbl" x={ML} y={MT - 7}>
        Return %
      </text>

      {active && <line className="chart-tip-guide" x1={active.x} x2={active.x} y1={MT} y2={CH - MB} />}

      {bands.map((band, i) => (
        <rect
          key={i}
          className="chart-hit"
          x={band.x0}
          y={MT}
          width={Math.max(0, band.x1 - band.x0)}
          height={CH - MT - MB}
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
            {active.year}
            {active.partial ? ' (partial)' : ''}, Return: {pct(active.retPct, 1, true)}
          </text>
        </g>
      )}
    </svg>
  )
}
