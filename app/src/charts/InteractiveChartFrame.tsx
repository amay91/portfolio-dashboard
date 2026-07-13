import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { CH, CW } from './scales'
import { clampHoverStep } from './interaction'
import type { Band } from './interaction'

// Shared hover-state + keyboard-step + <svg> wrapper for every interactive
// chart (review item C2) — all six chart components (AnnualChart,
// CapitalChart, GeographyChart, HoldingsChart, InvestedChart, RollingChart)
// independently declared the same `useState<number|null>` hover slot, the
// same `clampHoverStep`-wrapped arrow-key handler, and the same <svg>
// attributes/keydown/blur/mouseleave trio. Geometry (grid, bars/lines, hit
// bands, tooltip positioning) genuinely differs per chart's shape — that
// stays in each chart component, passed in as a render-prop child so it can
// read `hover`/call `setHover` without re-deriving the interaction wiring.
// No touch support added here (review item B5, deferred alongside the
// mobile-optimization workstream — see tasks.md).
export function InteractiveChartFrame({
  ariaLabel,
  n,
  children,
}: {
  ariaLabel: string
  n: number
  children: (hover: number | null, setHover: (i: number | null) => void) => ReactNode
}) {
  const [hover, setHover] = useState<number | null>(null)
  const step = useCallback((delta: number) => setHover((h) => clampHoverStep(h, delta, n)), [n])

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${CW} ${CH}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={ariaLabel}
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
      {children(hover, setHover)}
    </svg>
  )
}

// The invisible hover/focus hit-region rects (review item C2) — identical
// props/handlers in all six charts, differing only in which axis the bands
// run along: 'x' for a vertical strip per point/bar (line and vertical-bar
// charts), 'y' for a horizontal strip per row (the two horizontal bar
// charts, HoldingsChart/GeographyChart). `cross` is the fixed size along the
// other axis (e.g. the plot's top/height for 'x' bands).
export function ChartHitBands({ bands, axis, cross, onHover }: { bands: Band[]; axis: 'x' | 'y'; cross: [number, number]; onHover: (i: number) => void }) {
  return (
    <>
      {bands.map((b, i) =>
        axis === 'x' ? (
          <rect key={i} className="chart-hit" x={b.x0} y={cross[0]} width={Math.max(0, b.x1 - b.x0)} height={cross[1]} fill="transparent" tabIndex={-1} onMouseEnter={() => onHover(i)} onFocus={() => onHover(i)} />
        ) : (
          <rect key={i} className="chart-hit" x={cross[0]} y={b.x0} width={cross[1]} height={Math.max(0, b.x1 - b.x0)} fill="transparent" tabIndex={-1} onMouseEnter={() => onHover(i)} onFocus={() => onHover(i)} />
        ),
      )}
    </>
  )
}

// The tooltip box shell (review item C2) — position and content genuinely
// differ per chart (some center above the active point, the two horizontal
// bar charts position to the right of the bar), so callers compute their
// own x/y and pass their own label text as children; this only owns the
// repeated <g className="chart-tip">/<rect> wrapper.
export function ChartTooltip({ x, y, width, height, children }: { x: number; y: number; width: number; height: number; children: ReactNode }) {
  return (
    <g className="chart-tip" transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)})`} pointerEvents="none">
      <rect width={width} height={height} rx={6} />
      {children}
    </g>
  )
}
