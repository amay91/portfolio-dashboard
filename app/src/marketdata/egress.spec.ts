import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLiveNavs } from './resolve'
import { fetchNiftyBenchmark } from './sources/benchmark'
import type { Scheme } from '../engine/types'

// S3: no-PII-egress verification. This is a Vitest-level substitute for the
// Playwright network-capture check T1 describes (not built yet) — it can't
// see requests from the real browser network stack, but it does exercise
// the actual resolve.ts/captnemo.ts/mfapi.ts/benchmark.ts call sites with a
// spied `fetch`, which is what actually decides what leaves the app. The
// browser-level backstop for the host allowlist is S1's CSP `connect-src`,
// which the allowlist below matches exactly (minus 'self' and the
// caller-supplied edge-fn URL, which isn't a fixed host).
const ALLOWED_EGRESS_HOSTS = ['www.amfiindia.com', 'mf.captnemo.in', 'api.mfapi.in', '127.0.0.1']

function assertAllowedEgress(urls: string[]): void {
  const bad = urls.filter((u) => !ALLOWED_EGRESS_HOSTS.includes(new URL(u).hostname))
  if (bad.length) throw new Error(`Egress allowlist violation — unexpected host(s): ${bad.join(', ')}`)
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

function scheme(overrides: Partial<Scheme>): Scheme {
  return {
    house: 'Test Mutual Fund',
    name: 'Test Fund - Direct Plan - Growth',
    isin: '',
    folio: '1',
    txns: [],
    nav: NaN,
    navDate: null,
    marketValue: NaN,
    closingUnits: 100,
    costValue: NaN,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('assertAllowedEgress (the checker itself)', () => {
  it('passes for every host this app is expected to contact', () => {
    expect(() =>
      assertAllowedEgress(['https://www.amfiindia.com/spages/NAVAll.txt', 'https://mf.captnemo.in/nav/INF090I01PD7', 'https://api.mfapi.in/mf/118347', 'http://127.0.0.1:8765/convert']),
    ).not.toThrow()
  })

  it('a deliberate stray fetch to an unlisted host fails it', () => {
    expect(() => assertAllowedEgress(['https://evil.example/exfiltrate?data=secret'])).toThrow(/evil\.example/)
  })
})

describe('resolveLiveNavs egress', () => {
  it('only contacts allowlisted hosts, and never leaks the folio number or statement amounts into any URL', async () => {
    const SECRET_FOLIO = 'FOLIO-9988776655-SECRET'
    const SECRET_MARKET_VALUE = 123456789.42
    const SECRET_COST_VALUE = 98765432.11
    const s = scheme({
      isin: 'INF090I01PD7',
      name: 'Franklin India Equity Savings Fund - Direct Plan - Growth',
      nav: 18.5,
      folio: SECRET_FOLIO,
      marketValue: SECRET_MARKET_VALUE,
      costValue: SECRET_COST_VALUE,
    })
    const calledUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        calledUrls.push(String(url))
        if (String(url).includes('captnemo.in')) return Promise.resolve(jsonResponse({ nav: 18.6, date: '2026-07-02', name: s.name }))
        return Promise.reject(new Error('unreachable'))
      }),
    )
    await resolveLiveNavs([s], true)

    expect(calledUrls.length).toBeGreaterThan(0)
    assertAllowedEgress(calledUrls)
    for (const u of calledUrls) {
      expect(u).not.toContain(SECRET_FOLIO)
      expect(u).not.toContain(String(SECRET_MARKET_VALUE))
      expect(u).not.toContain(String(SECRET_COST_VALUE))
    }
    // The ISIN is the expected, documented identifier that DOES travel — this
    // asserts the positive case so the test can't pass by accident (e.g. if
    // captnemoByIsin silently stopped being called at all).
    expect(calledUrls.some((u) => u.includes('INF090I01PD7'))).toBe(true)
  })

  it('the mfapi.in name-rescue tier sends only the scheme name (never folio/amounts)', async () => {
    const SECRET_FOLIO = 'FOLIO-1122334455-SECRET'
    const s = scheme({ isin: '', name: 'Axis Bluechip Fund - Direct Plan - Growth', nav: 45, folio: SECRET_FOLIO, marketValue: 500000, costValue: 400000 })
    const calledUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        calledUrls.push(String(url))
        if (String(url).includes('mfapi.in/mf/search')) return Promise.resolve(jsonResponse([{ schemeCode: 999, schemeName: s.name }]))
        if (String(url).includes('mfapi.in/mf/999/latest')) return Promise.resolve(jsonResponse({ meta: { scheme_name: s.name }, data: [{ date: '02-07-2026', nav: '45.2' }] }))
        return Promise.reject(new Error('unreachable')) // AMFI + captnemo (no ISIN) fail
      }),
    )
    await resolveLiveNavs([s], true)

    assertAllowedEgress(calledUrls)
    for (const u of calledUrls) {
      expect(u).not.toContain(SECRET_FOLIO)
      expect(u).not.toContain('500000')
      expect(u).not.toContain('400000')
    }
    // mfapiByName sends a canonicalized/truncated form of the name, not the
    // literal string — check for a stable token from it instead of an exact match.
    expect(calledUrls.some((u) => u.includes('search?q=') && /axis|bluechip/i.test(decodeURIComponent(u)))).toBe(true)
  })
})

describe('fetchNiftyBenchmark egress', () => {
  it('only contacts api.mfapi.in with a fixed query — no scheme/statement data at all', async () => {
    const calledUrls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        calledUrls.push(String(url))
        return Promise.resolve(jsonResponse([]))
      }),
    )
    await fetchNiftyBenchmark()
    assertAllowedEgress(calledUrls)
    expect(calledUrls.every((u) => u.startsWith('https://api.mfapi.in/'))).toBe(true)
  })
})
