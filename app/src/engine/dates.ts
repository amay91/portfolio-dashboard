// Date helpers ported from reference/engine.js. Statement dates are always
// dd-Mon-yyyy (e.g. "05-Jun-2024"); parseDate returns null for anything else
// rather than throwing, since the parser probes many lines that aren't dates.
export const DAY_MS = 86400000

const MON: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

export function parseDate(s: string): Date | null {
  const m = /^(\d{2})-([A-Za-z]{3})-(\d{4})$/.exec(s.trim())
  if (!m) return null
  const mon = MON[m[2]]
  if (mon === undefined) return null
  return new Date(Date.UTC(+m[3], mon, +m[1]))
}

export function yearsBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / (365.25 * DAY_MS)
}
