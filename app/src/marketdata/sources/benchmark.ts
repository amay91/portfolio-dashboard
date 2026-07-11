import { fetchJSON } from '../http'
import { parseDmy } from './mfapi'

export interface BenchmarkPoint {
  date: Date
  nav: number
}

interface MfapiSearchResult {
  schemeCode: number | string
  schemeName: string
}
interface MfapiHistoryResponse {
  meta?: { scheme_name?: string }
  data?: { nav: string; date: string }[]
}

// mfapi.in's search endpoint caps results (observed: 15) and returns them
// alphabetically by AMC name — a single broad query like 'Nifty 50 Index
// Fund' fills that cap with Angel One/IDBI/Motilal Oswal's several variants
// before ever reaching alphabetically-later AMCs, so UTI's direct-growth
// Nifty 50 tracker (real, still-reporting, continuous history back to 2013)
// never appears at all — not filtered out, never returned by the search.
// Confirmed via mfapi.in directly (2026-07-10): searching "Nifty 50 Index
// Fund" returns exactly 15 hits, none from UTI; searching "UTI Nifty 50
// Index Fund" finds it immediately. Just these two — HDFC/ICICI
// Prudential/SBI's schemes use "Cumulative"/"IDCW" naming instead of
// "Growth", so they never pass the growth-option filter below regardless of
// how they're searched for, and Nippon India's history duplicates UTI's
// (same 2013 start) — adding either only means more requests for no extra
// coverage (see the sequential-fetch note below for why request count matters).
const NIFTY_QUERIES = ['Nifty 50 Index Fund', 'UTI Nifty 50 Index Fund']
// A scheme whose most recent NAV is older than this is treated as wound up
// or merged away (e.g. IDBI's Nifty 50 index fund stopped reporting after
// IDBI Mutual Fund was absorbed into LIC MF in 2023) rather than a live
// tracker — using its last known level as "today's" index value would be
// silently wrong, not just imprecise.
const STALE_DAYS = 45

function isRecent(points: BenchmarkPoint[]): boolean {
  if (!points.length) return false
  const latest = points[points.length - 1].date
  return Date.now() - +latest < STALE_DAYS * 86400000
}

// A Nifty 50 tracker fund's full NAV history, used as a real-money proxy for
// "Nifty 50 returns" in the CAGR/XIRR benchmark comparison. There's no
// reliable, CORS-friendly public API for the raw NSE index level itself —
// the same category of source this app deliberately avoids for fund NAVs
// (see docs/DECISIONS.md, tasks.md N1). mfapi.in is already trusted here for
// fund NAVs, and its `/mf/{code}` endpoint (unlike the `/latest` variant
// used elsewhere) returns a scheme's *complete* history, so it can serve
// this too with no new network dependency. Matching is deliberately strict —
// a low-cost, direct-plan, growth-option Nifty 50 index fund only, excluding
// near-miss variants (Next 50, equal-weight, value). Every candidate is
// checked for a *recent* NAV (skipping schemes that have quietly stopped
// reporting — wound up/merged — rather than treating a stale last-known
// level as current), and among the still-reporting candidates this picks
// the one with the *longest* history, so an older portfolio's "all-time"
// window isn't clipped to a newer AMC's fund's short track record. Returns
// null when nothing confident is found, rather than guessing. This measures
// a real fund's return (small tracking error + expense drag vs the
// theoretical index), which is disclosed in the UI rather than presented as
// the exact index figure.
export async function fetchNiftyBenchmark(): Promise<BenchmarkPoint[] | null> {
  // Sequential, not Promise.all: measured directly against the real API
  // (2026-07-10) a browser's *first* request to a cold api.mfapi.in
  // connection can take 8-11s, while every request after it over the same
  // connection lands in ~300ms. Firing both queries in parallel means BOTH
  // pay that cold-start cost independently (neither can reuse a connection
  // the other hasn't finished opening yet), which intermittently blew past
  // this function's own timeout and silently produced a blank Nifty 50
  // comparison — the actual cause of an "All-Time Nifty CAGR is blank" report
  // that a first-pass fix (broadening the query set, but still parallel)
  // didn't resolve. Going one at a time means only the first query can ever
  // be slow; the second reuses its now-warm connection.
  const byCode = new Map<number | string, MfapiSearchResult>()
  for (const q of NIFTY_QUERIES) {
    const list = await fetchJSON<MfapiSearchResult[]>('https://api.mfapi.in/mf/search?q=' + encodeURIComponent(q), 15000)
    if (!Array.isArray(list)) continue
    for (const c of list) byCode.set(c.schemeCode, c)
  }
  if (!byCode.size) return null
  const candidates = [...byCode.values()].filter((c) => {
    const n = c.schemeName.toLowerCase()
    return (
      n.includes('nifty 50') &&
      n.includes('index') &&
      n.includes('direct') &&
      n.includes('growth') &&
      !n.includes('next 50') &&
      !n.includes('value 20') &&
      !n.includes('equal weight') &&
      !n.includes('quality')
    )
  })

  const histories = await Promise.all(
    candidates.map(async (pick) => {
      const hist = await fetchJSON<MfapiHistoryResponse>('https://api.mfapi.in/mf/' + pick.schemeCode, 15000)
      const rows = hist?.data
      if (!Array.isArray(rows) || !rows.length) return null
      const points: BenchmarkPoint[] = []
      for (const r of rows) {
        const d = parseDmy(r.date)
        const nav = parseFloat(r.nav)
        if (d && isFinite(nav) && nav > 0) points.push({ date: d, nav })
      }
      if (!points.length) return null
      points.sort((a, b) => +a.date - +b.date)
      return points
    }),
  )

  let best: BenchmarkPoint[] | null = null
  for (const points of histories) {
    if (!points || !isRecent(points)) continue
    if (!best || points[0].date < best[0].date) best = points
  }
  return best
}

// A fund's nearest-available point must be within this many days of the
// requested date to count as "covering" it. Generous enough to absorb
// normal weekend/holiday nearest-match slop in a daily NAV series, nowhere
// near enough to accept a gap of months or years.
const COVERAGE_TOLERANCE_MS = 30 * 86400000

// CAGR between the two NAV points nearest `from` and `to` — "nearest" rather
// than interpolated, which is close enough for an approximate benchmark
// comparison against a daily NAV series. Returns null (not a silently
// shorter-window number) when the fund's own history doesn't actually reach
// back to `from` — found via a real case: IDBI's long-running Nifty 50
// tracker stopped reporting in 2023, leaving a brand-new fund (launched
// 2025) as the only still-reporting match. Using its nearest point to an
// 11-year-old portfolio inception date silently computed that fund's own
// ~1-year return and presented it as an "all-time" comparison — a real
// number, but not an answer to the question asked. See docs/DECISIONS.md
// "Nifty 50 benchmark: a short-history fund must not fake a long window".
export function benchmarkCagr(points: BenchmarkPoint[], from: Date, to: Date): number | null {
  if (!points.length || +to <= +from) return null
  const nearest = (d: Date): BenchmarkPoint => {
    let best = points[0]
    for (const p of points) if (Math.abs(+p.date - +d) < Math.abs(+best.date - +d)) best = p
    return best
  }
  const p0 = nearest(from)
  const p1 = nearest(to)
  if (Math.abs(+p0.date - +from) > COVERAGE_TOLERANCE_MS) return null
  if (Math.abs(+p1.date - +to) > COVERAGE_TOLERANCE_MS) return null
  const years = (+p1.date - +p0.date) / (365.25 * 86400000)
  if (years <= 0 || p0.nav <= 0) return null
  return Math.pow(p1.nav / p0.nav, 1 / years) - 1
}
