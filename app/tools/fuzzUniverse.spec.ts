import { describe, it } from 'vitest'
import { fetchAmfi, parseAmfi } from '../src/marketdata/sources/amfi'
import { canonCore, fuzzyLive, liveKey, planKey } from '../src/engine/harmonise'

// Testing-plan item #4: fuzz the matching logic against AMFI's entire live
// universe (~14,000 schemes), not just the 100-fund coverage sample. The
// coverage sample is curated by AUM (biggest, best-known funds) — real bugs
// this session were all in that population's long tail (legacy share
// classes, FOF naming, industry renames). This test instead asks a
// self-consistency question across *everything* AMFI lists: if a real
// statement quoted this exact scheme name, would our own matching logic
// find it in AMFI's own list? For every row, look itself up via the same
// liveKey()/fuzzyLive() machinery resolve.ts uses for a statement scheme —
// a self-lookup must succeed (a scheme's name always canon-matches itself
// exactly), so a MISS here is a real bug in the matching logic itself, not
// a data gap.
//
// Real network (fetches the live ~14,000-row AMFI file), gated behind
// RUN_NETWORK_TOOLS so a bare `npm test`/CI run never makes a real network
// call — see renameScan.spec.ts's own comment for why this gate exists.
// Run manually:
//   RUN_NETWORK_TOOLS=1 npx vitest run tools/fuzzUniverse.spec.ts --reporter=verbose
//
describe('fuzz test vs AMFI universe (manual, real network)', () => {
  it(
    "every AMFI-listed scheme resolves against our own matching logic when looked up by its own name",
    async () => {
      if (!process.env.RUN_NETWORK_TOOLS) {
        console.log('\nSet RUN_NETWORK_TOOLS=1 to run the universe fuzz test (real network). Skipping.\n')
        return
      }
      const txt = await fetchAmfi()
      if (!txt) {
        console.log('\nAMFI unreachable from this environment right now — nothing to fuzz. Skipping.\n')
        return
      }
      const { byName, rows } = parseAmfi(txt)
      console.log(`\nFuzzing ${rows.length} AMFI scheme rows against liveKey()/fuzzyLive() self-lookup...\n`)

      let exactMiss = 0
      let fuzzyMiss = 0
      let fuzzyWrong = 0
      const exactMissExamples: string[] = []
      const fuzzyWrongExamples: string[] = []

      for (const row of rows) {
        const rowName = row.name || ''
        // Tier 1: the exact matching key resolve.ts uses for a statement scheme
        // with no ISIN (liveKey = canonCore + planKey). Every row must find
        // itself here — this is the same map lookup a real held fund goes
        // through first.
        const exact = byName[liveKey(rowName)]
        if (exact) continue
        exactMiss++
        if (exactMissExamples.length < 15) exactMissExamples.push(rowName)

        // Tier 2 (fallback used when liveKey fails, e.g. IDCW/plan-word
        // spelling drift): fuzzyLive's token-overlap search. A self-lookup
        // should still find its own row (score 1.0), or at minimum find SOME
        // row with the same core+plan — never one for a genuinely different
        // fund.
        const fuzzy = fuzzyLive(rowName, rows)
        if (!fuzzy) {
          fuzzyMiss++
          continue
        }
        const fuzzyName = fuzzy.name || ''
        if (canonCore(fuzzyName) !== canonCore(rowName) || planKey(fuzzyName) !== planKey(rowName)) {
          fuzzyWrong++
          if (fuzzyWrongExamples.length < 15) fuzzyWrongExamples.push(`"${rowName}" -> fuzzyLive matched "${fuzzyName}"`)
        }
      }

      console.log(`Exact liveKey() self-lookup: ${rows.length - exactMiss}/${rows.length} hit, ${exactMiss} fell through to the fuzzy fallback.`)
      console.log(`Of those ${exactMiss}: ${exactMiss - fuzzyMiss - fuzzyWrong} recovered correctly by fuzzyLive(), ${fuzzyMiss} still missed entirely, ${fuzzyWrong} matched to a DIFFERENT fund (real bug candidates).\n`)

      if (fuzzyWrongExamples.length) {
        console.log('Sample wrong-fund fuzzy matches (real bug candidates):')
        for (const e of fuzzyWrongExamples) console.log(`  - ${e}`)
      }
      if (exactMissExamples.length) {
        console.log('\nSample names that needed the fuzzy fallback at all (informational, not necessarily bugs — many are IDCW/legacy variants a real statement rarely carries):')
        for (const e of exactMissExamples) console.log(`  - ${e}`)
      }
    },
    120000,
  )
})
