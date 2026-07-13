import { CH, CW, MB, ML, MR, MT } from './scales'
import { hoverBands } from './interaction'
import { ChartHitBands, ChartTooltip, InteractiveChartFrame } from './InteractiveChartFrame'
import { annualGeometry } from './annual'
import { pct } from '../format'
import type { Series } from '../engine/types'

const TIP_W = 200
const TIP_H = 32

// Calendar-Year Returns as an interactive bar chart (task review #3):
// every bar carries an always-visible, signed % label, and hovering (or
// arrow-keying) a bar shows "{year}, Return: {±x.x%}" in a tooltip — same
// hover/keyboard pattern as InvestedChart, applied to bars instead of a
// line. Interaction scaffolding lives in InteractiveChartFrame (review item
// C2) — this component owns only the bar/grid geometry and tooltip content.
export function AnnualChart({ series }: { series: Series }) {
  const geo = annualGeometry(series)
  if (!geo) return null
  const { bars, yAxis } = geo
  const bands = hoverBands(bars, ML, CW - MR)

  return (
    <InteractiveChartFrame ariaLabel="Calendar-year returns, by year. Focus the chart and use the left and right arrow keys to inspect a year." n={bars.length}>
      {(hover, setHover) => {
        const active = hover != null ? (bars[hover] ?? null) : null
        const tipX = active ? Math.min(Math.max(active.x - TIP_W / 2, ML), CW - MR - TIP_W) : 0
        const tipY = active ? Math.max(Math.min(active.barY, active.labelY) - TIP_H - 8, MT) : MT

        return (
          <>
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

            <ChartHitBands bands={bands} axis="x" cross={[MT, CH - MT - MB]} onHover={setHover} />

            {active && (
              <ChartTooltip x={tipX} y={tipY} width={TIP_W} height={TIP_H}>
                <text className="chart-tip-yr" x={10} y={20}>
                  {active.year}
                  {active.partial ? ' (partial)' : ''}, Return: {pct(active.retPct, 1, true)}
                </text>
              </ChartTooltip>
            )}
          </>
        )
      }}
    </InteractiveChartFrame>
  )
}
