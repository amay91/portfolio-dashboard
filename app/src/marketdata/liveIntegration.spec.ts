import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLiveNavs } from './resolve'
import { analyzePortfolio } from '../engine/portfolio'
import { parseStatement } from '../parsing/cas/parse'

// End-to-end Phase 1+2+3 wiring: parseStatement -> resolveLiveNavs (network,
// fetch-mocked) -> analyzePortfolio(text, {live}). This is the automated
// version of the manual check docs/TESTING.md prescribes: "you can simulate
// by feeding analyzePortfolio(text, {live}) a live.byIsin with a wildly
// wrong NAV and asserting the fund stays on statement NAV (navLive:false)
// and the total is protected." It regression-locks the real ₹2.51cr ->
// ₹1.97cr bug described in docs/DECISIONS.md "Plausibility gate".

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const alok2026 = readFileSync(path.join(fixturesDir, 'alok_2026.txt'), 'utf8')

// The exact ISIN/scheme from the historical bug: ICICI Prudential Arbitrage
// Fund, statement NAV 39.1597 as of 29-Jun-2026 (see fixtures/alok_2026.txt).
const ARBITRAGE_ISIN = 'INF109K016O4'
const STATEMENT_NAV = 39.1597

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('live-NAV wiring: analyzePortfolio(text, {live}) from a real resolveLiveNavs() result', () => {
  it('applies a legitimate live match: navLive true, marketValue recomputed from the live NAV', async () => {
    const liveNav = 39.21 // a plausible, slightly-different same-week NAV
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('captnemo.in') && String(url).includes(ARBITRAGE_ISIN)) {
          return Promise.resolve(jsonResponse({ nav: liveNav, date: '2026-06-30', name: 'ICICI Prudential Arbitrage Fund' }))
        }
        return Promise.reject(new Error('unreachable')) // AMFI/mfapi/yahoo all fail
      }),
    )
    const schemes = parseStatement(alok2026)
    const { live } = await resolveLiveNavs(schemes, true)
    const pf = analyzePortfolio(alok2026, { live })

    const arb = pf.funds.find((f) => f.isin === ARBITRAGE_ISIN)
    expect(arb).toBeDefined()
    expect(arb!.navLive).toBe(true)
    expect(arb!.navSource).toBe('mf.captnemo.in')
    expect(arb!.nav).toBe(liveNav)
    expect(arb!.marketValue).toBeCloseTo(arb!.units * liveNav, 2)
  })

  it('N3: an edge-fn-primary match flows through the full pipeline the same as a captnemo match', async () => {
    const liveNav = 39.21
    const edgeUrl = 'https://edge.example/amfi-nav'
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url) === edgeUrl) return Promise.resolve(jsonResponse({ [ARBITRAGE_ISIN]: { nav: liveNav, date: '2026-06-30', name: 'ICICI Prudential Arbitrage Fund' } }))
        return Promise.reject(new Error('unreachable')) // captnemo/mfapi/direct-AMFI unused when the edge fn wins
      }),
    )
    const schemes = parseStatement(alok2026)
    const { live } = await resolveLiveNavs(schemes, true, edgeUrl)
    const pf = analyzePortfolio(alok2026, { live })

    const arb = pf.funds.find((f) => f.isin === ARBITRAGE_ISIN)
    expect(arb).toBeDefined()
    expect(arb!.navLive).toBe(true)
    expect(arb!.navSource).toBe('AMFI')
    expect(arb!.nav).toBe(liveNav)
    expect(arb!.marketValue).toBeCloseTo(arb!.units * liveNav, 2)
  })

  it('resolve-layer regression lock: a wrong-fund decoy never becomes a live candidate, so the total is protected', async () => {
    // Mirrors the real incident: ICICI Arbitrage got matched to a wrong,
    // much-lower-NAV fund and the headline total silently dropped from
    // ₹2,51,65,629 to ₹1,97,01,983. resolveLiveNavs() itself gates every
    // source by navPlausible() before merging it in (see resolve.ts), so a
    // decoy this far outside the 1/3x-3x band never reaches analyzeScheme
    // at all — the scheme is left a "gap" and falls back to its statement
    // NAV, exactly as if live data were unavailable for it.
    const decoyNav = STATEMENT_NAV / 4 // ratio 0.25, well under the 1/3 floor
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (String(url).includes('captnemo.in') && String(url).includes(ARBITRAGE_ISIN)) {
          return Promise.resolve(jsonResponse({ nav: decoyNav, date: '2026-06-30', name: 'Some Wrong Fund' }))
        }
        return Promise.reject(new Error('unreachable'))
      }),
    )
    const schemes = parseStatement(alok2026)
    const { live } = await resolveLiveNavs(schemes, true)
    const pfLive = analyzePortfolio(alok2026, { live })
    const pfStatementOnly = analyzePortfolio(alok2026)

    const arb = pfLive.funds.find((f) => f.isin === ARBITRAGE_ISIN)
    expect(arb).toBeDefined()
    expect(arb!.navLive).toBe(false)
    expect(arb!.nav).toBe(STATEMENT_NAV) // fell back to the statement's own NAV

    // The total is byte-for-byte protected — this is the actual invariant
    // that failed in the historical bug.
    expect(Math.round(pfLive.totalValue)).toBe(Math.round(pfStatementOnly.totalValue))
    expect(Math.round(pfLive.totalValue)).toBe(25165629)
  })

  it('also protects the total when a caller hand-builds the live map, bypassing resolveLiveNavs entirely', () => {
    // docs/TESTING.md's manual check: feed analyzePortfolio a hand-built
    // live.byIsin with a wildly wrong NAV directly and confirm the fund
    // stays on statement NAV and the total is protected. Note:
    // analyzePortfolio's own liveFor() applies navPlausible() before ever
    // calling analyzeScheme (see engine/portfolio.ts) — same as the
    // original prototype — so this exercises the *same* gate as the test
    // above, just via a hand-built map instead of resolveLiveNavs' output.
    // analyzeScheme's own independent liveRejected check (defense in
    // depth for a caller that skips this pre-filter) is covered directly
    // in engine/scheme.spec.ts.
    const decoyNav = STATEMENT_NAV / 4
    const live = { byIsin: { [ARBITRAGE_ISIN]: { nav: decoyNav, date: new Date('2026-06-30'), source: 'decoy-source' } } }
    const pf = analyzePortfolio(alok2026, { live })

    const arb = pf.funds.find((f) => f.isin === ARBITRAGE_ISIN)
    expect(arb).toBeDefined()
    expect(arb!.navLive).toBe(false)
    expect(arb!.nav).toBe(STATEMENT_NAV)
    expect(Math.round(pf.totalValue)).toBe(25165629)
  })
})
