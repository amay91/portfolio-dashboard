import type { FundMeta } from './fundMeta'

// Approximate country-of-exposure for a fund. Uses an explicit `geo` map when
// the fund metadata carries one; otherwise domestic Indian equity/debt/cash
// map to India and any commodity/gold sleeve to a "Gold & Commodities"
// bucket. Fund names that signal overseas mandates are inferred. All figures
// are factsheet-level estimates (funds don't disclose country splits in the
// CAS). Normalised to sum to 1.
export function geoFor(meta: FundMeta | null | undefined, name: string): Record<string, number> {
  let g: Record<string, number>
  if (meta?.geo) {
    g = { ...meta.geo }
  } else {
    const n = String(name || '').toLowerCase()
    if (/\b(u\.?s\.?|nasdaq|s&p\s?500|america)\b/.test(n)) {
      g = { 'United States': 0.98, India: 0.02 }
    } else if (/greater china|china/.test(n)) {
      g = { China: 0.95, India: 0.05 }
    } else if (/global|international|world|developed markets|overseas|foreign/.test(n)) {
      g = { 'United States': 0.62, India: 0.08, 'Other International': 0.30 }
    } else if (/emerging market/.test(n)) {
      g = { 'Other International': 0.75, China: 0.15, India: 0.10 }
    } else {
      const a = meta?.alloc || { equity: 1, debt: 0, cash: 0, other: 0 }
      g = {}
      const india = (a.equity || 0) + (a.debt || 0) + (a.cash || 0)
      if (india > 0) g['India'] = india
      if ((a.other || 0) > 0) g['Gold & Commodities'] = a.other
    }
  }
  const s = Object.values(g).reduce((x, y) => x + y, 0)
  if (s <= 0) return { India: 1 }
  for (const k in g) g[k] /= s
  return g
}
