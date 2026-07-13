import { CH, CW, MB, ML, MR, MT } from './scales'
import { hoverBands } from './interaction'
import { ChartHitBands, ChartTooltip, InteractiveChartFrame } from './InteractiveChartFrame'
import { geographyGeometry } from './geography'
import { pct } from '../format'
import type { GeoEntry } from '../engine/types'

const TIP_W = 190
const TIP_H = 32

// Geographical Concentration as an interactive horizontal bar chart (task
// review #3): every bar already carries a "%" label; hovering (or
// arrow-keying) a row adds "{country}, Share: x.x%" in a tooltip.
// Interaction scaffolding lives in InteractiveChartFrame (review item C2)
// — this component owns only the bar/grid geometry and tooltip content.
export function GeographyChart({ geo }: { geo: GeoEntry[] }) {
  const geometry = geographyGeometry(geo)
  if (!geometry) return null
  const { bars, xAxis, x0 } = geometry
  const rowBands = hoverBands(
    bars.map((b) => ({ x: b.cy })),
    MT,
    CH - MB,
  )

  return (
    <InteractiveChartFrame ariaLabel="Geographical concentration, by share of portfolio value. Focus the chart and use the left and right arrow keys to inspect a country." n={bars.length}>
      {(hover, setHover) => {
        const active = hover != null ? (bars[hover] ?? null) : null
        const tipX = active ? Math.min(Math.max(x0 + active.barW + 10, ML), CW - MR - TIP_W) : 0
        const tipY = active ? Math.min(Math.max(active.cy - TIP_H / 2, MT), CH - MB - TIP_H) : MT

        return (
          <>
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
                <rect x={x0} y={b.barY} width={b.barW} height={b.barH} rx={2} fill={b.color} />
                <text className="chart-tick" x={x0 - 8} y={b.cy + 3} textAnchor="end" style={{ fontSize: 11, fill: 'var(--ink)' }}>
                  {b.country}
                </text>
                <text className="chart-tick" x={x0 + b.barW + 6} y={b.cy + 3} textAnchor="start" fill="var(--ink)">
                  {pct(b.pctValue)}
                </text>
              </g>
            ))}
            <text className="chart-lbl" x={CW - MR} y={CH - 6} textAnchor="end">
              % of portfolio value
            </text>

            {active && <line className="chart-tip-guide" x1={ML} x2={CW - MR} y1={active.cy} y2={active.cy} />}

            <ChartHitBands bands={rowBands} axis="y" cross={[ML, CW - ML - MR]} onHover={setHover} />

            {active && (
              <ChartTooltip x={tipX} y={tipY} width={TIP_W} height={TIP_H}>
                <text className="chart-tip-yr" x={10} y={20}>
                  {active.country}, Share: {pct(active.pctValue)}
                </text>
              </ChartTooltip>
            )}
          </>
        )
      }}
    </InteractiveChartFrame>
  )
}
