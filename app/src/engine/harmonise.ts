import { NAME_ALIAS_GROUPS } from '../reference/aliases'

// Name harmonisation and live-NAV matching helpers, ported from
// reference/engine.js. Critical for correctness — see docs/DECISIONS.md
// "Live-NAV matching (the source of most bugs — read carefully)". These are
// pure string/number functions; the actual live-NAV fetching is Phase 3
// (marketdata/), but analyzePortfolio's liveFor() needs these ready now.

export interface LiveRow {
  core: string
  plan: string
  nav: number
  date: Date | null
  source: string
  name?: string | null
}

export interface LiveMatch {
  nav: number
  date: Date | null
  source: string
  name?: string | null
}

// The live-NAV map passed to analyzePortfolio (Phase 3's market-data layer
// produces this; omitted entirely for statement-only analysis).
export interface LiveNavMap {
  byIsin?: Record<string, LiveMatch>
  byName?: Record<string, LiveMatch>
  rows?: LiveRow[]
  source?: string | null
}

// Normalise a scheme name to a comparable token string, preserving the
// discriminators that matter (direct vs regular, growth vs idcw) so a
// live-data lookup doesn't match the wrong plan.
export function normName(name: string): string {
  let n = String(name || '').toLowerCase()
  n = n
    .replace(/\(formerly[^)]*\)/g, ' ')
    // AMFI's own rename marker (e.g. "ICICI Prudential Large Cap Fund
    // (erstwhile Bluechip Fund)") — same idea as "(formerly ...)" above, but
    // a different word AMFI happens to use for it. Left unstripped, the old
    // name's tokens ("erstwhile bluechip") became unwanted extra tokens on
    // the *current* listing, penalizing it in searchAndScore (mfapi.ts)
    // enough that an unrelated same-AMC decoy ("Large & Mid Cap Fund") could
    // outscore the real target. Found via a real statement (2026-07-11) — see
    // docs/DECISIONS.md.
    .replace(/\(erstwhile[^)]*\)/g, ' ')
    .replace(/\(non-?demat\)/g, ' ')
    .replace(/\(advisor:?[^)]*\)/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(fund|plan|the|open|ended|scheme|option)\b/g, ' ')
  n = n
    .replace(/\bidcw\b|\bdividend\b|\breinvestment\b|\bpayout\b/g, 'idcw')
    .replace(/\bgr\b/g, 'growth')
  return n.replace(/\s+/g, ' ').trim()
}

// The plan/option discriminator: direct-vs-regular and growth-vs-idcw.
export function planKey(name: string): string {
  const n = normName(name)
  const arm = /\bdirect\b/.test(n) ? 'direct' : 'regular' // statements default to regular
  const opt = /\bidcw\b/.test(n) ? 'idcw' : 'growth'
  return arm + '-' + opt
}

// Core scheme tokens with plan/option words removed (e.g. "kotak small cap").
export function coreTokens(name: string): string {
  let c = normName(name)
    .replace(/\b(direct|regular|growth|idcw)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  // Sweeping SEBI-era renames: most "<AMC> Equity Arbitrage" became "<AMC> Arbitrage".
  c = c.replace(/\bequity arbitrage\b/g, 'arbitrage')
  return c.replace(/\s+/g, ' ').trim()
}

// Alias-resolved core, so renamed variants collapse to one canonical string.
export function canonCore(name: string): string {
  const c = coreTokens(name)
  for (const grp of NAME_ALIAS_GROUPS) if (grp.indexOf(c) >= 0) return grp[0]
  return c
}

// The key used to match a holding to a live-data record by name (rename-proof).
export function liveKey(name: string): string {
  return canonCore(name) + '|' + planKey(name)
}

// Registrar statements and AMFI sometimes disagree on the letter O vs the
// digit 0 inside an ISIN (e.g. INF109K016O4). Fold O->0 so either spelling matches.
export function isin0(s: string | null | undefined): string | null | undefined {
  return s ? String(s).replace(/O/g, '0') : s
}

// A live NAV is only trustworthy if it's in a sane band of the statement's
// own NAV (dates are close), so a wrong-fund match can't silently corrupt
// the valuation. See docs/DECISIONS.md "Plausibility gate".
export function navPlausible(nav: number, stmtNav: number): boolean {
  return isFinite(nav) && nav > 0 && (!(isFinite(stmtNav) && stmtNav > 0) || (nav / stmtNav >= 1 / 3 && nav / stmtNav <= 3))
}

// Raw core for *display* comparison only (no alias/arbitrage collapse), so a
// genuine name change is still detected even when matching has harmonised it.
export function rawCore(name: string): string {
  return normName(name)
    .replace(/\b(direct|regular|growth|idcw)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Last-resort name match: among AMFI rows of the SAME plan, pick the one
// whose alias-resolved core tokens overlap most with the holding's. Catches
// name variations that an exact key misses (extra/dropped words, reorderings).
export function fuzzyLive(name: string, rows: LiveRow[] | null | undefined): LiveRow | null {
  if (!rows || !rows.length) return null
  const want = canonCore(name).split(' ').filter(Boolean)
  if (!want.length) return null
  const plan = planKey(name)
  let best: LiveRow | null = null
  let bestScore = 0
  for (const r of rows) {
    if (r.plan !== plan) continue
    const rc = r.core.split(' ').filter(Boolean)
    const setR = new Set(rc)
    let overlap = 0
    for (const t of want) if (setR.has(t)) overlap++
    const score = overlap / Math.max(want.length, rc.length) // Jaccard-ish
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }
  return bestScore >= 0.7 ? best : null
}
