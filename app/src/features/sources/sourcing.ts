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
// Reason copy is layperson-first (review item A6): each string says what
// happened, whether the numbers can be trusted, and — for the failure
// cases — what the user can do about it, before any term of art.
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
        `Today's price came from ${f.navSource || 'a live source'}, dated ${fmtDate(f.navDate)}.` +
        (renamed ? ` The fund has been renamed since your statement — ${f.navSource === 'AMFI' ? 'AMFI' : 'the source'} now lists it as “${f.liveName}”; it's the same fund.` : ''),
    }
  }
  if (!f.active) {
    return {
      live: false,
      source: '—',
      current: null,
      status,
      reason: 'Fully sold — you no longer hold any units, so no current price is needed. Its past gains still count in your overall totals.',
    }
  }
  if (f.liveRejected) {
    return {
      live: false,
      source: 'Statement',
      current: null,
      status,
      reason: `A price of ₹${isFinite(f.rejectedNav) ? f.rejectedNav.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '?'} was found${f.rejectedName ? ` (listed as “${f.rejectedName}”)` : ''}, but it's too far from your statement's price of ₹${isFinite(f.nav) ? f.nav.toLocaleString('en-IN', { maximumFractionDigits: 4 }) : '?'} — that usually means it belongs to a different fund with a similar name, so it was rejected to keep your numbers safe. Using the statement price instead.`,
    }
  }
  if (!live || !diag?.reachable) {
    return {
      live: false,
      source: 'Statement',
      current: null,
      status,
      reason:
        "Today's price sources couldn't be reached — usually a connection problem, or a browser privacy extension blocking the requests. Using the price from your statement; try Refresh in a little while.",
    }
  }
  return {
    live: false,
    source: 'Statement',
    current: null,
    status,
    reason:
      `No matching fund was found on any of the price sources (AMFI, mf.captnemo.in, mfapi.in)${f.isin ? ` for its ISIN code ${f.isin}` : ' — your statement carries no ISIN code for it, and its name didn’t match either'}. ` +
      'Using the price from your statement, so its figures are accurate as of the statement date. Recently renamed or merged funds often match after the sources update — try Refresh in a few days.',
  }
}
