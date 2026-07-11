import { canonCore, normName } from '../../engine/harmonise'
import type { LiveMatch } from '../../engine/harmonise'
import { fetchJSON } from '../http'

// mfapi dates are dd-mm-yyyy.
export function parseDmy(s: string | null | undefined): Date | null {
  const m = /(\d{2})-(\d{2})-(\d{4})/.exec(String(s || ''))
  if (!m) return null
  return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]))
}

interface MfapiSearchResult {
  schemeCode: number | string
  schemeName: string
}

interface MfapiLatestResponse {
  meta?: { scheme_name?: string }
  data?: { nav: string; date: string }[]
}

interface ScoredMatch {
  result: MfapiSearchResult
  score: number
  exact: boolean // candidate's core tokens are exactly `want` — no extra, nothing missing
}

// Searches mfapi.in for `q` and scores candidates against `canon`/`name`,
// returning the best match (or null if nothing scores >= threshold). Split
// out of mfapiByName so several different query strings can be tried in
// turn — see mfapiByName's own comment for why one query string isn't enough.
async function searchAndScore(q: string, canon: string, name: string): Promise<ScoredMatch | null> {
  // 20s, not 9-15s: measured directly in a real browser (2026-07-11), the
  // very first request of a session to a cold api.mfapi.in connection can
  // take up to ~17s — a real, observed worst case, not a hypothetical one.
  // Every request after the first over the same connection is fast
  // (well under 2s), so this only costs anything on that one first request.
  const list = await fetchJSON<MfapiSearchResult[]>('https://api.mfapi.in/mf/search?q=' + encodeURIComponent(q), 20000)
  if (!Array.isArray(list) || !list.length) return null
  const want = new Set(canon.split(' ').filter(Boolean))
  const wantDirect = /\bdirect\b/.test(normName(name))
  const wantIdcw = /\bidcw\b/.test(normName(name))
  let best: MfapiSearchResult | null = null
  let bestScore = -Infinity
  let bestExact = false
  for (const c of list) {
    const cn = canonCore(c.schemeName)
    if (/\bdirect\b/.test(normName(c.schemeName)) !== wantDirect) continue
    if (/\bidcw\b/.test(normName(c.schemeName)) !== wantIdcw) continue
    const toks = new Set(cn.split(' '))
    let overlap = 0
    want.forEach((t) => {
      if (toks.has(t)) overlap++
    })
    // extra = tokens the candidate has beyond what we're looking for. Found via
    // a 100-fund coverage sweep (2026-07-11): "Aditya Birla Sun Life Liquid
    // Fund" and the unrelated "Aditya Birla Sun Life Gilt Plus - Liquid Plan"
    // share every core token of the former as a strict subset, differing only
    // by "gilt"/"plus". Under the old score = overlap - |sizeDiff|*0.1 formula
    // that 2-token difference cost only 0.2, so the wrong sibling fund still
    // cleared the confidence bar whenever it was the only Direct/Growth
    // candidate present in a given query's capped 15 results. Penalizing extra
    // tokens at full weight (not 0.1) makes an unrelated-but-overlapping
    // product family score well below a true exact match. See docs/DECISIONS.md.
    const extra = toks.size - overlap
    const score = overlap * 2 - extra
    const exact = extra === 0 && overlap === want.size
    if (score > bestScore) {
      bestScore = score
      best = c
      bestExact = exact
    }
  }
  return best && bestScore >= 4 ? { result: best, score: bestScore, exact: bestExact } : null
}

// mfapi.in fallback for a single scheme, matched by name (mfapi.in has no
// ISIN-search endpoint). Search uses the alias-resolved (current) name so a
// stale token like "Equity" in an old statement name doesn't hide the
// renamed scheme.
export async function mfapiByName(name: string): Promise<LiveMatch | null> {
  const canon = canonCore(name)
  const bareQ = canon.split(' ').slice(0, 6).join(' ')
  const planWord = /\bdirect\b/.test(normName(name)) ? 'direct' : 'regular'
  // mfapi.in's /search caps results at 15 with no relevance ranking, so any
  // single query string can be crowded out or, worse, return a confident
  // match for the *wrong* fund:
  //  - bare core-token query (canonCore strips "fund"/"plan"): a same-AMC
  //    family with more share classes than the target can fill all 15 slots
  //    — e.g. "axis arbitrage" returns only "Axis Income Plus Arbitrage
  //    Active/Passive FOF" variants, never "Axis Arbitrage Fund" itself.
  //  - "+fund"-narrowed query: fixes the above, but real found (2026-07-10)
  //    "Quantum Diversified Equity All Cap Active FOF" has no literal "Fund"
  //    in its name at all, so requiring the word "fund" returns zero results
  //    when the bare query alone finds it immediately.
  //  - "+direct"/"+regular"-narrowed query: fixes AMCs with dozens of
  //    pre-2013 share classes (ICICI Prudential, Aditya Birla Sun Life, ...)
  //    that fill all 15 slots with legacy Institutional/Retail/IDCW variants
  //    predating Direct plans, none of which the "+fund" query excludes
  //    (they all already say "fund").
  // No single query is safe alone, and — found via a 100-fund coverage sweep
  // (2026-07-11) on "Aditya Birla Sun Life Liquid Fund" — an *earlier* tier
  // can also return a confident but WRONG match: its bare-query result set
  // was crowded entirely by an unrelated sibling ("...Gilt Plus - Liquid
  // Plan"), which was the only Direct/Growth candidate present and so won
  // that tier outright, even though the "+fund" tier's result set (tried
  // second) contained the real fund cleanly. So this can't stop at the first
  // tier that clears the confidence bar — it must run every tier and keep
  // the single best-scoring match across all of them, only short-circuiting
  // early when a tier produces an exact (no extra, nothing missing) match,
  // since nothing later could ever outscore that.
  const queries = [bareQ, bareQ + ' fund', bareQ + ' ' + planWord]
  let best: ScoredMatch | null = null
  for (const q of queries) {
    const candidate = await searchAndScore(q, canon, name)
    if (candidate && (!best || candidate.score > best.score)) best = candidate
    if (best?.exact) break
  }
  return best ? finalizeMfapiMatch(best.result) : null
}

async function finalizeMfapiMatch(best: MfapiSearchResult): Promise<LiveMatch | null> {
  const d = await fetchJSON<MfapiLatestResponse>('https://api.mfapi.in/mf/' + best.schemeCode + '/latest', 20000)
  const row = d?.data?.[0]
  if (!row) return null
  const nav = parseFloat(row.nav)
  if (!isFinite(nav)) return null
  return { nav, date: parseDmy(row.date), source: 'mfapi.in', name: d?.meta?.scheme_name || best.schemeName }
}
