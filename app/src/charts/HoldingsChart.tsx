import { CH, CW, MB, ML, MR, MT } from './scales'
import { hoverBands } from './interaction'
import { ChartHitBands, ChartTooltip, InteractiveChartFrame } from './InteractiveChartFrame'
import { holdingsGeometry } from './holdings'
import { inrCompact } from '../format'
import type { Fund } from '../engine/types'

const TIP_W = 210
const TIP_H = 32

// Holdings by Value as an interactive horizontal bar chart (task review
// #3): every bar carries an always-visible ₹-compact label, and hovering
// (or arrow-keying) a row shows "{fund}, Value: ₹Xl" in a tooltip.
// Interaction scaffolding lives in InteractiveChartFrame (review item C2)
// — this component owns only the bar/grid geometry and tooltip content.
export function HoldingsChart({ funds, totalValue }: { funds: Fund[]; totalValue: number }) {
  const geo = holdingsGeometry(funds, totalValue)
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

  return (
    <InteractiveChartFrame ariaLabel="Holdings by market value, largest first. Focus the chart and use the left and right arrow keys to inspect a holding." n={bars.length}>
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

            <ChartHitBands bands={rowBands} axis="y" cross={[ML, CW - ML - MR]} onHover={setHover} />

            {active && (
              <ChartTooltip x={tipX} y={tipY} width={TIP_W} height={TIP_H}>
                <text className="chart-tip-yr" x={10} y={20}>
                  {active.name}, Value: {inrCompact(active.marketValue)}
                </text>
              </ChartTooltip>
            )}
          </>
        )
      }}
    </InteractiveChartFrame>
  )
}
