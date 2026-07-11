// Number parsing ported from reference/engine.js. Handles Indian
// comma-grouped numbers and parenthesised negatives (accounting notation),
// e.g. "(1,234.56)" -> -1234.56. Returns NaN for anything unparseable —
// callers use isFinite() to detect a miss, matching the original engine.
export function parseNum(s: unknown): number {
  if (s == null) return NaN
  let t = String(s).trim()
  let neg = false
  if (/^\(.*\)$/.test(t)) {
    neg = true
    t = t.slice(1, -1)
  }
  t = t.replace(/,/g, '').replace(/[^0-9.-]/g, '')
  const n = parseFloat(t)
  if (isNaN(n)) return NaN
  return neg ? -n : n
}
