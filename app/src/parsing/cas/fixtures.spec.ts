import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseStatement } from './parse'
import { normalizeInput } from '../normalize'
import { FIXTURES } from '../../../tests/fixtures/expected'

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../tests/fixtures',
)
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

// Phase 1 gate: the PARSER alone (no live-NAV layer, no XIRR/gains/allocation
// — that's the Phase 2 engine port) reproduces each statement's own
// marketValue/units/NAV fields. This mirrors analyzeScheme's statement-only
// fallback (`isFinite(s.marketValue) ? s.marketValue : units*nav`) closely
// enough to catch parser regressions; the full analyzePortfolio total is the
// Phase 2 gate against the same fixtures.
function statementOnlyTotal(text: string): number {
  const schemes = parseStatement(text)
  return schemes.reduce((sum, s) => {
    if (isFinite(s.marketValue)) return sum + s.marketValue
    if (isFinite(s.closingUnits) && isFinite(s.nav)) return sum + s.closingUnits * s.nav
    return sum
  }, 0)
}

describe('parseStatement — golden fixtures', () => {
  for (const [file, expected] of Object.entries(FIXTURES)) {
    it(`${file} parses to its known statement-only total`, () => {
      const text = readFixture(file)
      const got = Math.round(statementOnlyTotal(text))
      expect(got).toBe(expected)
    })
  }

  it('MarkItDown markdown and pdf.js text of the same statement agree', () => {
    const md = Math.round(statementOnlyTotal(readFixture('markitdown_cas.md')))
    const txt = Math.round(statementOnlyTotal(readFixture('alok_2026.txt')))
    expect(md).toBe(txt)
  })

  it('normalizeInput is idempotent on already-plain text', () => {
    const text = readFixture('sample.txt')
    expect(normalizeInput(normalizeInput(text))).toBe(normalizeInput(text))
  })

  it('stitches an ISIN torn mid-character across a KFintech-registrar row wrap', () => {
    // vandana_kfintech.txt has two schemes whose ISIN gets physically split by
    // the adjacent "Registrar : CAMS" box: "...INF109K01" / "V83(Advisor:..."
    // (continuation on the row after next) and "...INF109K Registrar : CAMS"
    // / "016E5(Advisor:..." (continuation on the very next row). Both must
    // resolve to their full, correct ISIN — see scheme.ts stitchSplitIsins.
    const schemes = parseStatement(readFixture('vandana_kfintech.txt'))
    const bond = schemes.find((s) => /^ICICI Prudential Bond Fund/.test(s.name))
    const allSeasons = schemes.find((s) => /^ICICI Prudential All Seasons Bond Fund/.test(s.name))
    expect(bond?.isin).toBe('INF109K01V83')
    expect(allSeasons?.isin).toBe('INF109K016E5')
    expect(schemes.some((s) => !s.isin)).toBe(false)
  })
})
