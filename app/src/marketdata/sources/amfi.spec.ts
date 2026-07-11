import { describe, expect, it } from 'vitest'
import { looksLikeAmfi, parseAmfi } from './amfi'

const SAMPLE = [
  'Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date',
  '',
  'Open Ended Schemes(Debt Scheme - Liquid Fund)',
  '',
  '119551;INF090I01PD7;-;Franklin India Equity Savings Fund - Direct Plan - Growth;18.5719;02-Jul-2026',
  '120198;INF109K016O4;-;ICICI Prudential Arbitrage Fund - Direct Plan - Growth;39.2108;02-Jul-2026',
  '120199;N.A.;-;Some Suspended Scheme - Direct Plan - Growth;N.A.;02-Jul-2026',
  // A scheme name that itself contains ';' — exercises "parse from the right".
  '120200;INF174K01211;-;Kotak Small Cap Fund; Growth (Regular Plan);19.99;02-Jul-2026',
].join('\n')

describe('parseAmfi', () => {
  const m = parseAmfi(SAMPLE)

  it('skips the header row and section-banner rows', () => {
    expect(Object.keys(m.byIsin)).not.toContain('ISIN Div Payout/ISIN Growth')
  })

  it('skips "N.A." rows (suspended/no-NAV schemes)', () => {
    const names = m.rows.map((r) => r.name || '')
    expect(names.some((n) => n.includes('Suspended'))).toBe(false)
  })

  it('indexes an ISIN under both its raw and O->0 folded spelling', () => {
    expect(m.byIsin['INF109K016O4']?.nav).toBe(39.2108)
    expect(m.byIsin['INF109K01604']?.nav).toBe(39.2108) // O folded to 0
    expect(m.byIsin['INF109K016O4']).toBe(m.byIsin['INF109K01604']) // same record
  })

  it('does not create a spurious folded entry when the ISIN has no O', () => {
    expect(m.byIsin['INF090I01PD7']?.nav).toBe(18.5719)
  })

  it('parses from the right so a scheme name containing ";" is reconstructed correctly', () => {
    const kotak = Object.values(m.byIsin).find((r) => r.nav === 19.99)
    expect(kotak?.name).toBe('Kotak Small Cap Fund Growth (Regular Plan)')
  })

  it('populates rows[] with alias-resolved core + plan for fuzzy fallback', () => {
    const row = m.rows.find((r) => r.nav === 39.2108)
    expect(row?.plan).toBe('direct-growth')
    expect(row?.core).toBe('icici prudential arbitrage') // alias-collapsed
  })
})

describe('looksLikeAmfi', () => {
  it('rejects a short/garbage response', () => {
    expect(looksLikeAmfi('<html>error</html>')).toBe(false)
    expect(looksLikeAmfi(null)).toBe(false)
    expect(looksLikeAmfi(undefined)).toBe(false)
  })

  it('rejects a long response missing ISIN tokens', () => {
    const padded = 'ISIN;'.repeat(1) + 'x'.repeat(60000) // has "ISIN" and ";" but no INF token
    expect(looksLikeAmfi(padded)).toBe(false)
  })

  it('accepts a long response with the real AMFI shape', () => {
    const padded = 'ISIN;INF090I01PD7;' + 'x'.repeat(60000)
    expect(looksLikeAmfi(padded)).toBe(true)
  })
})
