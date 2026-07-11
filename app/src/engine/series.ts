import type { LiveMatch } from './harmonise'
import type { Scheme, Series } from './types'

const YEAR = 365.25 * 86400000

interface PricePoint {
  d: number
  p: number
}
interface UnitDelta {
  d: number
  u: number
}
interface Flow {
  d: number
  a: number
}
interface FundSeries {
  points: PricePoint[]
  deltas: UnitDelta[]
  flows: Flow[]
}

// Portfolio time series for the charts gallery. We don't have daily NAV
// history, but we DO know each fund's price on every date it transacted,
// plus its current NAV. Interpolating price between those points and
// tracking units held reconstructs a grounded value-over-time curve whose
// endpoint ties out exactly to today's market value. Contributions come
// from the dated cash flows (switches net out at portfolio level). Period
// returns use Modified Dietz (money-weighted, cash-flow-timing aware); a
// chained sub-period TWR index drives the drawdown. Ported from
// reference/engine.js buildPortfolioSeries.
export function buildPortfolioSeries(
  schemes: Scheme[],
  liveFor: (s: Scheme) => LiveMatch | null,
  valDate: Date,
): Series | null {
  const F: FundSeries[] = schemes.map((s) => {
    const txns = (s.txns || []).slice().sort((a, b) => a.date.getTime() - b.date.getTime())
    const points: PricePoint[] = txns.filter((t) => isFinite(t.price) && t.price > 0).map((t) => ({ d: +t.date, p: t.price }))
    const deltas: UnitDelta[] = txns.map((t) => ({ d: +t.date, u: t.units }))
    const flows: Flow[] = txns.map((t) => ({ d: +t.date, a: t.units > 0 ? t.amount + (t.stamp || 0) : -Math.abs(t.amount) }))
    const live = liveFor(s)
    let nav = s.nav
    if (live && isFinite(live.nav)) {
      const rr = s.nav > 0 ? live.nav / s.nav : 1
      nav = s.nav > 0 && (rr < 1 / 3 || rr > 3) ? s.nav : live.nav
    }
    if (isFinite(nav) && nav > 0) points.push({ d: +valDate, p: nav })
    points.sort((a, b) => a.d - b.d)
    // Anchor units to the statement's closing balance: any gap (an opening
    // balance carried in before the tracked window) is added at the fund's
    // first date so the reconstructed value ties out exactly to the
    // closing market value.
    const summed = deltas.reduce((a, d) => a + d.u, 0)
    if (isFinite(s.closingUnits)) {
      const open = s.closingUnits - summed
      if (Math.abs(open) > 1e-6) {
        const d0 = deltas.length ? Math.min(...deltas.map((d) => d.d)) : points.length ? points[0].d : +valDate
        deltas.unshift({ d: d0, u: open })
      }
    }
    return { points, deltas, flows }
  })

  const priceAt = (pts: PricePoint[], t: number): number => {
    const n = pts.length
    if (!n) return NaN
    if (t <= pts[0].d) return pts[0].p
    if (t >= pts[n - 1].d) return pts[n - 1].p
    for (let i = 1; i < n; i++) {
      if (t <= pts[i].d) {
        const a = pts[i - 1]
        const b = pts[i]
        return a.p + (b.p - a.p) * ((t - a.d) / (b.d - a.d || 1))
      }
    }
    return pts[n - 1].p
  }
  const unitsAt = (dl: UnitDelta[], t: number): number => {
    let u = 0
    for (const d of dl) if (d.d <= t) u += d.u
    return u
  }
  const valueAt = (t: number): number => {
    let v = 0
    for (const f of F) {
      const u = unitsAt(f.deltas, t)
      if (Math.abs(u) > 1e-9) {
        const p = priceAt(f.points, t)
        if (isFinite(p)) v += u * p
      }
    }
    return v
  }
  const investedAt = (t: number): number => {
    let s = 0
    for (const f of F) for (const fl of f.flows) if (fl.d <= t) s += fl.a
    return s
  }
  const dietz = (ta: number, tb: number): number => {
    const v0 = valueAt(ta)
    const v1 = valueAt(tb)
    let Ff = 0
    let wF = 0
    const T = tb - ta || 1
    for (const f of F) for (const fl of f.flows) if (fl.d > ta && fl.d <= tb) {
      Ff += fl.a
      wF += fl.a * ((tb - fl.d) / T)
    }
    const den = v0 + wF
    return den > 1e-6 ? (v1 - v0 - Ff) / den : NaN
  }

  const all: Flow[] = []
  F.forEach((f) => f.flows.forEach((fl) => all.push(fl)))
  all.sort((a, b) => a.d - b.d)
  if (!all.length) return null
  const inception = all[0].d
  const end = +valDate
  if (end <= inception) return null

  // monthly sample grid (plus exact inception + valuation endpoints)
  const set = new Set<number>([inception, end])
  const c = new Date(inception)
  c.setDate(1)
  c.setMonth(c.getMonth() + 1)
  while (+c < end) {
    set.add(+c)
    c.setMonth(c.getMonth() + 1)
  }
  const T = [...set].sort((a, b) => a - b)
  const decYear = (t: number): number => {
    const y = new Date(t).getFullYear()
    return y + (t - +new Date(y, 0, 1)) / YEAR
  }

  const line = T.map((t) => ({ year: decYear(t), ts: t, invested: investedAt(t), value: valueAt(t) }))

  // chained sub-period TWR index -> drawdown
  const dd: { t: number; dd: number }[] = [{ t: 0, dd: 0 }]
  let idx = 1
  let peak = 1
  for (let i = 1; i < T.length; i++) {
    const r = dietz(T[i - 1], T[i])
    idx *= 1 + (isFinite(r) ? r : 0)
    peak = Math.max(peak, idx)
    dd.push({ t: (T[i] - inception) / YEAR, dd: idx / peak - 1 })
  }

  // rolling 1Y (monthly); expanding since-inception until a full year exists
  const rolling: { t: number; ts: number; ret: number; expanding: boolean }[] = []
  for (const t of T) {
    if (t === inception) continue
    const span = (t - inception) / YEAR
    if (t - inception < YEAR) {
      const r = dietz(inception, t)
      if (isFinite(r)) rolling.push({ t: span, ts: t, ret: r, expanding: true })
    } else {
      const r = dietz(t - YEAR, t)
      if (isFinite(r)) rolling.push({ t: span, ts: t, ret: r, expanding: false })
    }
  }

  // calendar-year returns (Modified Dietz per year)
  const y0 = new Date(inception).getFullYear()
  const y1 = new Date(end).getFullYear()
  const annual: { year: number; ret: number | null; partial: boolean }[] = []
  for (let Y = y0; Y <= y1; Y++) {
    const ps = Y === y0 ? inception : +new Date(Y, 0, 1)
    const pe = Y === y1 ? end : +new Date(Y, 11, 31, 23, 59, 59)
    const v0 = Y === y0 ? 0 : valueAt(ps)
    const v1 = valueAt(pe)
    let Ff = 0
    let wF = 0
    const span = pe - ps || 1
    for (const f of F) for (const fl of f.flows) if (fl.d > ps - 1 && fl.d <= pe) {
      Ff += fl.a
      wF += fl.a * ((pe - fl.d) / span)
    }
    const den = v0 + wF
    const r = den > 1e-6 ? (v1 - v0 - Ff) / den : NaN
    annual.push({ year: Y, ret: isFinite(r) ? r : null, partial: Y === y1 && new Date(end).getMonth() < 11 })
  }

  // net external capital flow per calendar year (switches net out)
  const byYear: Record<number, number> = {}
  for (const f of F) for (const fl of f.flows) {
    const Y = new Date(fl.d).getFullYear()
    byYear[Y] = (byYear[Y] || 0) + fl.a
  }
  const contrib = Object.keys(byYear)
    .sort()
    .map((Y) => ({ year: +Y, amount: byYear[+Y] }))

  return {
    inception: new Date(inception),
    valDate: new Date(end),
    inceptionYear: new Date(inception).getFullYear(),
    line,
    drawdown: dd,
    rolling,
    annual,
    contrib,
  }
}
