import { useCallback, useState } from 'react'
import { CH, CW, MB, ML, MR, MT } from './scales'
import { clampHoverStep, hoverBands } from './interaction'
import { investedGeometry } from './invested'
import type { InvestedPoint, LatestTotals } from './invested'
import { inr } from '../format'
import type { Series } from '../engine/types'

const TIP_W = 172
const TIP_H = 46

// The one interactive chart in the app: every other chart (charts/*.ts) is a
// pre-built SVG string rendered via dangerouslySetInnerHTML, but a hover/
// keyboard tooltip needs real DOM events, so this renders JSX straight from
// investedGeometry()'s plain data instead (task U2a). Shared by the lean
// deck card and gallery slide 1 so both get the same interaction. `latest`
// anchors the final point to the dashboard's own Total Value/Invested
// figures — see investedGeometry()'s comment.
export function InvestedChart({ series, latest }: { series: Series; latest: LatestTotals }) {
  const geo = investedGeometry(series, latest)
  const [hover, setHover] = useState<number | null>(null)
  const n = geo?.points.length ?? 0
  const step = useCallback((delta: number) => setHover((h) => clampHoverStep(h, delta, n)), [n])

  if (!geo) return null
  const { points, yAxis, yearTicks, unit } = geo
  // Hover/keyboard snaps to every monthly sample (points) — previously
  // aggregated to one point per calendar year, which made the tooltip jump
  // in large, choppy steps as the mouse moved across the line.
  const bands = hoverBands(points, ML, CW - MR)
  const line = (y: (p: InvestedPoint) => number) => points.map((p, i) => `${i ? 'L' : 'M'} ${p.x.toFixed(1)} ${y(p).toFixed(1)}`).join(' ')
  const valueD = line((p) => p.y)
  const investedD = line((p) => p.iy)
  const floorY = (CH - MB).toFixed(1)
  const areaD = `${valueD} L ${points[points.length - 1].x.toFixed(1)} ${floorY} L ${points[0].x.toFixed(1)} ${floorY} Z`

  const active = hover != null ? (points[hover] ?? null) : null
  const tipX = active ? Math.min(Math.max(active.x - TIP_W / 2, ML), CW - MR - TIP_W) : 0
  const tipY = active ? Math.max(active.y - TIP_H - 10, MT) : MT

  return (
    <>
      <svg
        className="chart-svg"
        viewBox={`0 0 ${CW} ${CH}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Portfolio value versus amount invested, monthly since inception. Focus the chart and use the left and right arrow keys to inspect a month."
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
        <path d={areaD} fill="var(--green)" opacity={0.09} />
        <path d={investedD} fill="none" stroke="var(--teal)" strokeWidth={2} strokeDasharray="5 4" />
        <path d={valueD} fill="none" stroke="var(--green)" strokeWidth={2.5} />
        <text className="chart-lbl" x={ML} y={MT - 7}>
          {unit.suf}
        </text>
        <text className="chart-lbl" x={CW - MR} y={CH - 6} textAnchor="end">
          Year
        </text>

        {active && <line className="chart-tip-guide" x1={active.x} x2={active.x} y1={MT} y2={CH - MB} />}

        {bands.map((b, i) => (
          <rect
            key={i}
            className="chart-hit"
            x={b.x0}
            y={MT}
            width={Math.max(0, b.x1 - b.x0)}
            height={CH - MT - MB}
            fill="transparent"
            tabIndex={-1}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
          />
        ))}

        {active && (
          <>
            <circle className="chart-tip-dot" cx={active.x} cy={active.iy} r={4} fill="var(--teal)" pointerEvents="none" />
            <circle className="chart-tip-dot" cx={active.x} cy={active.y} r={4.5} fill="var(--green)" pointerEvents="none" />
          </>
        )}

        {active && (
          <g className="chart-tip" transform={`translate(${tipX.toFixed(1)}, ${tipY.toFixed(1)})`} pointerEvents="none">
            <rect width={TIP_W} height={TIP_H} rx={6} />
            <text className="chart-tip-yr" x={10} y={16}>
              {active.monthLabel}
            </text>
            <text className="chart-tip-v invested" x={10} y={31}>
              Invested {inr(active.invested)}
            </text>
            <text className="chart-tip-v value" x={10} y={44}>
              Value {inr(active.value)}
            </text>
          </g>
        )}
      </svg>
      <div className="gslide-legend">
        <span>
          <i style={{ background: 'var(--green)' }} />
          Portfolio value
        </span>
        <span>
          <i style={{ background: 'var(--teal)' }} />
          Amount invested (net)
        </span>
      </div>
    </>
  )
}
