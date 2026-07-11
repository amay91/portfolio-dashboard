import { yearsBetween } from './dates'

export interface CashFlow {
  date: Date
  amount: number // outflows negative, inflows positive
}

// Money-weighted return over dated cash flows. Bisection first (robust,
// bracket-guaranteed when the sign of NPV differs at the bounds), falling
// back to Newton's method when it doesn't (e.g. all-positive or all-negative
// flow patterns that don't bracket a root within [-99.99%, 10000%]).
export function xirr(flows: CashFlow[]): number | null {
  const cf = flows
    .filter((f) => f.amount !== 0)
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime())
  if (cf.length < 2) return null
  const t0 = cf[0].date
  const npv = (r: number) => cf.reduce((s, f) => s + f.amount / Math.pow(1 + r, yearsBetween(t0, f.date)), 0)

  let lo = -0.9999
  let hi = 100
  let fLo = npv(lo)
  const fHi = npv(hi)
  if (isNaN(fLo) || isNaN(fHi) || fLo * fHi > 0) {
    // Newton fallback
    let r = 0.1
    for (let i = 0; i < 80; i++) {
      const f = npv(r)
      const d = (npv(r + 1e-5) - f) / 1e-5
      if (!isFinite(d) || d === 0) break
      const nr = r - f / d
      if (!isFinite(nr)) break
      if (Math.abs(nr - r) < 1e-7) return nr
      r = nr < -0.9999 ? -0.99 : nr
    }
    return null
  }

  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2
    const fMid = npv(mid)
    if (Math.abs(fMid) < 1e-4) return mid
    if (fLo * fMid < 0) {
      hi = mid
    } else {
      lo = mid
      fLo = fMid
    }
  }
  return (lo + hi) / 2
}
