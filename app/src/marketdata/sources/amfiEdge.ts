import { fetchJSON } from '../http'
import type { LiveMatch } from '../../engine/harmonise'

export interface AmfiEdgeRecord {
  nav: number
  date: string | null
  name: string | null
}

// Client side of the N2 edge function (app/src/server/amfiNav.ts) — the
// edge-fn-primary half of the N1 -> N2 -> N3 sequence (task N3). Only called
// when resolve.ts is given a configured URL (see App.tsx); returns null on
// any failure so the caller falls through to captnemo/mfapi exactly as it
// does today with no edge function deployed.
export async function fetchAmfiEdge(url: string): Promise<Record<string, LiveMatch> | null> {
  const raw = await fetchJSON<Record<string, AmfiEdgeRecord>>(url, 9000)
  if (!raw) return null
  const byIsin: Record<string, LiveMatch> = {}
  for (const [isin, rec] of Object.entries(raw)) {
    if (!rec || !isFinite(rec.nav) || rec.nav <= 0) continue
    byIsin[isin] = { nav: rec.nav, date: rec.date ? new Date(rec.date) : null, source: 'AMFI', name: rec.name }
  }
  return Object.keys(byIsin).length ? byIsin : null
}
