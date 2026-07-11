import type { Portfolio } from './types'

// Minimal shape datacheck needs from the market-data diagnostics — avoids a
// dependency from engine/ (network-independent) on marketdata/.
export interface ReachabilityDiag {
  reachable: boolean
}

export interface DataCheckIssue {
  name: string
  isin: string | null
  why: string
}

export interface DataCheckResult {
  checked: number
  live: number
  onStatement: number
  reachable: boolean
  reconciles: boolean
  issues: DataCheckIssue[]
  asOf: Date | null
  allLive: boolean
}

// Post-parse audit: after every load/refresh, verify every visible holding
// resolves a live NAV (or explain why not) and that the visible holdings
// reconcile exactly to the headline total, *before* the user is asked to
// trust the numbers. Ported from reference/engine.js runDataCheck.
export function runDataCheck(pf: Portfolio, diag: ReachabilityDiag | null | undefined): DataCheckResult {
  const active = pf.funds.filter((f) => f.active)
  const onStmt = active.filter((f) => !f.navLive)
  const liveN = active.length - onStmt.length
  const reachable = !!(diag && diag.reachable)
  // reconciliation: the visible holdings must sum to the headline value
  const sumMV =
    active.reduce((a, f) => a + (isFinite(f.marketValue) ? f.marketValue : 0), 0) +
    pf.funds.filter((f) => !f.active).reduce((a, f) => a + (isFinite(f.marketValue) ? f.marketValue : 0), 0)
  const reconciles = Math.abs(sumMV - pf.totalValue) < Math.max(1, pf.totalValue * 1e-6)
  const issues: DataCheckIssue[] = onStmt.map((f) => ({
    name: f.name,
    isin: f.isin || null,
    why: !reachable ? 'Live sources were unreachable' : 'No live NAV could be matched to this fund',
  }))
  return {
    checked: active.length,
    live: liveN,
    onStatement: onStmt.length,
    reachable,
    reconciles,
    issues,
    asOf: pf.liveAsOf || pf.valDate,
    allLive: onStmt.length === 0 && reachable,
  }
}
