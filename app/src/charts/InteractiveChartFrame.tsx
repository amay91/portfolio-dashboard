import { useCallback, useEffect, useRef, useState } from 'react'
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
// Touch support (review item B5 / mobile optimization M3): tapping a point
// is handled per hit-band (ChartHitBands, below); dismissing on a tap
// elsewhere is handled here, since it needs the outer <svg> boundary rather
// than any single band — mirrors InfoTip.tsx's document-level
// click-outside-to-close pattern exactly, for the same reason (touch has no
// equivalent of :hover/blur to fall back on for showing/hiding a popover).
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
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (hover == null) return
    const onTouchOutside = (e: TouchEvent) => {
      if (svgRef.current && !svgRef.current.contains(e.target as Node)) setHover(null)
    }
    document.addEventListener('touchstart', onTouchOutside)
    return () => document.removeEventListener('touchstart', onTouchOutside)
  }, [hover])

  return (
    <svg
      ref={svgRef}
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
//
// Touch (mobile optimization M3): a band only reveals its tooltip on
// `touchend`, and only if the touch didn't move more than TAP_SLOP_PX from
// where it started — deliberately *not* `touchstart`, and deliberately
// never `preventDefault()`, so a genuine scroll/swipe gesture that happens
// to begin on a hit-band (very likely — the bands collectively cover almost
// the whole plot area) still scrolls the page normally. Only a real
// stationary tap counts as "select this point."
const TAP_SLOP_PX = 10
export function ChartHitBands({ bands, axis, cross, onHover }: { bands: Band[]; axis: 'x' | 'y'; cross: [number, number]; onHover: (i: number) => void }) {
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (i: number) => (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    if (Math.abs(t.clientX - start.x) < TAP_SLOP_PX && Math.abs(t.clientY - start.y) < TAP_SLOP_PX) onHover(i)
  }
  return (
    <>
      {bands.map((b, i) =>
        axis === 'x' ? (
          <rect
            key={i}
            className="chart-hit"
            x={b.x0}
            y={cross[0]}
            width={Math.max(0, b.x1 - b.x0)}
            height={cross[1]}
            fill="transparent"
            tabIndex={-1}
            onMouseEnter={() => onHover(i)}
            onFocus={() => onHover(i)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd(i)}
          />
        ) : (
          <rect
            key={i}
            className="chart-hit"
            x={cross[0]}
            y={b.x0}
            width={cross[1]}
            height={Math.max(0, b.x1 - b.x0)}
            fill="transparent"
            tabIndex={-1}
            onMouseEnter={() => onHover(i)}
            onFocus={() => onHover(i)}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd(i)}
          />
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
