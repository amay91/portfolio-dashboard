import { createTtlCache } from './cache'
import { getDayCachedAmfiMap, setDayCachedAmfiMap } from './dayCache'
import { fetchAmfi, parseAmfi } from './sources/amfi'
import type { AmfiMap } from './sources/amfi'
import { fetchAmfiEdge } from './sources/amfiEdge'
import { captnemoByIsin } from './sources/captnemo'
import { mfapiByName } from './sources/mfapi'
import { fuzzyLive, isin0, liveKey, navPlausible } from '../engine/harmonise'
import type { LiveMatch, LiveNavMap, LiveRow } from '../engine/harmonise'
import { isSchemeHeld } from '../engine/types'
import type { Scheme } from '../engine/types'

export interface Diag {
  amfiOk: boolean
  captnemoUsed: boolean
  mfapiUsed: boolean
  reachable: boolean
}

export interface ResolveResult {
  live: LiveNavMap | null
  diag: Diag
}

// The direct-fetch AMFI map is cached for 180s (matching the prototype);
// `force` (the Refresh button) bypasses it. Only used when resolveLiveNavs
// isn't given an edge function URL (see fetchAmfiTier below) — AMFI serves
// no CORS headers, so this direct fetch only succeeds outside a browser
// (tests, the edge function itself) until N2's edge function is deployed.
const amfiCache = createTtlCache<AmfiMap>(async () => {
  const txt = await fetchAmfi()
  return txt ? parseAmfi(txt) : null
}, 180000)

interface AmfiTier {
  byIsin: Record<string, LiveMatch>
  byName: Record<string, LiveMatch>
  rows: LiveRow[]
}

// N3: when a deployed edge function URL is supplied (tasks N2/D1), it
// replaces the direct AMFI fetch as the primary AMFI-data source — the
// point of building the edge function at all. It only returns a byIsin map
// (see amfiNav.ts's deliberately narrow scope), so byName/rows stay empty;
// an ISIN-less scheme that would have matched AMFI's byName instead falls
// through to the mfapi.in name-search gap-rescue tier below, which already
// covers that case. `edgeUrl` is undefined today everywhere (dev, tests,
// production) since nothing is deployed yet — this is inert until D1
// assigns a real URL and App.tsx is given it via an env var.
//
// N4: below the in-memory 180s TTL cache above (which only helps repeated
// calls within one tab session) sits a second, IndexedDB-backed layer
// (dayCache.ts) that survives a page reload — `force` (the Refresh button)
// skips straight past it to a real fetch, same as it already skips the
// in-memory cache; a successful fetch always re-persists so the next
// same-day reload picks up whatever "Refresh" just got. Edge-fn path isn't
// day-cached here — N2's function already sets a day-long CDN
// `Cache-Control` server-side, so caching it again client-side would only
// save a round-trip, not real data freshness, for a case that isn't
// deployed yet anyway.
async function fetchAmfiTier(force: boolean | undefined, edgeUrl: string | undefined): Promise<AmfiTier | null> {
  if (edgeUrl) {
    const byIsin = await fetchAmfiEdge(edgeUrl)
    return byIsin ? { byIsin, byName: {}, rows: [] } : null
  }
  if (!force) {
    const dayCached = await getDayCachedAmfiMap()
    if (dayCached) return dayCached
  }
  const amfi = await amfiCache.get(force)
  if (amfi) await setDayCachedAmfiMap(amfi)
  return amfi ? { byIsin: amfi.byIsin, byName: amfi.byName, rows: amfi.rows || [] } : null
}

// Builds a live-NAV map for the schemes in the current statement. Ported
// from reference/engine.js fetchLiveNavs — see docs/DECISIONS.md
// "Live-NAV matching" for the layered design and why each step exists.
export async function resolveLiveNavs(schemes: Scheme[], force?: boolean, edgeUrl?: string): Promise<ResolveResult> {
  const byIsin: Record<string, LiveMatch> = {}
  const byName: Record<string, LiveMatch> = {}
  let rows: LiveRow[] = []
  const diag: Diag = { amfiOk: false, captnemoUsed: false, mfapiUsed: false, reachable: false }

  // isSchemeHeld() (review item C3): this used to independently re-implement
  // the same units-or-marketValue check with a subtly different fallback
  // order (falling through to marketValue even when closingUnits was
  // present-but-below-threshold) from engine/portfolio.ts's version — the
  // two could disagree on a scheme sitting on redemption dust with a stale
  // nonzero marketValue. Now genuinely shared, not just similar.
  const held = schemes.filter(isSchemeHeld)

  // Race the AMFI tier (edge fn if configured, else the direct fetch) and
  // the CORS-native per-ISIN captnemo lookups in parallel rather than trying
  // captnemo only after AMFI fails: captnemo needs no proxy at all, so it's
  // the more resilient primary for any held scheme with an ISIN (the common
  // case), while the AMFI tier still covers ISIN-less schemes (e.g. AXIS)
  // by name (direct-fetch path only) and cross-checks the rest.
  const withIsin = held.filter((s) => s.isin)
  const [amfi, captnemoResults] = await Promise.all([
    fetchAmfiTier(force, edgeUrl),
    Promise.all(
      withIsin.map((s) =>
        captnemoByIsin(s.isin)
          .then((r) => ({ s, r }))
          .catch(() => ({ s, r: null })),
      ),
    ),
  ])
  if (amfi) {
    Object.assign(byIsin, amfi.byIsin)
    Object.assign(byName, amfi.byName)
    rows = amfi.rows
    diag.amfiOk = true
    diag.reachable = true
  }
  for (const { s, r } of captnemoResults) {
    if (r && navPlausible(r.nav, s.nav)) {
      byIsin[s.isin] = r
      const z = isin0(s.isin)
      if (z && z !== s.isin) byIsin[z] = r
      diag.captnemoUsed = true
      diag.reachable = true
    }
  }

  // A scheme counts as matched only if we can resolve a *plausible* live NAV
  // for it (ISIN raw/O-0, then alias name, then fuzzy). A missing OR
  // wrong-fund match both leave it a "gap", so mfapi.in (by name) is tried to
  // rectify it rather than leaving it wrongly valued or stuck on statement NAV.
  const resolve = (s: Scheme): LiveMatch | null => {
    const r =
      (s.isin && (byIsin[s.isin] || byIsin[isin0(s.isin) || ''])) || byName[liveKey(s.name)] || fuzzyLive(s.name, rows)
    return r && navPlausible(r.nav, s.nav) ? r : null
  }
  const gaps = held.filter((s) => !resolve(s))

  if (gaps.length) {
    // mfapi.in by name (rescue), accepted only if plausible. Sequential, not
    // Promise.all: measured directly against the real API in a browser
    // (2026-07-11) — a single mfapi.in request is fast (~300ms-1s once warm),
    // but firing multiple gap lookups at once made two concurrent requests
    // take 17+ seconds combined (mfapi.in appears to serialize/throttle
    // concurrent requests from the same client), blowing well past
    // mfapiByName's own per-request timeouts and surfacing as "Live
    // market-data sources were unreachable" for funds that resolve
    // instantly on their own. Same root cause and fix as the Nifty-50
    // benchmark fetch (see marketdata/sources/benchmark.ts) — going one gap
    // at a time costs a little latency for a portfolio with several
    // unmatched funds, but each one individually stays fast and reliable
    // instead of the whole batch risking a shared timeout.
    for (const s of gaps) {
      let r: Awaited<ReturnType<typeof mfapiByName>> = null
      try {
        r = await mfapiByName(s.name)
      } catch {
        r = null
      }
      if (r && navPlausible(r.nav, s.nav)) {
        byName[liveKey(s.name)] = r
        diag.mfapiUsed = true
        diag.reachable = true
      }
    }
  }

  // Build the display source string once, from which sources actually
  // contributed a plausible match — not per-fund (a naive per-match append
  // would repeat e.g. "mf.captnemo.in" once per fund it resolved).
  const sourceParts: string[] = []
  if (diag.amfiOk) sourceParts.push('AMFI')
  if (diag.captnemoUsed) sourceParts.push('mf.captnemo.in')
  if (diag.mfapiUsed) sourceParts.push('mfapi.in')
  const source = sourceParts.length ? sourceParts.join(' + ') : null

  const any = Object.keys(byIsin).length || Object.keys(byName).length || rows.length
  return { live: any ? { byIsin, byName, rows, source } : null, diag }
}
