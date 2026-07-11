import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveLiveNavs } from './resolve'
import type { Scheme } from '../engine/types'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

function textResponse(body: string): Response {
  return new Response(body, { status: 200 })
}

function amfiRow(isin: string, name: string, nav: number): string {
  return `100${isin.length};${isin};-;${name};${nav};02-Jul-2026`
}

// looksLikeAmfi() requires >50000 chars and the literal substring "ISIN" —
// include the real header row and pad a synthetic file to that size.
function syntheticAmfiText(rows: string[]): string {
  const header = 'Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date'
  const body = [header, ...rows].join('\n')
  return body + '\n' + '# padding\n'.repeat(6000)
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

describe('resolveLiveNavs', () => {
  it('resolves via captnemo alone when every AMFI proxy is unreachable', async () => {
    const s = scheme({ isin: 'INF090I01PD7', name: 'Franklin India Equity Savings Fund - Direct Plan - Growth', nav: 18.5 })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('captnemo.in')) return Promise.resolve(jsonResponse({ nav: 18.6453, date: '2026-07-02', name: s.name }))
        return Promise.reject(new Error('network down')) // AMFI (direct) + mfapi fail
      }),
    )
    const { live, diag } = await resolveLiveNavs([s], true)
    expect(diag.amfiOk).toBe(false)
    expect(diag.captnemoUsed).toBe(true)
    expect(diag.reachable).toBe(true)
    expect(live?.byIsin?.['INF090I01PD7']?.nav).toBe(18.6453)
    expect(live?.source).toBe('mf.captnemo.in')
  })

  it('rejects an implausible captnemo match and keeps the plausible AMFI one instead', async () => {
    const s = scheme({ isin: 'INF090I01PD7', name: 'Franklin India Equity Savings Fund - Direct Plan - Growth', nav: 18.5 })
    const amfiText = syntheticAmfiText([amfiRow('INF090I01PD7', s.name, 18.6)])
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('captnemo.in')) return Promise.resolve(jsonResponse({ nav: 5.0, date: '2026-07-02', name: 'Wrong Fund' })) // implausible: 5.0/18.5 < 1/3
        if (url.includes('amfiindia.com')) return Promise.resolve(textResponse(amfiText))
        return Promise.reject(new Error('unreachable'))
      }),
    )
    const { live, diag } = await resolveLiveNavs([s], true)
    expect(diag.amfiOk).toBe(true)
    expect(live?.byIsin?.['INF090I01PD7']?.nav).toBe(18.6) // AMFI's plausible value, not captnemo's decoy
    expect(live?.byIsin?.['INF090I01PD7']?.source).toBe('AMFI')
  })

  it('N3: uses a configured edge function URL as the primary AMFI source, never touching the direct AMFI endpoint', async () => {
    const s = scheme({ isin: 'INF090I01PD7', name: 'Franklin India Equity Savings Fund - Direct Plan - Growth', nav: 18.5 })
    const edgeUrl = 'https://edge.example/amfi-nav'
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === edgeUrl) return Promise.resolve(jsonResponse({ INF090I01PD7: { nav: 18.62, date: '2026-07-02', name: s.name } }))
      if (url.includes('amfiindia.com')) return Promise.reject(new Error('should never be called when an edge URL is supplied'))
      return Promise.reject(new Error('unreachable')) // captnemo/mfapi fail, so only the edge fn can win
    })
    vi.stubGlobal('fetch', fetchMock)
    const { live, diag } = await resolveLiveNavs([s], true, edgeUrl)
    expect(diag.amfiOk).toBe(true)
    expect(live?.byIsin?.['INF090I01PD7']?.nav).toBe(18.62)
    expect(live?.byIsin?.['INF090I01PD7']?.source).toBe('AMFI')
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes('amfiindia.com'))).toBe(false)
  })

  it('N3: falls back to captnemo/mfapi exactly as before when the edge function is unreachable (not deployed yet)', async () => {
    const s = scheme({ isin: 'INF090I01PD7', name: 'Franklin India Equity Savings Fund - Direct Plan - Growth', nav: 18.5 })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('captnemo.in')) return Promise.resolve(jsonResponse({ nav: 18.6453, date: '2026-07-02', name: s.name }))
        return Promise.reject(new Error('unreachable')) // edge fn + AMFI (unused) + mfapi fail
      }),
    )
    const { live, diag } = await resolveLiveNavs([s], true, 'https://edge.example/nav')
    expect(diag.amfiOk).toBe(false)
    expect(diag.captnemoUsed).toBe(true)
    expect(live?.byIsin?.['INF090I01PD7']?.nav).toBe(18.6453)
  })

  it('returns live:null and reachable:false when every source is unreachable', async () => {
    const s = scheme({ isin: 'INF090I01PD7', name: 'Franklin India Equity Savings Fund - Direct Plan - Growth', nav: 18.5 })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const { live, diag } = await resolveLiveNavs([s], true)
    expect(live).toBeNull()
    expect(diag.reachable).toBe(false)
  })

  it('only queries held schemes (closingUnits <= 0 and no marketValue is excluded)', async () => {
    const held = scheme({ isin: 'INF090I01PD7', name: 'Held Fund - Direct Plan - Growth', nav: 18.5, closingUnits: 100 })
    const exited = scheme({ isin: 'INF109K016O4', name: 'Exited Fund - Direct Plan - Growth', nav: 39.0, closingUnits: 0, marketValue: 0 })
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes('captnemo.in')) return Promise.resolve(jsonResponse({ nav: 18.6, date: '2026-07-02', name: held.name }))
      return Promise.reject(new Error('unreachable'))
    })
    vi.stubGlobal('fetch', fetchMock)
    await resolveLiveNavs([held, exited], true)
    const captnemoCalls = fetchMock.mock.calls.filter((c) => String(c[0]).includes('captnemo.in'))
    expect(captnemoCalls.length).toBe(1)
    expect(String(captnemoCalls[0][0])).toContain('INF090I01PD7')
  })

  it('regression: live.source names a contributing source exactly once, no matter how many funds it resolves', async () => {
    // A prior bug appended "mf.captnemo.in" to the source string once PER
    // FUND matched (producing "mf.captnemo.in + mf.captnemo.in + ..."), and
    // a separate bug in the mfapi.in branch hardcoded "AMFI + mfapi.in"
    // regardless of what had actually matched. See docs/DECISIONS.md.
    const s1 = scheme({ isin: 'INF090I01PD7', name: 'Fund One - Direct Plan - Growth', nav: 18.5 })
    const s2 = scheme({ isin: 'INF109K016O4', name: 'Fund Two - Direct Plan - Growth', nav: 39.0 })
    const s3 = scheme({ isin: 'INF174K01211', name: 'Fund Three - Direct Plan - Growth', nav: 250 })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('INF090I01PD7')) return Promise.resolve(jsonResponse({ nav: 18.6, date: '2026-07-02' }))
        if (url.includes('INF109K016O4')) return Promise.resolve(jsonResponse({ nav: 39.2, date: '2026-07-02' }))
        if (url.includes('INF174K01211')) return Promise.resolve(jsonResponse({ nav: 251, date: '2026-07-02' }))
        return Promise.reject(new Error('unreachable'))
      }),
    )
    const { live } = await resolveLiveNavs([s1, s2, s3], true)
    expect(live?.source).toBe('mf.captnemo.in')
  })
})
