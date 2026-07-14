import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseStatement } from '../parsing/cas/parse'
import { FUND_META } from './fundMeta'

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../tests/fixtures')
const readFixture = (name: string) => readFileSync(path.join(fixturesDir, name), 'utf8')

function uncoveredCount(file: string): number {
  const schemes = parseStatement(readFixture(file))
  return schemes.filter((s) => s.isin && !FUND_META[s.isin]).length
}

// analyzeScheme() falls back from the hand-curated FUND_META table to
// inferMeta()'s keyword heuristics whenever an ISIN isn't in the table
// (engine/scheme.ts: `FUND_META[s.isin] || inferMeta(s.name)`). inferMeta is
// a reasonable fallback, but it's a *silent* one — nobody is told a fund's
// allocation/benchmark/expense/risk figures are now guessed from its name
// instead of curated from its factsheet. Review item E2: this test exists so
// that silence becomes visible instead of an invisible, accumulating gap.
//
// Baselined against today's real-statement fixtures, not asserted at zero —
// vandana_kfintech.txt's real-world 29-fund statement was never fully
// curated into FUND_META (18 entries total across all fixtures) and that's
// a known, accepted gap, not a regression. If this test fails because a
// count went UP, something new needs metadata (or the increase is
// deliberate and this baseline should move with it, in the same commit that
// caused it). If a count goes DOWN, someone added coverage — update the
// baseline down to lock the improvement in.
//
// coverage_sample.txt / coverage_sample_no_isin.txt are deliberately
// excluded: that fixture exists specifically to stress-test live-NAV
// name/ISIN *matching* across a 100-fund universe (docs/DECISIONS.md
// "100-fund coverage sweep"), not FUND_META metadata curation — it was
// never meant to be curated and including it here would swamp a real
// regression in expected noise. axis.txt is excluded because it carries no
// ISINs at all, so it always falls to inferMeta regardless of FUND_META's
// coverage — not a signal of anything.
describe('FUND_META coverage — staleness canary (review item E2)', () => {
  const expected: Record<string, number> = {
    'sample.txt': 0,
    'alok_2025.txt': 0,
    'alok_2026.txt': 0,
    'markitdown_cas.md': 0,
    'vandana_kfintech.txt': 23,
  }

  for (const [file, expectedUncovered] of Object.entries(expected)) {
    it(`${file}: ${expectedUncovered} scheme(s) fall through to inferMeta()`, () => {
      expect(uncoveredCount(file)).toBe(expectedUncovered)
    })
  }
})
