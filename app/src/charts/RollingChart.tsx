import { useCallback, useState } from 'react'
import { CH, CW, MB, ML, MR, MT } from './scales'
import { clampHoverStep, hoverBands } from './interaction'
import { rollingGeometry } from './rolling'
import { pct } from '../format'
import type { Series } from '../engine/types'

const TIP_W = 210
const TIP_H = 32

// Rolling 1-Year Returns as an interactive line chart (task review #3):
// hovering (or arrow-keying) a month shows "Mon YYYY, 1-Year RR: ±x.x%" — or
// "Since-Inception RR" for the dashed pre-1-year segment, since a "1-Year"
// label would misrepresent a return that isn't actually over a full year.
export function RollingChart({ series }: { series: Series }) {
  const geo = rollingGeometry(series)
  const [hover, setHover] = useState<number | null>(null)
  const n = geo?.points.length ?? 0
  const step = useCallback((delta: number) => setHover((h) => clampHoverStep(h, delta, n)), [n])

  if (!geo) return null
  const { points, expPoints, rollPoints, yAxis, yearTicks } = geo
  // Hover/keyboard snaps to every monthly sample (points), not one per whole
  // year — see the equivalent change in InvestedChart.tsx.
  const bands = hoverBands(points, ML, CW - MR)
  const line = (pts: typeof expPoints) => pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const active = hover != null ? (points[hover] ?? null) : null
  const tipX = active ? Math.min(Math.max(active.x - TIP_W / 2, ML), CW - MR - TIP_W) : 0
  const tipY = active ? Math.max(active.y - TIP_H - 10, MT) : MT

  return (
    <>
      <div className="gslide-legend">
        <span>
          <i style={{ background: 'var(--green)' }} />
          Rolling 1-year return
        </span>
        <span>
          <i style={{ background: 'var(--brass)' }} />
          First year: since-inception (building to 1Y)
        </span>
      </div>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Rolling one-year return, monthly since inception. Focus the chart and use the left and right arrow keys to inspect a month."
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
        {yearTicks.map((t) => (
          <g key={t.year}>
            <line className="chart-grid" x1={t.x} y1={MT} x2={t.x} y2={CH - MB} />
            <text className="chart-tick" x={t.x} y={CH - MB + 16} textAnchor="middle">
              {t.year}
            </text>
          </g>
        ))}
        {expPoints.length > 0 && <path d={line(expPoints)} fill="none" stroke="var(--brass)" strokeWidth={2} strokeDasharray="4 4" />}
        {rollPoints.length > 0 && <path d={line(rollPoints)} fill="none" stroke="var(--green)" strokeWidth={2.5} />}
        <text className="chart-lbl" x={ML} y={MT - 7}>
          Return %
        </text>
        <text className="chart-lbl" x={CW - MR} y={CH - 6} textAnchor="end">
          Years since inception
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

        {active && <circle className="chart-tip-dot" cx={active.x} cy={active.y} r={4.5} fill={active.expanding ? 'var(--brass)' : 'var(--green)'} pointerEvents="none" />}

        {active && (
          <g className="chart-tip" transform={`translate(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`} pointerEvents="none">
            <rect width={TIP_W} height={TIP_H} rx={6} />
            <text className="chart-tip-yr" x={10} y={20}>
              {active.monthLabel}, {active.expanding ? 'Since-Inception' : '1-Year'} RR: {pct(active.retPct, 1, true)}
            </text>
          </g>
        )}
      </svg>
    </>
  )
}
