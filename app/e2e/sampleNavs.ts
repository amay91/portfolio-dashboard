import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Reads the real ISIN -> statement-NAV map straight out of public/sample.txt
// (the same file the app's "Load Sample Statement" button fetches), instead
// of hardcoding NAV figures here that would silently drift out of sync if
// the sample statement is ever edited. Used to build plausible mock live-NAV
// responses (navPlausible requires within 1/3x-3x of the statement NAV — see
// engine/harmonise.ts) so the e2e happy-path test gets a real "live NAV
// matched" outcome rather than a coincidental pass/fail.
const SAMPLE_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sample.txt')

export function loadSampleStatementNavs(): Record<string, number> {
  const text = readFileSync(SAMPLE_PATH, 'utf8')
  const lines = text.split('\n')
  const out: Record<string, number> = {}
  let pendingIsin: string | null = null
  for (const line of lines) {
    const isinMatch = /ISIN:\s*([A-Z0-9]+)/.exec(line)
    if (isinMatch) pendingIsin = isinMatch[1]
    const navMatch = /NAV on .*?:\s*INR\s*([\d.,]+)/.exec(line)
    if (navMatch && pendingIsin) {
      out[pendingIsin] = parseFloat(navMatch[1].replace(/,/g, ''))
      pendingIsin = null
    }
  }
  return out
}
