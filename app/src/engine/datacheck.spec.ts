import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { runDataCheck } from './datacheck'
import { analyzePortfolio } from './portfolio'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

describe('runDataCheck', () => {
  it('statement-only (no live attempt): every active holding is flagged, allLive false, but it still reconciles', () => {
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    const dc = runDataCheck(pf, null)
    const activeCount = pf.funds.filter((f) => f.active).length
    expect(dc.checked).toBe(activeCount)
    expect(dc.live).toBe(0)
    expect(dc.onStatement).toBe(activeCount)
    expect(dc.reachable).toBe(false)
    expect(dc.allLive).toBe(false)
    expect(dc.reconciles).toBe(true)
    expect(dc.issues).toHaveLength(activeCount)
    expect(dc.issues.every((i) => i.why === 'Live sources were unreachable')).toBe(true)
  })

  it('with a fully-matched live map: allLive is true and there are no issues', () => {
    const text = readFixture('alok_2026.txt')
    const schemes = analyzePortfolio(text).funds
    const byIsin: Record<string, { nav: number; date: Date; source: string }> = {}
    for (const f of schemes) {
      if (f.active && f.isin) byIsin[f.isin] = { nav: f.nav, date: f.navDate ?? new Date(), source: 'test' }
    }
    const pf = analyzePortfolio(text, { live: { byIsin } })
    const dc = runDataCheck(pf, { reachable: true })
    expect(dc.allLive).toBe(true)
    expect(dc.onStatement).toBe(0)
    expect(dc.issues).toHaveLength(0)
  })

  it('reachable but partially matched: issues explain "no live NAV could be matched"', () => {
    const pf = analyzePortfolio(readFixture('alok_2026.txt'))
    const dc = runDataCheck(pf, { reachable: true })
    expect(dc.reachable).toBe(true)
    expect(dc.allLive).toBe(false)
    expect(dc.issues.every((i) => i.why === 'No live NAV could be matched to this fund')).toBe(true)
  })
})
