import { afterEach, describe, expect, it, vi } from 'vitest'
import { benchmarkCagr, fetchNiftyBenchmark } from './benchmark'
import type { BenchmarkPoint } from './benchmark'

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 })
}

// dd-mm-yyyy, as mfapi.in returns dates
function ddmmyyyy(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()}`
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('benchmarkCagr', () => {
  it('computes CAGR from the nearest points to the given dates', () => {
    const points: BenchmarkPoint[] = [
      { date: new Date('2020-01-01'), nav: 100 },
      { date: new Date('2025-01-01'), nav: 200 },
    ]
    const cagr = benchmarkCagr(points, new Date('2020-01-02'), new Date('2024-12-31'))
    // ~5 years, 100 -> 200 => ~14.87% CAGR
    expect(cagr).not.toBeNull()
    expect(cagr as number).toBeGreaterThan(0.14)
    expect(cagr as number).toBeLessThan(0.16)
  })

  it('returns null for an empty series or a non-positive span', () => {
    expect(benchmarkCagr([], new Date('2020-01-01'), new Date('2021-01-01'))).toBeNull()
    const points: BenchmarkPoint[] = [{ date: new Date('2020-01-01'), nav: 100 }]
    expect(benchmarkCagr(points, new Date('2021-01-01'), new Date('2020-01-01'))).toBeNull()
  })

  it('returns null rather than a silently-shorter-window CAGR when the fund launched after the requested start date', () => {
    // Real case (2026-07-09): IDBI's long-running Nifty 50 tracker stopped
    // reporting in 2023; the only still-reporting matching fund (Angel One)
    // launched 2025-05-28. Requesting an 11-year "all-time" window against
    // that fund used to silently return ITS OWN ~1.1-year return (nearest
    // point to 2015 is just its first-ever NAV) mislabeled as an 11-year
    // figure — this must come back null instead, not a real-looking wrong number.
    const points: BenchmarkPoint[] = [
      { date: new Date('2025-05-28'), nav: 10.0578 },
      { date: new Date('2026-07-09'), nav: 9.8554 },
    ]
    const elevenYearsAgo = new Date('2015-01-01')
    const today = new Date('2026-07-09')
    expect(benchmarkCagr(points, elevenYearsAgo, today)).toBeNull()
  })

  it('still returns a real CAGR for a window the fund genuinely covers, even with the same short-lived fund', () => {
    // Same fund as above, but a 1-year request that its history actually
    // reaches back to (launched 2025-05-28, well before "1 year ago").
    const points: BenchmarkPoint[] = [
      { date: new Date('2025-05-28'), nav: 10.0578 },
      { date: new Date('2025-07-09'), nav: 10.3854 },
      { date: new Date('2026-07-09'), nav: 9.8554 },
    ]
    const oneYearAgo = new Date('2025-07-09')
    const today = new Date('2026-07-09')
    const cagr = benchmarkCagr(points, oneYearAgo, today)
    expect(cagr).not.toBeNull()
    expect(cagr as number).toBeCloseTo(-0.05107, 4)
  })
})

describe('fetchNiftyBenchmark', () => {
  it('picks a direct-plan, growth-option Nifty 50 index fund with recent data, excluding near-miss variants', async () => {
    const today = ddmmyyyy(new Date())
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) {
          return Promise.resolve(
            jsonResponse([
              { schemeCode: 1, schemeName: 'Some AMC Nifty Next 50 Index Fund - Direct Plan - Growth' },
              { schemeCode: 2, schemeName: 'Some AMC Nifty 50 Equal Weight Index Fund - Direct Plan - Growth' },
              { schemeCode: 3, schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
              { schemeCode: 4, schemeName: 'Some AMC Nifty 50 Index Fund - Regular Plan - Growth' },
            ]),
          )
        }
        if (url.includes('/mf/3')) {
          return Promise.resolve(
            jsonResponse({
              meta: { scheme_name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
              data: [
                { date: today, nav: '250.1234' },
                { date: '01-07-2025', nav: '210.5678' },
              ],
            }),
          )
        }
        return Promise.reject(new Error('unexpected url: ' + url))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).not.toBeNull()
    expect(points!.length).toBe(2)
    // sorted ascending by date
    expect(points![0].nav).toBe(210.5678)
    expect(points![1].nav).toBe(250.1234)
  })

  it('skips a candidate that has quietly stopped reporting (wound up/merged) and uses a still-reporting one', async () => {
    const today = ddmmyyyy(new Date())
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) {
          return Promise.resolve(
            jsonResponse([
              { schemeCode: 1, schemeName: 'IDBI Nifty 50 Index Fund - Direct Plan - Growth' },
              { schemeCode: 2, schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
            ]),
          )
        }
        if (url.includes('/mf/1')) {
          // stale — last NAV from years ago, as if the scheme was wound up
          return Promise.resolve(jsonResponse({ data: [{ date: '27-07-2023', nav: '39.40' }] }))
        }
        if (url.includes('/mf/2')) {
          return Promise.resolve(jsonResponse({ data: [{ date: today, nav: '250.1234' }] }))
        }
        return Promise.reject(new Error('unexpected url: ' + url))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).not.toBeNull()
    expect(points![0].nav).toBe(250.1234)
  })

  it('prefers the candidate with the longest history among still-reporting matches', async () => {
    const today = ddmmyyyy(new Date())
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) {
          return Promise.resolve(
            jsonResponse([
              { schemeCode: 1, schemeName: 'New AMC Nifty 50 Index Fund - Direct Plan - Growth' },
              { schemeCode: 2, schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' },
            ]),
          )
        }
        if (url.includes('/mf/1')) {
          // recent, but launched much more recently -> shorter history
          return Promise.resolve(jsonResponse({ data: [{ date: today, nav: '10.00' }, { date: '01-01-2025', nav: '9.50' }] }))
        }
        if (url.includes('/mf/2')) {
          // recent, and a much longer track record
          return Promise.resolve(jsonResponse({ data: [{ date: today, nav: '250.12' }, { date: '01-01-2005', nav: '10.00' }] }))
        }
        return Promise.reject(new Error('unexpected url: ' + url))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).not.toBeNull()
    // parseDmy builds dates via Date.UTC, so compare in UTC too (avoids a
    // timezone-dependent off-by-one on the local getFullYear()).
    expect(points![0].date.getUTCFullYear()).toBe(2005)
  })

  it('returns null when every candidate is stale', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) return Promise.resolve(jsonResponse([{ schemeCode: 1, schemeName: 'IDBI Nifty 50 Index Fund - Direct Plan - Growth' }]))
        if (url.includes('/mf/1')) return Promise.resolve(jsonResponse({ data: [{ date: '27-07-2023', nav: '39.40' }] }))
        return Promise.reject(new Error('unexpected url: ' + url))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).toBeNull()
  })

  it('returns null when no candidate matches confidently (never guesses)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) return Promise.resolve(jsonResponse([{ schemeCode: 1, schemeName: 'Some Completely Unrelated Debt Fund - Direct - Growth' }]))
        return Promise.reject(new Error('should not be called'))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).toBeNull()
  })

  it('returns null when the search is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const points = await fetchNiftyBenchmark()
    expect(points).toBeNull()
  })

  it('finds a candidate that only a secondary AMC-specific query surfaces, not the generic one', async () => {
    // Real case (2026-07-10): mfapi.in's search caps results and returns them
    // alphabetically by AMC, so a generic "Nifty 50 Index Fund" query never
    // reaches UTI's or Nippon India's long-running trackers — they only show
    // up under their own AMC-specific query. Simulates that split here: the
    // generic query returns an unrelated short-lived fund, and only the
    // "UTI ..." query returns the real long-history candidate.
    const today = ddmmyyyy(new Date())
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search?q=UTI')) {
          return Promise.resolve(jsonResponse([{ schemeCode: 99, schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' }]))
        }
        if (url.includes('/search')) {
          return Promise.resolve(jsonResponse([{ schemeCode: 1, schemeName: 'New AMC Nifty 50 Index Fund - Direct Plan - Growth' }]))
        }
        if (url.includes('/mf/99')) {
          return Promise.resolve(jsonResponse({ data: [{ date: today, nav: '250.12' }, { date: '01-01-2013', nav: '10.00' }] }))
        }
        if (url.includes('/mf/1')) {
          return Promise.resolve(jsonResponse({ data: [{ date: today, nav: '10.00' }, { date: '01-01-2025', nav: '9.50' }] }))
        }
        return Promise.reject(new Error('unexpected url: ' + url))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).not.toBeNull()
    // picks the longer-history candidate found only via the secondary query
    expect(points![0].date.getUTCFullYear()).toBe(2013)
  })

  it('deduplicates a candidate returned by more than one query, fetching its history only once', async () => {
    const today = ddmmyyyy(new Date())
    const historyFetches: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/search')) {
          return Promise.resolve(jsonResponse([{ schemeCode: 3, schemeName: 'UTI Nifty 50 Index Fund - Direct Plan - Growth' }]))
        }
        if (url.includes('/mf/3')) {
          historyFetches.push(url)
          return Promise.resolve(jsonResponse({ data: [{ date: today, nav: '250.12' }] }))
        }
        return Promise.reject(new Error('unexpected url: ' + url))
      }),
    )
    const points = await fetchNiftyBenchmark()
    expect(points).not.toBeNull()
    expect(historyFetches.length).toBe(1)
  })
})
