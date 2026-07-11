import { describe, expect, it } from 'vitest'
import { geographyCaption, geographyGeometry } from './geography'
import { CW, MR } from './scales'

describe('geographyGeometry', () => {
  it('returns null when there is no meaningful country exposure', () => {
    expect(geographyGeometry([])).toBeNull()
    expect(geographyGeometry([{ country: 'India', pct: 0.0001 }])).toBeNull()
  })

  it('carries each bar\'s percentage through unscaled (0-100), not the raw 0-1 fraction', () => {
    const geo = geographyGeometry([{ country: 'India', pct: 0.609 }])!
    expect(geo.bars[0].pctValue).toBeCloseTo(60.9, 5)
  })

  it('computes India vs international split for the caption', () => {
    const geo = geographyGeometry([
      { country: 'India', pct: 0.7 },
      { country: 'United States', pct: 0.3 },
    ])!
    expect(geo.indiaPct).toBeCloseTo(70, 5)
    expect(geo.intlPct).toBeCloseTo(30, 5)
  })

  it('treats a 100%-India portfolio as having no international exposure', () => {
    const geo = geographyGeometry([{ country: 'India', pct: 1 }])!
    expect(geo.indiaPct).toBeCloseTo(100, 5)
    expect(geo.intlPct).toBeCloseTo(0, 5)
  })

  it('leaves room for the "%" label so a 100%-concentration bar never reaches the SVG\'s right edge (2026-07-11 regression: a "100.0%" label rendered off-canvas)', () => {
    const geo = geographyGeometry([{ country: 'India', pct: 1 }])!
    const barRightEdge = geo.x0 + geo.bars[0].barW
    // GeographyChart.tsx draws the label starting 6px after the bar; "100.0%" is the longest possible value.
    expect(CW - MR - barRightEdge).toBeGreaterThanOrEqual(34)
  })
})

describe('geographyCaption', () => {
  it('cites the India/international split as whole-number percentages', () => {
    const geo = geographyGeometry([
      { country: 'India', pct: 0.61 },
      { country: 'United States', pct: 0.39 },
    ])!
    const cap = geographyCaption(geo)
    expect(cap).toContain('61%')
    expect(cap).toContain('39%')
  })
})
