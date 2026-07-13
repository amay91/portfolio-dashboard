import { yearsBetween } from './dates'
import { MIN_HELD_UNITS } from './types'

// STCG/LTCG lot logic, extracted from the inline calc in reference/engine.js
// analyzeScheme. There's no per-lot FIFO tracking in the source statement's
// aggregate figures, so both unrealised and realised gains are apportioned
// proportionally by the surviving/sold fraction of units rather than tracked
// lot-by-lot.

export function ltcgMonths(taxClass: string): number {
  return taxClass === 'debt' ? 24 : 12
}

export interface Lot {
  date: Date
  units: number
  price: number
}

export interface UnrealisedGains {
  stcg: number
  ltcg: number
}

// Unrealised STCG/LTCG for the units still held. Each buy lot is scaled down
// proportionally by the surviving fraction of units when some were sold —
// see docs/DECISIONS.md "CAGR uses remaining cost basis" for the sibling
// rationale (this is the same remaining-basis idea applied to gains).
export function unrealisedGains(
  buys: Lot[],
  unitsBought: number,
  unitsHeld: number,
  nav: number,
  asOf: Date,
  thresholdMonths: number,
): UnrealisedGains {
  let stcg = 0
  let ltcg = 0
  if (unitsHeld > MIN_HELD_UNITS && isFinite(nav)) {
    const remainFrac = unitsBought > 0 ? Math.min(1, unitsHeld / unitsBought) : 1
    for (const b of buys) {
      const remUnits = b.units * remainFrac
      const gain = remUnits * (nav - b.price)
      const months = yearsBetween(b.date, asOf) * 12
      if (months > thresholdMonths) ltcg += gain
      else stcg += gain
    }
  }
  return { stcg, ltcg }
}

export interface SellFlow {
  date: Date
  amount: number
  units: number
}

export interface RealisedGains {
  realised: number
  realisedLT: number
  realisedST: number
}

// Realised gains from redemptions (whole-portfolio, not per-lot): if fully
// redeemed, cost = all invested; if partially redeemed, cost is scaled by
// the proportion of units sold. Classified LT/ST by the span from the first
// buy to the last sell (a simplification — a true per-lot FIFO holding
// period isn't recoverable from the statement's aggregate figures).
export function realisedGains(
  sells: SellFlow[],
  firstBuyDate: Date | null,
  unitsBought: number,
  investedTotal: number,
  thresholdMonths: number,
): RealisedGains {
  if (!sells.length) return { realised: 0, realisedLT: 0, realisedST: 0 }
  const proceeds = sells.reduce((a, b) => a + Math.abs(b.amount), 0)
  const soldUnits = Math.abs(sells.reduce((a, b) => a + b.units, 0))
  const soldFrac = unitsBought > 0 ? Math.min(1, soldUnits / unitsBought) : 1
  const soldCost = investedTotal * soldFrac
  const realised = proceeds - soldCost
  const firstBuy = firstBuyDate ?? sells[0].date
  const lastSell = sells[sells.length - 1].date
  const months = yearsBetween(firstBuy, lastSell) * 12
  if (months > thresholdMonths) return { realised, realisedLT: realised, realisedST: 0 }
  return { realised, realisedLT: 0, realisedST: realised }
}
