import { parseDate } from '../../engine/dates'
import { canonCore, isin0, liveKey, planKey } from '../../engine/harmonise'
import type { LiveMatch, LiveRow } from '../../engine/harmonise'
import { fetchText } from '../http'

export const AMFI_URL = 'https://www.amfiindia.com/spages/NAVAll.txt'

// Rejects truncated/garbage responses by requiring the file to look like the
// real ISIN-keyed AMFI dump, not an error page or a partial fetch.
export function looksLikeAmfi(txt: string | null | undefined): boolean {
  return !!(txt && txt.length > 50000 && /ISIN/i.test(txt) && txt.indexOf(';') > 0 && /INF[A-Z0-9]{9}/.test(txt))
}

// Fetches the AMFI NAVAll.txt directly. AMFI serves no CORS headers, so in a
// browser this only succeeds once N2's cached edge function fronts it (see
// tasks.md N2/N3); the public CORS-proxy race was removed in N1 as a
// production liability. captnemo/mfapi (CORS-native) cover held ISINs
// meanwhile. In Node (tests, edge function) the direct fetch works.
export async function fetchAmfi(): Promise<string | null> {
  const txt = await fetchText(AMFI_URL, 13000)
  return looksLikeAmfi(txt) ? (txt as string) : null
}

export interface AmfiMap {
  byIsin: Record<string, LiveMatch>
  byName: Record<string, LiveMatch>
  rows: LiveRow[]
}

// Parses AMFI's semicolon-delimited NAVAll.txt. Parsed **from the right**
// (date/nav last) so a scheme name containing ';' can't shift columns; scans
// **every** ISIN token on the row (growth/idcw columns vary) and indexes
// each under both the raw spelling and an O->0 folded form. See
// docs/DECISIONS.md "AMFI parsing robustness".
export function parseAmfi(txt: string): AmfiMap {
  const byIsin: Record<string, LiveMatch> = {}
  const byName: Record<string, LiveMatch> = {}
  const rows: LiveRow[] = []
  for (const line of txt.split(/\r?\n/)) {
    if (line.indexOf(';') < 0) continue
    const p = line.split(';').map((x) => x.trim())
    if (p.length < 5) continue
    if (!/^\d+$/.test(p[0])) continue // skip section headers
    const date = parseDate(p[p.length - 1])
    const nav = parseFloat(p[p.length - 2])
    if (!isFinite(nav) || nav <= 0) continue // skips "N.A." rows
    const name = p
      .slice(3, p.length - 2)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    const rec: LiveMatch = { nav, date, source: 'AMFI', name }
    const isins = line.match(/INF[A-Z0-9]{9}/g)
    if (isins) {
      for (const is of isins) {
        byIsin[is] = rec
        const z = isin0(is)
        if (z && z !== is && !byIsin[z]) byIsin[z] = rec
      }
    }
    if (name) {
      const k = liveKey(name)
      if (k && !byName[k]) byName[k] = rec
      rows.push({ core: canonCore(name), plan: planKey(name), nav, date, source: 'AMFI', name })
    }
  }
  return { byIsin, byName, rows }
}
