import { describe, expect, it } from 'vitest'
import { geoFor } from './geo'
import type { FundMeta } from './fundMeta'

// geoFor had zero direct tests before this (review item E2) — only exercised
// indirectly via engine/portfolio.ts's integration fixtures, which cover the
// "has an explicit meta.geo" path well but none of the name-inference
// branches below it.
const alloc = (equity: number, debt: number, cash: number, other: number) => ({ equity, debt, cash, other })
// geoFor only ever reads .geo / .alloc off a FundMeta — these fixtures are
// deliberately partial, so the cast goes through `unknown` rather than
// padding out the other 9 unrelated required fields with meaningless values.
const partialMeta = (m: Partial<FundMeta>) => m as unknown as FundMeta

describe('geoFor', () => {
  it('uses an explicit meta.geo verbatim (already normalized) when present', () => {
    const meta = partialMeta({ geo: { India: 0.8, 'United States': 0.17, 'Other International': 0.03 } })
    expect(geoFor(meta, 'Parag Parikh Flexi Cap Fund')).toEqual({ India: 0.8, 'United States': 0.17, 'Other International': 0.03 })
  })

  it('normalizes an explicit meta.geo that does not itself sum to 1', () => {
    const meta = partialMeta({ geo: { India: 0.5, 'United States': 0.3 } })
    const g = geoFor(meta, 'Some Fund')
    expect(g.India).toBeCloseTo(0.625, 5) // 0.5 / 0.8
    expect(g['United States']).toBeCloseTo(0.375, 5) // 0.3 / 0.8
  })

  it('infers a US-heavy split from a Nasdaq/S&P/US-flagged name with no explicit geo', () => {
    expect(geoFor(null, 'Motilal Oswal Nasdaq 100 Fund of Fund')).toEqual({ 'United States': 0.98, India: 0.02 })
    expect(geoFor(undefined, 'ICICI Prudential US Bluechip Equity Fund')).toEqual({ 'United States': 0.98, India: 0.02 })
    expect(geoFor(null, 'Some S&P 500 Index Fund')).toEqual({ 'United States': 0.98, India: 0.02 })
  })

  it('infers a China-heavy split from a China-flagged name', () => {
    expect(geoFor(null, 'Edelweiss Greater China Equity Off-shore Fund')).toEqual({ China: 0.95, India: 0.05 })
  })

  it('infers a global/international split from generic overseas-flag words', () => {
    expect(geoFor(null, 'Some Global Equity Fund of Fund')).toEqual({ 'United States': 0.62, India: 0.08, 'Other International': 0.3 })
    expect(geoFor(null, 'Overseas Developed Markets Fund')).toEqual({ 'United States': 0.62, India: 0.08, 'Other International': 0.3 })
  })

  it('infers an emerging-market split for an emerging-market-flagged name', () => {
    expect(geoFor(null, 'Some Emerging Market Opportunities Fund')).toEqual({ 'Other International': 0.75, China: 0.15, India: 0.1 })
  })

  it('falls back to alloc-derived India + Gold & Commodities when no geo and no name flag match', () => {
    const meta = partialMeta({ alloc: alloc(0.57, 0.135, 0.175, 0.12) }) // ICICI Prudential Multi-Asset shape
    const g = geoFor(meta, 'ICICI Prudential Multi-Asset Fund')
    expect(g.India).toBeCloseTo(0.88, 5) // equity+debt+cash = 0.88
    expect(g['Gold & Commodities']).toBeCloseTo(0.12, 5)
  })

  it('defaults to fully domestic (all-equity alloc) when meta is entirely absent', () => {
    expect(geoFor(null, 'Some Unrecognized Scheme')).toEqual({ India: 1 })
    expect(geoFor(undefined, 'Some Unrecognized Scheme')).toEqual({ India: 1 })
  })

  it('omits the Gold & Commodities bucket entirely when the alloc has no "other" sleeve', () => {
    const meta = partialMeta({ alloc: alloc(0.9, 0, 0.1, 0) })
    const g = geoFor(meta, 'Some Pure Equity Fund')
    expect(g).toEqual({ India: 1 })
  })

  it('falls back to India:1 when the resulting distribution would sum to zero (a fully-zero alloc)', () => {
    const meta = partialMeta({ alloc: alloc(0, 0, 0, 0) })
    expect(geoFor(meta, 'Some Fund With No Allocation Data')).toEqual({ India: 1 })
  })

  it('name-flag detection is case-insensitive', () => {
    expect(geoFor(null, 'nasdaq 100 fund')).toEqual({ 'United States': 0.98, India: 0.02 })
  })
})
