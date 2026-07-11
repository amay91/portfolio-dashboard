import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { annualGeometry } from './annual'
import { capitalGeometry } from './capital'
import { geographyGeometry } from './geography'
import { holdingsGeometry } from './holdings'
import { investedCaption, investedGeometry } from './invested'
import { rollingGeometry } from './rolling'
import { analyzePortfolio } from '../engine/portfolio'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

// All 6 gallery charts are now real React components driven by pure
// geometry functions (task U2a, review #3) rather than pre-built SVG
// strings — this asserts each geometry builder produces sane, non-empty
// output for real fixtures, in place of the old markup-shape assertions.
describe('all 6 chart geometries produce valid output for a real fixture', () => {
  for (const file of ['sample.txt', 'alok_2026.txt', 'vandana_kfintech.txt']) {
    it(`${file}`, () => {
      const pf = analyzePortfolio(readFixture(file))
      expect(pf.series).not.toBeNull()
      const s = pf.series!

      const latest = { value: pf.totalValue, cost: pf.totalCost }
      const geo = investedGeometry(s, latest)
      expect(geo).not.toBeNull()
      expect(geo!.points.length).toBeGreaterThan(1)
      // Regression (reported in review): hovering the last point must show
      // the same totals as the dashboard's own KPI tiles, not the series'
      // own (slightly different) net-cash-flow reconstruction.
      const lastPoint = geo!.points[geo!.points.length - 1]
      expect(lastPoint.value).toBe(pf.totalValue)
      expect(lastPoint.invested).toBe(pf.totalCost)
      // Regression: a caption/legend must never double up the ₹ symbol —
      // inr() already prepends it, so `₹${inr(...)}` was a real bug (see
      // docs/DECISIONS.md "Chart caption had a doubled ₹ symbol").
      expect(investedCaption(s, latest) || '').not.toContain('₹₹')

      const annualGeo = annualGeometry(s)
      expect(annualGeo).not.toBeNull()
      expect(annualGeo!.bars.length).toBeGreaterThan(0)

      const rollingGeo = rollingGeometry(s)
      expect(rollingGeo).not.toBeNull()
      expect(rollingGeo!.yearTicks.length).toBeGreaterThan(0)

      const capitalGeo = capitalGeometry(s)
      expect(capitalGeo).not.toBeNull()
      expect(capitalGeo!.bars.length).toBeGreaterThan(0)

      const holdingsGeo = holdingsGeometry(pf.funds, pf.totalValue)
      expect(holdingsGeo).not.toBeNull()
      expect(holdingsGeo!.bars.length).toBeGreaterThan(0)

      const geographyGeo = geographyGeometry(pf.geo)
      expect(geographyGeo).not.toBeNull()
      expect(geographyGeo!.bars.length).toBeGreaterThan(0)
    })
  }

  it('axis.txt (short history, no ISINs) still produces invested-value geometry', () => {
    const pf = analyzePortfolio(readFixture('axis.txt'))
    expect(pf.series).not.toBeNull()
    expect(investedGeometry(pf.series!)).not.toBeNull()
  })
})
