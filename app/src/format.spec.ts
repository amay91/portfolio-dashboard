import { describe, expect, it } from 'vitest'
import { firstName, fmtDate, inr, inrCompact, longSchemeName, pct, shortName, shortSchemeName } from './format'

describe('inr', () => {
  it('formats with Indian lakh/crore grouping', () => {
    expect(inr(4310702)).toBe('₹43,10,702')
    expect(inr(25165629)).toBe('₹2,51,65,629')
    expect(inr(999)).toBe('₹999')
  })
  it('handles decimals, negatives, and non-finite values', () => {
    expect(inr(1234.5, 2)).toBe('₹1,234.50')
    expect(inr(-500)).toBe('-₹500')
    expect(inr(NaN)).toBe('—')
    expect(inr(null)).toBe('—')
  })
})

describe('pct', () => {
  it('formats with a sign and default 1 decimal', () => {
    expect(pct(12.34)).toBe('12.3%')
    expect(pct(-5)).toBe('−5.0%')
  })
  it('prepends a "+" for non-negative values when forceSign is set (chart bar labels)', () => {
    expect(pct(20.4, undefined, true)).toBe('+20.4%')
    expect(pct(0, undefined, true)).toBe('+0.0%')
    expect(pct(-20.4, undefined, true)).toBe('−20.4%') // negative sign is unaffected
  })
})

describe('inrCompact', () => {
  it('abbreviates crore/lakh/thousand with the axis-tick rounding convention (1 decimal below 10, whole number at/above)', () => {
    expect(inrCompact(1000000)).toBe('₹10L') // exactly 10L -> whole number
    expect(inrCompact(850000)).toBe('₹8.5L') // 8.5L -> below 10, one decimal
    expect(inrCompact(12000000)).toBe('₹1.2Cr')
    expect(inrCompact(85000)).toBe('₹85K')
    expect(inrCompact(850)).toBe('₹850')
  })
  it('handles negatives and non-finite values', () => {
    expect(inrCompact(-1000000)).toBe('-₹10L')
    expect(inrCompact(NaN)).toBe('—')
    expect(inrCompact(null)).toBe('—')
  })
})

describe('shortName', () => {
  it('strips the plan suffix and parentheticals', () => {
    expect(shortName('Kotak Small Cap Fund - Direct Growth (Non Demat)')).toBe('Kotak Small Cap Fund')
    expect(shortName('ICICI Prudential Arbitrage Fund - Regular Plan - IDCW')).toBe('ICICI Prudential Arbitrage Fund')
  })
})

describe('longSchemeName / shortSchemeName', () => {
  it('harmonises a fully-spelled-out name to the same information, reformatted', () => {
    expect(longSchemeName('ICICI Prudential Multi-Asset Fund - Direct Plan - Growth')).toBe('ICICI Prudential Multi-Asset Fund - Direct Plan - Growth')
    expect(shortSchemeName('ICICI Prudential Multi-Asset Fund - Direct Plan - Growth')).toBe('ICICI Prudential Multi-Asset Fund - Dir (G)')
  })

  it('harmonises a Regular/Dividend scheme', () => {
    expect(longSchemeName('ICICI Prudential All Seasons Bond Fund - Regular Plan - Dividend')).toBe('ICICI Prudential All Seasons Bond Fund - Regular Plan - Dividend')
    expect(shortSchemeName('ICICI Prudential All Seasons Bond Fund - Regular Plan - Dividend')).toBe('ICICI Prudential All Seasons Bond Fund - Reg (D)')
  })

  it('fills in the "Plan" wording even when the statement combined it into "- Direct Growth"', () => {
    expect(longSchemeName('Canara Robeco Small Cap Fund - Direct Growth')).toBe('Canara Robeco Small Cap Fund - Direct Plan - Growth')
    expect(shortSchemeName('Canara Robeco Small Cap Fund - Direct Growth')).toBe('Canara Robeco Small Cap Fund - Dir (G)')
  })

  it('drops a trailing parenthetical (e.g. "(Non Demat)") from the base name', () => {
    expect(shortSchemeName('Kotak Small Cap Fund - Direct Growth (Non Demat)')).toBe('Kotak Small Cap Fund - Dir (G)')
  })

  it('preserves a sub-plan qualifier that precedes the Direct/Regular marker', () => {
    expect(shortSchemeName('HDFC Retirement Savings Fund - Equity Plan - Direct Plan -Growth Option')).toBe('HDFC Retirement Savings Fund - Equity Plan - Dir (G)')
  })

  it('recognises IDCW/payout/reinvestment as Dividend', () => {
    expect(shortSchemeName('ICICI Prudential Arbitrage Fund - Direct Plan - IDCW')).toBe('ICICI Prudential Arbitrage Fund - Dir (D)')
  })

  it('defaults to Regular when no plan is mentioned at all', () => {
    expect(shortSchemeName('Axis Liquid Fund - Growth')).toBe('Axis Liquid Fund - Reg (G)')
  })
})

describe('fmtDate', () => {
  it('formats en-GB, UTC', () => {
    expect(fmtDate(new Date(Date.UTC(2026, 6, 3)))).toBe('03 Jul 2026')
  })
  it('returns an em-dash for null/undefined', () => {
    expect(fmtDate(null)).toBe('—')
  })
})

describe('firstName', () => {
  it('takes the first token of a full name', () => {
    expect(firstName('Alok Utsav')).toBe('Alok')
    expect(firstName('Amay V Narayan')).toBe('Amay')
  })
  it('returns null for null/undefined/blank', () => {
    expect(firstName(null)).toBeNull()
    expect(firstName(undefined)).toBeNull()
    expect(firstName('')).toBeNull()
    expect(firstName('   ')).toBeNull()
  })
})
