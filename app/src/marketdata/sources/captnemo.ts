import { isin0 } from '../../engine/harmonise'
import type { LiveMatch } from '../../engine/harmonise'
import { fetchJSON } from '../http'

interface CaptnemoResponse {
  ISIN?: string
  name?: string
  nav?: number | string
  date?: string
  error?: string
}

// mf.captnemo.in — CORS-native ISIN->NAV lookup (Access-Control-Allow-Origin:
// *, no logs), so it needs no proxy and is the most direct identity match we
// have for any scheme with an ISIN. It does NOT fold O<->0 itself (an
// O-spelled ISIN that AMFI zero-folds can 404 as "Invalid ISIN" on
// captnemo), so try both forms. See docs/DECISIONS.md "mf.captnemo.in added
// as a CORS-native ISIN primary".
export async function captnemoByIsin(isin: string): Promise<LiveMatch | null> {
  if (!isin) return null
  const cands = [isin]
  const z = isin0(isin)
  if (z && z !== isin) cands.push(z)
  for (const cand of cands) {
    const d = await fetchJSON<CaptnemoResponse>('https://mf.captnemo.in/nav/' + encodeURIComponent(cand), 9000)
    const nav = d && parseFloat(String(d.nav))
    if (d && !d.error && isFinite(nav as number) && (nav as number) > 0) {
      const dm = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d.date || ''))
      const date = dm ? new Date(Date.UTC(+dm[1], +dm[2] - 1, +dm[3])) : null
      return { nav: nav as number, date, source: 'mf.captnemo.in', name: d.name || null }
    }
  }
  return null
}
