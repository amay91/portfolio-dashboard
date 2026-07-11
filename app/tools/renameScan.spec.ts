import { describe, it } from 'vitest'
import { fetchAmfi, parseAmfi } from '../src/marketdata/sources/amfi'
import { canonCore } from '../src/engine/harmonise'
import { NAME_ALIAS_GROUPS } from '../src/reference/aliases'

// Testing-plan item #3: a *proactive* renames registry check, instead of
// only ever adding an alias after a real statement's old name fails to
// match (reactive — see every entry in aliases.ts). AMCs/AMFI mark a
// renamed-but-continuing scheme by embedding the old name directly in the
// current listing, e.g. the real scheme "ICICI Prudential Value Fund
// (erstwhile Value Discovery Fund)" found during the 100-fund coverage
// sweep (2026-07-11) — that parenthetical is AMFI's own authoritative
// rename record. Scanning the live scheme list for "erstwhile" surfaces
// every industry-wide rename AMFI currently knows about, so a gap in
// aliases.ts can be caught *before* a user's statement (carrying the old
// name, often with no ISIN either) ever hits it.
//
// Real network (fetches the live AMFI file) — gated behind RUN_NETWORK_TOOLS
// so a bare `npm test`/CI run (which matches every tools/*.spec.ts by
// default — there's no vitest exclude for this directory) never makes a
// real network call; see docs/TESTING.md "no real network in the suite".
// Run manually:
//   RUN_NETWORK_TOOLS=1 npx vitest run tools/renameScan.spec.ts --reporter=verbose
//
describe('rename scan (manual, real network)', () => {
  it(
    'finds every AMFI-flagged "(erstwhile ...)" rename and reports which ones aliases.ts does not yet cover',
    async () => {
      if (!process.env.RUN_NETWORK_TOOLS) {
        console.log('\nSet RUN_NETWORK_TOOLS=1 to run the rename scan (real network). Skipping.\n')
        return
      }
      const txt = await fetchAmfi()
      if (!txt) {
        console.log('\nAMFI unreachable from this environment right now — nothing to scan. Skipping.\n')
        return
      }
      const { rows } = parseAmfi(txt)

      const seen = new Set<string>()
      const renames: { current: string; erstwhile: string }[] = []
      const erstwhileRe = /^(.*?)\s*\(erstwhile\s+(.+?)\)\s*$/i
      for (const r of rows) {
        const m = erstwhileRe.exec(r.name || '')
        if (!m) continue
        const current = m[1].trim()
        const erstwhile = m[2].trim()
        const key = canonCore(current) + '|' + canonCore(erstwhile)
        if (seen.has(key)) continue
        seen.add(key)
        renames.push({ current, erstwhile })
      }

      console.log(`\nScanned ${rows.length} AMFI scheme rows, found ${renames.length} distinct "(erstwhile ...)" rename(s).\n`)

      const aliasCores = NAME_ALIAS_GROUPS.map((group) => new Set(group.map((n) => canonCore(n))))
      const covered: typeof renames = []
      const uncovered: typeof renames = []
      for (const r of renames) {
        const curCore = canonCore(r.current)
        const oldCore = canonCore(r.erstwhile)
        const isCovered = aliasCores.some((g) => g.has(curCore) && g.has(oldCore))
        ;(isCovered ? covered : uncovered).push(r)
      }

      console.log(`${covered.length} already covered by aliases.ts.`)
      if (uncovered.length) {
        console.log(`${uncovered.length} NOT yet covered — candidates to add to NAME_ALIAS_GROUPS:\n`)
        for (const r of uncovered) {
          const curTokens = new Set(canonCore(r.current).split(' '))
          const oldCore = canonCore(r.erstwhile)
          const sharesAmcToken = oldCore.split(' ').some((t) => curTokens.has(t))
          console.log(`  ['${canonCore(r.current)}', '${oldCore}'],  // ${r.current}  (erstwhile ${r.erstwhile})`)
          if (!sharesAmcToken) {
            // canonCore doesn't strip AMC/house name (see harmonise.ts coreTokens)
            // — a real statement's old scheme name always carries it, but AMFI's
            // "(erstwhile ...)" annotation is written relative to the current
            // name and sometimes omits it (e.g. just "Cash Option"). Aliasing the
            // bare fragment as printed would be a global, AMC-unscoped match —
            // review and prefix the AMC name before adding this one.
            console.log(`    ^ CAUTION: "${r.erstwhile}" shares no token with the current name — likely missing an implied AMC prefix. Verify and qualify before adding.`)
          }
        }
      } else {
        console.log('All AMFI-flagged renames are already covered.')
      }
    },
    60000,
  )
})
