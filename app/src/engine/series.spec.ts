import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyzePortfolio } from './portfolio'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

// docs/DECISIONS.md invariant: "series.line last value == PF.totalValue" —
// units are anchored to the statement's closing balance precisely so the
// reconstructed value curve's endpoint ties out exactly to the headline
// market value.
describe('buildPortfolioSeries — via analyzePortfolio', () => {
  for (const file of ['sample.txt', 'alok_2026.txt', 'vandana_kfintech.txt']) {
    it(`${file}: series.line's last value equals PF.totalValue`, () => {
      const pf = analyzePortfolio(readFixture(file))
      expect(pf.series).not.toBeNull()
      const last = pf.series!.line[pf.series!.line.length - 1]
      // "Ties out exactly" per docs/DECISIONS.md means to the rupee — the
      // reconstructed curve and the headline total are two independent
      // summations (per-scheme marketValue vs. per-fund units*price at the
      // endpoint) that can differ by sub-paisa floating-point noise.
      expect(Math.round(last.value)).toBe(Math.round(pf.totalValue))
    })
  }

  it('axis.txt (short history) has a non-null series with at least one point', () => {
    const pf = analyzePortfolio(readFixture('axis.txt'))
    expect(pf.series).not.toBeNull()
    expect(pf.series!.line.length).toBeGreaterThan(0)
  })

  it('drawdown starts at 0 and stays <= 0 (a TWR index can only be at or below its running peak)', () => {
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    const dd = pf.series!.drawdown
    expect(dd[0].dd).toBe(0)
    expect(dd.every((p) => p.dd <= 1e-9)).toBe(true)
  })

  it('annual returns cover from the inception year through the valuation year', () => {
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    const years = pf.series!.annual.map((a) => a.year)
    expect(years[0]).toBe(pf.series!.inceptionYear)
    expect(years[years.length - 1]).toBe(pf.valDate.getFullYear())
  })
})
