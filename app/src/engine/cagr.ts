import { yearsBetween } from './dates'

export interface WeightedBuy {
  date: Date
  amount: number
}

// Weighted-average-holding-period CAGR: treats the *current* cost basis as if
// invested at the amount-weighted mean purchase date, then compounded to the
// valuation value. `costOverride` (the statement's Total Cost Value /
// remaining basis) keeps partially-redeemed funds honest — without it, gross
// historical purchases would dwarf the surviving value and read as a
// phantom loss. See docs/DECISIONS.md "CAGR uses remaining cost basis".
export function weightedCAGR(
  buys: WeightedBuy[],
  endValue: number,
  endDate: Date,
  costOverride?: number | null,
): number | null {
  const grossCost = buys.reduce((s, b) => s + b.amount, 0)
  if (grossCost <= 0 || endValue <= 0) return null
  const cost = costOverride != null && costOverride > 0 ? costOverride : grossCost
  const wEpoch = buys.reduce((s, b) => s + b.amount * b.date.getTime(), 0) / grossCost
  const yrs = yearsBetween(new Date(wEpoch), endDate)
  if (yrs <= 0) return null
  return Math.pow(endValue / cost, 1 / yrs) - 1
}
