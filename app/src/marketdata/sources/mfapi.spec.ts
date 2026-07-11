import { afterEach, describe, expect, it, vi } from 'vitest'
import { mfapiByName, parseDmy } from './mfapi'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('parseDmy', () => {
  it('parses mfapi\'s dd-mm-yyyy date format', () => {
    expect(parseDmy('02-07-2026')).toEqual(new Date(Date.UTC(2026, 6, 2)))
  })
  it('returns null for an unparseable date', () => {
    expect(parseDmy('not-a-date')).toBeNull()
    expect(parseDmy(null)).toBeNull()
  })
})

describe('mfapiByName', () => {
  it('returns null when the search finds nothing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))
    const r = await mfapiByName('Some Obscure Fund - Direct Plan - Growth')
    expect(r).toBeNull()
  })

  it('picks the plan-matching (Direct/Growth) candidate over a Regular/IDCW decoy, then fetches its latest NAV', async () => {
    const search = [
      { schemeCode: 100, schemeName: 'Kotak Small Cap Fund - Regular Plan - IDCW' },
      { schemeCode: 200, schemeName: 'Kotak Small Cap Fund - Direct Plan - Growth' },
    ]
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) return Promise.resolve(jsonResponse(search))
      if (url.includes('/200/latest')) {
        return Promise.resolve(
          jsonResponse({ meta: { scheme_name: 'Kotak Small Cap Fund - Direct Plan - Growth' }, data: [{ nav: '250.5', date: '02-07-2026' }] }),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('Kotak Small Cap Fund - Direct Plan - Growth')
    expect(r?.nav).toBe(250.5)
    expect(r?.source).toBe('mfapi.in')
  })

  it('resolves an old (renamed) fund name via reference/aliases.ts, matching against its current listing', async () => {
    // Found via a real statement dated Jan 2022: "Axis Long Term Equity
    // Fund" (statement's old name) no longer matches any live source
    // because AMFI/mfapi/captnemo all list it under its current name
    // ("Axis ELSS Tax Saver Fund", renamed 08-Dec-2023). mfapiByName builds
    // its search query from canonCore(name), which the alias resolves to
    // the current name — so the search query itself already targets the
    // right listing, even though the caller passed the old name.
    const search = [{ schemeCode: 300, schemeName: 'Axis ELSS Tax Saver Fund - Direct Plan - Growth' }]
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) {
        expect(decodeURIComponent(url)).toContain('axis elss tax saver')
        expect(decodeURIComponent(url)).not.toContain('long term')
        return Promise.resolve(jsonResponse(search))
      }
      if (url.includes('/300/latest')) {
        return Promise.resolve(jsonResponse({ meta: { scheme_name: 'Axis ELSS Tax Saver Fund - Direct Plan - Growth' }, data: [{ nav: '99.5', date: '02-07-2026' }] }))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('Axis Long Term Equity Fund - Direct Plan - Growth')
    expect(r?.nav).toBe(99.5)
  })

  it('keeps "fund" in the search query so a large same-AMC family cannot crowd out the target (real mfapi.in behaviour: /search caps at 15 results, no relevance ranking)', async () => {
    // Found live against mfapi.in: searching "axis arbitrage" (canonCore's bare
    // output, no "fund") returns only "Axis Income Plus Arbitrage Active/Passive
    // FOF" (15 IDCW/growth share classes fill the cap) -- "Axis Arbitrage Fund"
    // itself never appears. Searching "axis arbitrage fund" returns the correct
    // 4 variants. This mock reproduces that: a query without "fund" gets only
    // decoy FOF results; only a query including "fund" gets the real scheme.
    const decoys = Array.from({ length: 15 }, (_, i) => ({
      schemeCode: 900000 + i,
      schemeName: `Axis Income Plus Arbitrage Active FOF - Regular Plan - Variant ${i} IDCW`,
    }))
    const real = [
      { schemeCode: 130771, schemeName: 'Axis Arbitrage Fund - Regular Plan - Growth' },
      { schemeCode: 130773, schemeName: 'Axis Arbitrage Fund - Direct Plan - Growth' },
    ]
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) {
        const q = decodeURIComponent(url)
        return Promise.resolve(jsonResponse(q.includes('fund') ? real : decoys))
      }
      if (url.includes('/130773/latest')) {
        return Promise.resolve(
          jsonResponse({ meta: { scheme_name: 'Axis Arbitrage Fund - Direct Plan - Growth' }, data: [{ nav: '21.678', date: '06-07-2026' }] }),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('Axis Arbitrage Fund - Direct Growth')
    expect(r?.nav).toBe(21.678)
  })

  it('tries the bare query first, so a "FOF" (not literally "Fund")-named scheme still matches', async () => {
    // Found live against mfapi.in (2026-07-10): "Quantum Diversified Equity
    // All Cap Active FOF" has no literal "Fund" anywhere in its name --
    // appending " fund" (the Axis-crowding fix below) made the query match
    // zero schemes, when the bare query alone finds it immediately. Mock
    // reproduces that split: the bare query returns the real scheme; the
    // "+fund" query (which mfapiByName should never even need to send here)
    // would return nothing, so if the implementation regressed to trying
    // "+fund" first this test fails.
    const real = [{ schemeCode: 112039, schemeName: 'Quantum Diversified Equity All Cap Active FOF - Direct Plan Growth Option' }]
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) {
        const q = decodeURIComponent(url)
        return Promise.resolve(jsonResponse(q.includes('fund') ? [] : real))
      }
      if (url.includes('/112039/latest')) {
        return Promise.resolve(
          jsonResponse({
            meta: { scheme_name: 'Quantum Diversified Equity All Cap Active FOF - Direct Plan Growth Option' },
            data: [{ nav: '85.83', date: '09-07-2026' }],
          }),
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('Quantum Equity Fund Of Funds - Direct Plan Growth')
    expect(r?.nav).toBe(85.83)
  })

  it('falls back to the "+fund" query only when the bare query fails to find a confident match', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) {
        const q = decodeURIComponent(url)
        // Bare query: nothing usable. "+fund" query: the real match.
        return Promise.resolve(jsonResponse(q.includes('fund') ? [{ schemeCode: 500, schemeName: 'Some AMC Fund - Direct Plan - Growth' }] : []))
      }
      if (url.includes('/500/latest')) {
        return Promise.resolve(jsonResponse({ meta: { scheme_name: 'Some AMC Fund - Direct Plan - Growth' }, data: [{ nav: '12.34', date: '02-07-2026' }] }))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('Some AMC Fund - Direct Plan - Growth')
    expect(r?.nav).toBe(12.34)
  })

  it('falls back to a "+direct"-narrowed query when both the bare and "+fund" queries are crowded out by legacy pre-Direct-plan share classes', async () => {
    // Found live against mfapi.in (2026-07-11) via a 100-fund coverage
    // sweep: "ICICI Prudential Liquid Fund" has dozens of pre-2013
    // Institutional/Retail/IDCW share classes that predate Direct plans
    // existing at all. Both the bare query and "+fund" query return exactly
    // mfapi.in's 15-result cap, entirely filled with those legacy variants
    // (all containing "fund" already, so "+fund" doesn't narrow anything) —
    // the real "...Direct Plan - Growth" scheme never appears in either.
    // Appending the plan word itself narrows to only Direct-plan results.
    const legacyDecoys = Array.from({ length: 15 }, (_, i) => ({
      schemeCode: 100000 + i,
      schemeName: `ICICI Prudential Liquid Fund - Institutional Variant ${i} IDCW`,
    }))
    const real = [{ schemeCode: 120197, schemeName: 'ICICI Prudential Liquid Fund - Direct Plan - Growth' }]
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) {
        const q = decodeURIComponent(url)
        if (q.includes('direct')) return Promise.resolve(jsonResponse(real))
        return Promise.resolve(jsonResponse(legacyDecoys))
      }
      if (url.includes('/120197/latest')) {
        return Promise.resolve(jsonResponse({ meta: { scheme_name: 'ICICI Prudential Liquid Fund - Direct Plan - Growth' }, data: [{ nav: '345.67', date: '10-07-2026' }] }))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('ICICI Prudential Liquid Fund - Direct Plan - Growth')
    expect(r?.nav).toBe(345.67)
  })

  it('picks the true match over a confident-but-wrong sibling fund found in an earlier tier (compares scores across all tiers instead of stopping at the first that clears the bar)', async () => {
    // Found live against mfapi.in (2026-07-11) via the 100-fund coverage sweep,
    // as a regression introduced by the "+direct" tier-3 fix above: the bare
    // query for "Aditya Birla Sun Life Liquid Fund" returns 15 results with
    // the real fund crowded out entirely, but *does* include an unrelated
    // sibling ("...Gilt Plus - Liquid Plan - Growth - Direct Plan") that
    // shares every one of the real fund's core tokens as a subset plus two
    // extra ("gilt", "plus") -- and is the only Direct/non-IDCW candidate in
    // that result set, so it used to win tier 1 outright and return early,
    // even though the "+fund" query (tier 2) cleanly contains the real fund.
    // mfapiByName must run every tier and keep the best-scoring match overall,
    // not just the first one that clears the confidence bar.
    const giltPlusDecoy = { schemeCode: 119612, schemeName: 'Aditya Birla Sun Life Gilt Plus - Liquid Plan - Growth - Direct Plan' }
    const legacyDecoys = Array.from({ length: 10 }, (_, i) => ({
      schemeCode: 100040 + i,
      schemeName: `Aditya Birla Sun Life Liquid Fund - Institutional Variant ${i} IDCW`,
    }))
    const real = { schemeCode: 119568, schemeName: 'Aditya Birla Sun Life Liquid Fund - Growth - Direct Plan' }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) {
        const q = decodeURIComponent(url)
        if (q.includes('fund')) return Promise.resolve(jsonResponse([real]))
        return Promise.resolve(jsonResponse([giltPlusDecoy, ...legacyDecoys]))
      }
      if (url.includes('/119568/latest')) {
        return Promise.resolve(jsonResponse({ meta: { scheme_name: real.schemeName }, data: [{ nav: '415.9012', date: '10-07-2026' }] }))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('Aditya Birla Sun Life Liquid Fund - Growth - Direct Plan')
    expect(r?.nav).toBe(415.9012)
    expect(r?.name).toBe(real.schemeName)
  })

  it('picks the true match over a same-AMC decoy even when AMFI\'s own "(erstwhile ...)" rename marker adds extra tokens to the real target (2026-07-11)', async () => {
    // Found live via a real statement with no ISINs: "ICICI Prudential
    // Focused Bluechip Equity Fund" was renamed (via aliases.ts) to canonCore
    // "icici prudential large cap", but mfapi.in lists the real fund as
    // "...Large Cap Fund (erstwhile Bluechip Fund)..." — before harmonise.ts's
    // normName stripped "(erstwhile ...)" (same treatment as "(formerly
    // ...)"), those two extra tokens dragged the real fund's score below an
    // unrelated same-AMC decoy, "ICICI Prudential Large & Mid Cap Fund",
    // which shares every query token as a strict subset plus one extra
    // ("mid"). See docs/DECISIONS.md and harmonise.spec.ts's own regression
    // test for the normName half of this fix.
    const midCapDecoy = { schemeCode: 100777, schemeName: 'ICICI Prudential Large & Mid Cap Fund - Direct Plan - Growth' }
    const real = { schemeCode: 100888, schemeName: 'ICICI Prudential Large Cap Fund (erstwhile Bluechip Fund) - Direct Plan - Growth' }
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/search')) return Promise.resolve(jsonResponse([midCapDecoy, real]))
      if (url.includes('/100888/latest')) {
        return Promise.resolve(jsonResponse({ meta: { scheme_name: real.schemeName }, data: [{ nav: '120.45', date: '10-07-2026' }] }))
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const r = await mfapiByName('ICICI Prudential Focused Bluechip Equity Fund - Direct Plan - Growth')
    expect(r?.nav).toBe(120.45)
    expect(r?.name).toBe(real.schemeName)
  })

  it('returns null when the /latest lookup has no data', async () => {
    const search = [{ schemeCode: 200, schemeName: 'Kotak Small Cap Fund - Direct Plan - Growth' }]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) return Promise.resolve(jsonResponse(search))
        return Promise.resolve(jsonResponse({ data: [] }))
      }),
    )
    const r = await mfapiByName('Kotak Small Cap Fund - Direct Plan - Growth')
    expect(r).toBeNull()
  })
})
