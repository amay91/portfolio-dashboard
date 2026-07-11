import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { assessExtractionQuality } from './extractionQuality'
import { parseStatement } from '../parsing/cas/parse'
import { FIXTURES } from '../../tests/fixtures/expected'
import type { Scheme } from './types'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

function scheme(overrides: Partial<Scheme> = {}): Scheme {
  return {
    house: 'Test Mutual Fund',
    name: 'Test Fund - Direct Plan - Growth',
    isin: 'INF000K00001',
    folio: '12345678',
    txns: [{ date: new Date('2023-01-01'), desc: 'Purchase', amount: 10000, units: 100, price: 100, balance: 100, stamp: 0 }],
    nav: 120,
    navDate: new Date('2026-07-01'),
    marketValue: 12000,
    closingUnits: 100,
    costValue: 10000,
    ...overrides,
  }
}

describe('assessExtractionQuality — no false positives on real statements', () => {
  for (const file of Object.keys(FIXTURES)) {
    it(`${file} reports ok:true`, () => {
      const schemes = parseStatement(readFixture(file))
      expect(assessExtractionQuality(schemes)).toEqual({ ok: true, reasons: [] })
    })
  }
})

describe('assessExtractionQuality — genuine problems', () => {
  it('flags zero schemes parsed', () => {
    expect(assessExtractionQuality([])).toEqual({ ok: false, reasons: ['No schemes were found in this statement.'] })
  })

  it('does NOT flag a missing folio on an active scheme (verified false-positive-prone on real data)', () => {
    // 3 of the 5 real golden fixtures have exactly this shape (a scheme
    // whose folio isn't captured due to registrar format variance) with no
    // effect on their parsed totals — see the comment in extractionQuality.ts.
    const r = assessExtractionQuality([scheme(), scheme({ folio: '' })])
    expect(r.ok).toBe(true)
  })

  it('flags inconsistent ISIN presence within one statement (not a uniformly ISIN-less format)', () => {
    const r = assessExtractionQuality([scheme(), scheme({ isin: '' })])
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => x.includes('ISIN'))).toBe(true)
  })

  it('does not flag a uniformly ISIN-less statement (e.g. AXIS-style)', () => {
    const r = assessExtractionQuality([scheme({ isin: '' }), scheme({ isin: '' })])
    expect(r.ok).toBe(true)
  })

  it('flags an active scheme with neither a resolved balance nor a value', () => {
    const r = assessExtractionQuality([scheme({ closingUnits: NaN, marketValue: NaN })])
    expect(r.ok).toBe(false)
    expect(r.reasons.some((x) => x.includes('balance and value'))).toBe(true)
  })

  it('does not flag an exited/inactive scheme (no transactions) missing a folio or balance', () => {
    const r = assessExtractionQuality([scheme(), scheme({ txns: [], folio: '', closingUnits: NaN, marketValue: 0 })])
    expect(r.ok).toBe(true)
  })
})
