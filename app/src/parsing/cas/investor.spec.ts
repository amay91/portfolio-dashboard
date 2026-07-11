import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { extractInvestorName } from './investor'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

describe('extractInvestorName', () => {
  it('finds the name repeated once per folio (CAMS-registrar statements)', () => {
    expect(extractInvestorName(readFixture('alok_2026.txt'))).toBe('Alok Utsav')
    expect(extractInvestorName(readFixture('alok_2025.txt'))).toBe('Alok Utsav')
  })

  it('takes a majority vote across mixed-case folio name lines', () => {
    // vandana_kfintech.txt has "vandana srivastava" on the KFintech folio's
    // per-folio line and "Vandana Srivastava" repeated more often on the
    // CAMS folio's — same person, both fold to the same title-cased name.
    expect(extractInvestorName(readFixture('vandana_kfintech.txt'))).toBe('Vandana Srivastava')
  })

  it('falls back to the header boilerplate sentence when there is no per-folio name line', () => {
    // axis.txt is pure-KFintech with no per-folio name line at all; the name
    // is only interleaved into "<name> balances and valuation of...".
    expect(extractInvestorName(readFixture('axis.txt'))).toBe('Amay V Narayan')
  })

  it('returns null when neither pattern is present', () => {
    // sample.txt is a bare fragment with no header and no per-folio name line.
    expect(extractInvestorName(readFixture('sample.txt'))).toBeNull()
  })

  it('returns null for empty input', () => {
    expect(extractInvestorName('')).toBeNull()
  })
})
