import { describe, expect, it } from 'vitest'
import { canonCore, fuzzyLive, isin0, liveKey, navPlausible, planKey, rawCore } from './harmonise'

// Each case here mirrors an invariant from docs/DECISIONS.md "Live-NAV
// matching" — if one of these breaks, it's a documented regression, not a
// new design decision.

describe('isin0 — O<->0 ISIN folding', () => {
  it('folds letter O to digit 0', () => {
    expect(isin0('INF109K016O4')).toBe('INF109K01604')
  })
  it('is a no-op on an ISIN with no O', () => {
    expect(isin0('INF090I01PD7')).toBe('INF090I01PD7')
  })
})

describe('navPlausible — plausibility gate (1/3x - 3x band)', () => {
  it('accepts a legitimate same-week NAV move', () => {
    expect(navPlausible(50, 48)).toBe(true)
  })
  it('rejects a wrong-fund-style mismatch outside the band', () => {
    expect(navPlausible(12, 48)).toBe(false)
    expect(navPlausible(886, 18)).toBe(false) // the real bug: Multi-Asset matched to a low-NAV fund
  })
  it('accepts anything when there is no statement NAV to compare against', () => {
    expect(navPlausible(100, NaN)).toBe(true)
  })
  it('rejects a non-positive or non-finite candidate NAV', () => {
    expect(navPlausible(0, 48)).toBe(false)
    expect(navPlausible(NaN, 48)).toBe(false)
  })
})

describe('canonCore / liveKey — rename-proof matching', () => {
  it('collapses old and new names of the same scheme to the same key', () => {
    const oldName = 'ICICI Prudential Equity Arbitrage Fund - Direct Plan - Growth'
    const newName = 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth'
    expect(liveKey(oldName)).toBe(liveKey(newName))
  })
  it('generically collapses "Equity Arbitrage" -> "Arbitrage" for any AMC', () => {
    expect(canonCore('Some AMC Equity Arbitrage Fund - Direct Growth')).toBe(
      canonCore('Some AMC Arbitrage Fund - Direct Growth'),
    )
  })
  it('collapses a fund renamed via reference/aliases.ts (e.g. an ELSS rename) to the same key', () => {
    // Found via a real statement dated Jan 2022: "Axis Long Term Equity Fund"
    // was renamed "Axis ELSS Tax Saver Fund" (08-Dec-2023, industry-wide ELSS
    // renaming) — the old name no longer resolves against any live source
    // without this alias (see docs/DECISIONS.md).
    const oldName = 'Axis Long Term Equity Fund - Direct Plan - Growth'
    const newName = 'Axis ELSS Tax Saver Fund - Direct Plan - Growth'
    expect(liveKey(oldName)).toBe(liveKey(newName))
    expect(canonCore(oldName)).toBe('axis elss tax saver')
  })

  it('collapses the Quantum Equity FoF -> Quantum Diversified Equity All Cap Active FOF rename to the same key', () => {
    // Found via a real statement upload: "Quantum Equity Fund Of Funds" had
    // no ISIN printed at all, so name matching was the ONLY path — and the
    // rename (confirmed via mfapi.in, ISIN INF082J01093 unchanged) swapped in
    // enough new descriptive words ("Diversified", "All Cap", "Active") that
    // fuzzyLive's token-overlap score fell well short of its 0.7 threshold,
    // producing "No matching live NAV found" for a real, still-reporting fund.
    const oldName = 'Quantum Equity Fund Of Funds - Direct Plan Growth'
    const newName = 'Quantum Diversified Equity All Cap Active FOF - Direct Plan Growth Option'
    expect(liveKey(oldName)).toBe(liveKey(newName))
    expect(canonCore(oldName)).toBe('quantum diversified equity all cap active fof')
  })

  it('strips a trailing "(Advisor: ...)" annotation so it does not pollute the alias match', () => {
    // Found via a real statement: CAMS appends "(Advisor: DIRECT)" (a broker/
    // advisor-code annotation, sometimes literally the word "DIRECT" rather
    // than a numeric code) straight onto the scheme name. Before this fix,
    // the generic non-alphanumeric strip in normName left "advisor" as a
    // stray token, so coreTokens produced "icici prudential arbitrage advisor"
    // instead of "icici prudential arbitrage" — which broke the exact-match
    // alias lookup in canonCore and left the fund unmatched against any live
    // source (see docs/DECISIONS.md "Old statements and fund renames").
    const withAdvisor = 'ICICI Prudential Equity Arbitrage Fund - Direct Plan - Growth (Advisor: DIRECT)'
    const withoutAdvisor = 'ICICI Prudential Equity Arbitrage Fund - Direct Plan - Growth'
    expect(canonCore(withAdvisor)).toBe('icici prudential arbitrage')
    expect(liveKey(withAdvisor)).toBe(liveKey(withoutAdvisor))
  })

  it('never matches Direct/Growth to Regular/IDCW', () => {
    const direct = 'Axis Arbitrage Fund - Direct Plan - Growth'
    const regular = 'Axis Arbitrage Fund - Regular Plan - IDCW'
    expect(liveKey(direct)).not.toBe(liveKey(regular))
    expect(planKey(direct)).toBe('direct-growth')
    expect(planKey(regular)).toBe('regular-idcw')
  })
})

describe('rawCore — display-only, no alias collapse', () => {
  it('does NOT collapse a genuine rename (unlike canonCore)', () => {
    const oldName = 'ICICI Prudential Equity Arbitrage Fund - Direct Plan - Growth'
    const newName = 'ICICI Prudential Arbitrage Fund - Direct Plan - Growth'
    expect(rawCore(oldName)).not.toBe(rawCore(newName))
  })
})

describe('fuzzyLive — same-plan core-token Jaccard >= 0.7', () => {
  const rows = [
    { core: 'kotak small cap', plan: 'regular-growth', nav: 250, date: null, source: 'AMFI' },
    { core: 'kotak small cap', plan: 'direct-growth', nav: 260, date: null, source: 'AMFI' },
    { core: 'axis small cap', plan: 'direct-growth', nav: 132, date: null, source: 'AMFI' },
  ]
  it('matches within the same plan on close core-token overlap', () => {
    const m = fuzzyLive('Kotak Small Cap Fund - Growth (Regular Plan)', rows)
    expect(m?.nav).toBe(250)
  })
  it('never matches across plans even with identical core tokens', () => {
    const m = fuzzyLive('Kotak Small Cap Fund - Direct - IDCW', rows)
    expect(m).toBeNull()
  })
  it('returns null when nothing clears the 0.7 threshold', () => {
    const m = fuzzyLive('Totally Unrelated Fund - Direct Growth', rows)
    expect(m).toBeNull()
  })
})
