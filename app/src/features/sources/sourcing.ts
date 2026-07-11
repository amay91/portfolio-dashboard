import { rawCore } from '../../engine/harmonise'
import type { Fund } from '../../engine/types'
import { fmtDate } from '../../format'

export interface Sourcing {
  live: boolean
  source: string
  current: string | null
  reason: string
  // Mirrors engine/datacheck.ts's per-fund classification exactly (Pass iff
  // navLive) so the Data Sources table's status column never disagrees with
  // the DataCheck headline's pass/fail counts.
  status: 'Pass' | 'Fail'
}

// Per-fund NAV provenance for the summary table and Data Sources panel.
// Ported from reference/engine.js buildSourcing/srcFor — simplified to a
// pure per-fund function rather than a name/ISIN-keyed side map, since
// every field it needs already lives directly on the analyzed Fund.
export function sourceFor(f: Fund, live: boolean, diag: { reachable: boolean } | null | undefined): Sourcing {
  const status = f.navLive ? 'Pass' : 'Fail'
  if (f.navLive) {
    const renamed = !!(f.liveName && rawCore(f.liveName) && rawCore(f.liveName) !== rawCore(f.name))
    return {
      live: true,
      source: f.navSource || 'live',
      current: renamed ? f.liveName : null,
      status,
      reason:
        `Latest NAV sourced from ${f.navSource || 'a live source'}, dated ${fmtDate(f.navDate)}.` +
        (renamed ? ` Matched across a name change — ${f.navSource === 'AMFI' ? 'AMFI' : 'the source'} now lists it as “${f.liveName}”.` : ''),
    }
  }
  if (!f.active) {
    return { live: false, source: '—', current: null, status, reason: 'Exited / fully redeemed — current market value is ₹0, so no live NAV is required.' }
  }
  if (f.liveRejected) {
    return {
      live: false,
      source: 'Statement',
      current: null,
      status,
      reason: `A live NAV of ₹${isFinite(f.rejectedNav) ? f.rejectedNav.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '?'} was found${f.rejectedName ? ` (listed as “${f.rejectedName}”)` : ''} but rejected as implausible — it differs too much from the statement NAV of ₹${isFinite(f.nav) ? f.nav.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '?'}, which signals a wrong-fund match. Kept the statement NAV instead.`,
    }
  }
  if (!live || !diag?.reachable) {
    return { live: false, source: 'Statement', current: null, status, reason: 'Live market-data sources were unreachable (network or CORS block); valued at the statement NAV.' }
  }
  return {
    live: false,
    source: 'Statement',
    current: null,
    status,
    reason: 'No matching live NAV found ' + (f.isin ? `for ISIN ${f.isin}` : '(no ISIN in statement, name match failed)') + ' across AMFI, mf.captnemo.in or mfapi.in; valued at the statement NAV.',
  }
}
