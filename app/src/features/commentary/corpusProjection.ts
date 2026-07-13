import type { Portfolio } from '../../engine/types'

export interface CorpusProjection {
  years: number
  annualContribution: number
  conservativeRate: number
  expectedRate: number
  conservativeFV: number
  expectedFV: number
}

// A long-run assumption used only when the portfolio's own historical rate
// is unavailable or clearly unrealistic to extrapolate (see the clamp
// below) — not a market forecast, just a floor for the "conservative"
// scenario so it's never nonsensically optimistic.
const CONSERVATIVE_RATE = 0.08
// Clamps how far the portfolio's own historical CAGR is trusted going
// forward — protects against a short, lucky (or unlucky) window
// extrapolating an implausible rate decades out.
const MIN_EXPECTED_RATE = 0.04
const MAX_EXPECTED_RATE = 0.16

// Projects the portfolio's value at retirement (review item A3) — the
// missing piece between "your equity % fits your horizon" (the existing
// band verdict) and an actual number to plan around. Grounded entirely in
// data the engine already has: today's value, the portfolio's own
// historical CAGR, and an implied annual contribution rate (total invested
// ÷ years invested — the same "since inception" window the rest of the
// dashboard already uses, not a new estimate). Standard future-value-of-
// an-ordinary-annuity math: today's value compounds for the remaining
// years, and each future year's assumed contribution compounds for the
// years remaining after it lands.
//
// Returns null when there isn't enough to project from (already at/past
// retirement, no value, or under 6 months of history — too little to infer
// a stable contribution rate from).
export function projectCorpus(pf: Portfolio, yearsToRetirement: number): CorpusProjection | null {
  if (yearsToRetirement <= 0) return null
  if (!isFinite(pf.totalValue) || pf.totalValue <= 0) return null
  if (pf.inceptionYears == null || pf.inceptionYears < 0.5) return null

  const annualContribution = pf.totalCost / pf.inceptionYears
  if (!isFinite(annualContribution) || annualContribution <= 0) return null

  const historicalRate = pf.allTimeReturn ?? pf.portCagr ?? null
  const expectedRate = historicalRate != null ? Math.max(MIN_EXPECTED_RATE, Math.min(MAX_EXPECTED_RATE, historicalRate)) : CONSERVATIVE_RATE + 0.03
  // conservative must never exceed expected — if a portfolio's own rate is
  // already below the conservative floor, both scenarios use that same
  // (lower) rate rather than showing a "conservative" figure that's higher.
  const conservativeRate = Math.min(CONSERVATIVE_RATE, expectedRate)

  const futureValue = (rate: number) => {
    const growth = Math.pow(1 + rate, yearsToRetirement)
    const fromTodaysValue = pf.totalValue * growth
    const fromFutureContributions = rate > 0 ? annualContribution * ((growth - 1) / rate) : annualContribution * yearsToRetirement
    return fromTodaysValue + fromFutureContributions
  }

  return {
    years: yearsToRetirement,
    annualContribution,
    conservativeRate,
    expectedRate,
    conservativeFV: futureValue(conservativeRate),
    expectedFV: futureValue(expectedRate),
  }
}
