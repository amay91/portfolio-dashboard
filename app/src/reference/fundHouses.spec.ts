import { describe, expect, it } from 'vitest'
import { fundHouseFullName, fundHouseShortName } from './fundHouses'

describe('fundHouseFullName / fundHouseShortName', () => {
  it('maps a known AMC to its canonical full and short forms', () => {
    expect(fundHouseFullName('ICICI Prudential Mutual Fund')).toBe('ICICI Prudential Mutual Fund')
    expect(fundHouseShortName('ICICI Prudential Mutual Fund')).toBe('ICICI MF') // irregular: not "ICICI Prudential MF"
  })

  it('is case- and whitespace-insensitive against statement quirks', () => {
    expect(fundHouseShortName('  hdfc   mutual fund ')).toBe('HDFC MF')
    expect(fundHouseFullName('HDFC MUTUAL FUND')).toBe('HDFC Mutual Fund')
  })

  it('covers a sample of the full 40-entry list', () => {
    expect(fundHouseShortName('360 ONE Mutual Fund')).toBe('360 ONE MF')
    expect(fundHouseShortName('Kotak Mahindra Mutual Fund')).toBe('Kotak Mahindra MF')
    expect(fundHouseShortName('UTI Mutual Fund')).toBe('UTI MF')
    expect(fundHouseShortName('WhiteOak Capital Mutual Fund')).toBe('WhiteOak Capital MF')
  })

  it('resolves a known shortened statement variant to its full AMC (e.g. "Kotak Mutual Fund" -> Kotak Mahindra)', () => {
    // Caught live: sample.txt's statement drops "Mahindra" from the AMC's
    // legal name.
    expect(fundHouseFullName('Kotak Mutual Fund')).toBe('Kotak Mahindra Mutual Fund')
    expect(fundHouseShortName('Kotak Mutual Fund')).toBe('Kotak Mahindra MF')
  })

  it('falls through to the original string for an AMC not yet in the list, rather than hiding it', () => {
    expect(fundHouseFullName('Some New AMC Mutual Fund')).toBe('Some New AMC Mutual Fund')
    expect(fundHouseShortName('Some New AMC Mutual Fund')).toBe('Some New AMC Mutual Fund')
  })
})
