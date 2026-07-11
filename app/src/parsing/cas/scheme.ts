import type { Scheme } from '../../engine/types'

// Fund-house banner, e.g. "Canara Robeco Mutual Fund" (no digits, so it can't
// match a portfolio-summary row).
export const RE_HOUSE = /^([A-Za-z][A-Za-z .&'()-]+?Mutual Fund)\s*$/
export const RE_FOLIO = /Folio No[:\s]+([0-9A-Za-z/ -]+?)(?:\s{2,}|\s+PAN|\s*$)/i
// Scheme header: a scheme-code prefix (e.g. P8004-, FTI780-, PP001ZG-) before the name.
export const RE_SCHEME = /^([A-Z0-9]{3,9})-([A-Za-z(].*)$/
// Indian MF ISINs all start INF.
export const RE_ISINTOK = /\b(INF[A-Z0-9]{9})\b/

// Some KFintech-registrar layouts wrap the scheme-header row so tightly against
// the adjacent "Registrar : KFINTECH/CAMS" box that the ISIN itself gets torn
// mid-character across two rows (not just moved as a whole token, which the
// _awaitISIN lookahead in parseStatement already handles) — e.g.
// "...ISIN: INF109K01" / "V83(Advisor: DIRECT)", or with unrelated text
// interleaved on the same row: "...ISIN: INF109K Registrar : CAMS" /
// "016E5(Advisor: DIRECT)". The row-grouping is inconsistent about where
// "Registrar : ..." lands — sometimes it trails the partial ISIN on the same
// row, sometimes it's squeezed onto its own row between the partial ISIN and
// its continuation — so look ahead a couple of lines rather than assuming the
// very next one. Any INF-prefixed run shorter than the required 9 trailing
// chars is unambiguously a truncated ISIN (nothing else in a CAS starts with
// "INF").
export function stitchSplitIsins(lines: string[]): string[] {
  const out = lines.slice()
  for (let i = 0; i < out.length - 1; i++) {
    const m = /\bINF([A-Z0-9]{1,8})\b/.exec(out[i])
    if (!m) continue
    const need = 9 - m[1].length
    for (let j = i + 1; j < Math.min(i + 3, out.length); j++) {
      const tail = /^[A-Z0-9]+/.exec(out[j])
      if (!tail || tail[0].length < need) continue
      const full = 'INF' + m[1] + tail[0].slice(0, need)
      out[i] = out[i].slice(0, m.index) + full + out[i].slice(m.index + m[0].length)
      out[j] = out[j].slice(need)
      break
    }
  }
  return out.filter(Boolean)
}

export function cleanSchemeName(raw: string): string {
  let s = String(raw).split(/\s*-\s*ISIN/i)[0] // drop trailing "- ISIN: ..."
  s = s.replace(/^[A-Z0-9]{3,9}-/, '') // drop leading scheme code
  s = s
    .replace(/\(Non-?Demat\)/gi, '')
    .replace(/\bRegistrar\s*:.*$/i, '') // drop trailing "Registrar : CAMS"
    .replace(/\s{2,}/g, ' ')
    .trim()
  s = s.replace(/[-–\s]+$/, '').trim()
  return s
}

// Parser-internal draft: carries the "still waiting for a wrapped ISIN /
// stamp-duty amount on a following line" flags that parseStatement mutates
// as it scans. Structurally assignable to Scheme once parsing is done.
export interface SchemeDraft extends Scheme {
  _awaitISIN: boolean
  _awaitStamp: boolean
}

export function newScheme(house: string, name: string): SchemeDraft {
  return {
    house,
    name,
    isin: '',
    folio: '',
    txns: [],
    nav: NaN,
    navDate: null,
    marketValue: NaN,
    closingUnits: NaN,
    costValue: NaN,
    _awaitISIN: true,
    _awaitStamp: false,
  }
}
