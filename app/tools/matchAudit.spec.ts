import { readFileSync } from 'node:fs'
import { describe, it } from 'vitest'
import { parseStatement } from '../src/parsing/cas/parse'
import { resolveLiveNavs } from '../src/marketdata/resolve'
import { isin0, liveKey, navPlausible } from '../src/engine/harmonise'

// Testing-plan item #2: a standalone match-audit tool. Paste any CAS
// statement in and get a per-fund report of which tier (if any) resolved a
// live NAV for it — the fast way to answer "why didn't fund X update" for a
// newly uploaded statement, without wiring up the whole dashboard.
//
// Makes real network calls (see docs/TESTING.md: "no real network in the
// suite") only when explicitly asked to — with MATCH_AUDIT_FILE unset it
// logs a hint and returns immediately, so it's harmless (and fast) if it
// ever runs as part of `npm test`/CI. Actual use is manual, on demand:
//
//   MATCH_AUDIT_FILE=tests/fixtures/coverage_sample_no_isin.txt npx vitest run tools/matchAudit.spec.ts --reporter=verbose
//
describe('match audit (manual, real network)', () => {
  it(
    'reports per-fund live-match status for a real statement',
    async () => {
      const path = process.env.MATCH_AUDIT_FILE
      if (!path) {
        console.log('\nSet MATCH_AUDIT_FILE=<path to a CAS statement .txt> to run the audit. Skipping.\n')
        return
      }
      const text = readFileSync(path, 'utf8')
      const schemes = parseStatement(text)
      const held = schemes.filter((s) => (isFinite(s.closingUnits) ? s.closingUnits > 0.0005 : false) || (isFinite(s.marketValue) && s.marketValue > 0))

      const { live, diag } = await resolveLiveNavs(held, true)

      console.log(`\nParsed ${schemes.length} scheme(s), ${held.length} held.`)
      console.log(`Sources reachable this run: AMFI=${diag.amfiOk} captnemo=${diag.captnemoUsed} mfapi.in=${diag.mfapiUsed}\n`)

      type Tier = 'AMFI (isin)' | 'mf.captnemo.in' | 'AMFI (name)' | 'mfapi.in (rescue)' | 'NO MATCH'
      const rows = held.map((s) => {
        const byIsin = s.isin && live ? live.byIsin?.[s.isin] || live.byIsin?.[isin0(s.isin) || ''] : undefined
        const byName = live?.byName?.[liveKey(s.name)]
        const match = byIsin || byName
        let tier: Tier = 'NO MATCH'
        if (match) {
          if (byIsin) tier = byIsin.source === 'mf.captnemo.in' ? 'mf.captnemo.in' : 'AMFI (isin)'
          else tier = match.source === 'mfapi.in' ? 'mfapi.in (rescue)' : 'AMFI (name)'
        }
        const plausible = match ? navPlausible(match.nav, s.nav) : false
        return {
          name: s.name,
          isin: s.isin || '(none)',
          tier: match && plausible ? tier : ('NO MATCH' as Tier),
          stmtNav: s.nav,
          liveNav: match?.nav ?? null,
          matchedName: match?.name ?? null,
        }
      })

      const misses = rows.filter((r) => r.tier === 'NO MATCH')
      for (const r of rows) {
        const status = r.tier === 'NO MATCH' ? '✗ MISS' : `✓ ${r.tier}`
        console.log(`${status.padEnd(22)} ${r.name}`)
        if (r.tier !== 'NO MATCH') console.log(`  stmt NAV ${r.stmtNav} -> live NAV ${r.liveNav} (matched: "${r.matchedName}")`)
        else if (r.liveNav != null) console.log(`  found a candidate (NAV ${r.liveNav}, "${r.matchedName}") but it failed the plausibility gate vs stmt NAV ${r.stmtNav}`)
      }

      console.log(`\n${rows.length - misses.length}/${rows.length} matched.`)
      if (misses.length) {
        console.log('\nMissed funds:')
        for (const m of misses) console.log(`  - ${m.name} (ISIN: ${m.isin})`)
      }
    },
    600000, // every gap fund goes through mfapi.in sequentially (see resolve.ts) — a large statement can take minutes
  )
})
