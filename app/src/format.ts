// Formatting helpers ported from the prototype's presentation layer
// (reference to portfolio-dashboard.html's inr/pct/fmtDate). Indian
// lakh/crore grouping, en-GB dates.

export function inr(n: number | null | undefined, dec?: number): string {
  const d = dec || 0
  if (n == null || !isFinite(n)) return '—'
  const neg = n < 0
  n = Math.abs(n)
  const [int, frac] = n.toFixed(d).split('.')
  const last3 = int.slice(-3)
  let rest = int.slice(0, -3)
  rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')
  const out = '₹' + (rest ? rest + ',' : '') + last3 + (frac ? '.' + frac : '')
  return (neg ? '-' : '') + out
}

export function pct(x: number, dec?: number, forceSign?: boolean): string {
  const d = dec == null ? 1 : dec
  const sign = x >= 0 ? (forceSign ? '+' : '') : '−'
  return sign + Math.abs(x).toFixed(d) + '%'
}

// A compact ₹ label for chart bar/axis annotations — crore/lakh/thousand
// abbreviated, one decimal place below 10 of the chosen unit and a whole
// number at or above it (the same rounding convention `inrUnit`'s callers
// already use for axis tick labels).
export function inrCompact(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return '—'
  const neg = n < 0
  const abs = Math.abs(n)
  const fmt = (v: number) => (v < 10 ? v.toFixed(1) : Math.round(v).toString())
  const out = abs >= 1e7 ? fmt(abs / 1e7) + 'Cr' : abs >= 1e5 ? fmt(abs / 1e5) + 'L' : abs >= 1e3 ? fmt(abs / 1e3) + 'K' : Math.round(abs).toString()
  return (neg ? '-' : '') + '₹' + out
}

// Strips the plan/option suffix and any parenthetical from a scheme name,
// e.g. "Kotak Small Cap Fund - Direct Growth (Non Demat)" -> "Kotak Small
// Cap Fund". This only shortens — every caller renders the result as JSX
// text, which React escapes on its own, so no separate sanitizing step is
// needed here (see escapeHtml()'s removal, review item C6).
export function shortName(n: string): string {
  return n
    .replace(/\s*-\s*(Direct|Regular)\b.*$/i, '')
    .replace(/\s*\(.*?\)\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

// The plan/option pair every scheme name encodes somewhere, harmonised into
// one of two canonical forms regardless of how the statement actually wrote
// it (e.g. "- Direct Growth", "- Direct Plan -Growth Option", or no plan
// mentioned at all, which statements default to Regular).
export interface SchemeNameParts {
  base: string
  plan: 'Direct' | 'Regular'
  option: 'Growth' | 'Dividend'
}

export function parseSchemeName(name: string): SchemeNameParts {
  // shortName() only strips a trailing option word when it follows a
  // Direct/Regular marker (the common case); a bare "- Growth" with no plan
  // mentioned at all needs its own strip so the base name is clean either way.
  const base = shortName(name).replace(/\s*-\s*(Growth|Dividend|IDCW|Payout|Reinvestment)\s*(Option)?\s*$/i, '')
  const n = String(name || '').toLowerCase()
  const plan = /\bdirect\b/.test(n) ? 'Direct' : 'Regular'
  const option = /\bidcw\b|\bdividend\b|\bpayout\b|\breinvestment\b/.test(n) ? 'Dividend' : 'Growth'
  return { base, plan, option }
}

// "[Scheme Name] - [Direct/Regular] Plan - [Growth/Dividend]" — the full,
// harmonised form, independent of how the original statement phrased it.
export function longSchemeName(name: string): string {
  const { base, plan, option } = parseSchemeName(name)
  return `${base} - ${plan} Plan - ${option}`
}

// "[Scheme Name] - Dir/Reg (G/D)" — same information as longSchemeName, in
// the compact form used where table columns are tight (e.g. the lean
// holdings view).
export function shortSchemeName(name: string): string {
  const { base, plan, option } = parseSchemeName(name)
  return `${base} - ${plan === 'Direct' ? 'Dir' : 'Reg'} (${option === 'Growth' ? 'G' : 'D'})`
}

export function fmtDate(d: Date | null | undefined): string {
  if (!d) return '—'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// First name only, for the masthead ("«name»'s Portfolio Summary") — the
// full name from the CAS header isn't shown in the UI for privacy.
export function firstName(name: string | null | undefined): string | null {
  if (!name) return null
  return name.trim().split(/\s+/)[0] || null
}
