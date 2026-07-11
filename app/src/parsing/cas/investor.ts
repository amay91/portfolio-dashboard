import { normalizeInput } from '../normalize'
import { RE_FOLIO } from './scheme'

// A plausible human name: 2-4 space-separated words, each starting with a
// letter (letters/periods only, e.g. an initial like "V"). Rejects anything
// with digits, colons or long sentences (boilerplate), without needing a
// denylist.
const NAME_LINE = /^[A-Za-z][A-Za-z.]*(?:\s+[A-Za-z][A-Za-z.]*){1,3}$/
// The two-column PDF layout interleaves the account-holder's name into this
// boilerplate sentence — sometimes prefixed onto the same line.
const HEADER_HOOK = /^(.*?)\bbalances and valuation of Mutual Funds?\b/i

function titleCase(name: string): string {
  return name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase())
}

// Extracts the account-holder's name from a CAS statement's free-text header
// / per-folio blocks, for the dashboard masthead ("«name»'s Portfolio"). CAS
// statements interleave the name unpredictably depending on registrar and
// PDF text extractor, so this tries two independent, pattern-anchored
// heuristics rather than a fixed line offset:
//  1. The line immediately after each "Folio No: ... KYC: ..." row is almost
//     always the account-holder's name (CAMS-registrar folios repeat it once
//     per folio) — majority vote across every folio in the statement.
//  2. A pure-KFintech statement has no such per-folio line; the name is
//     instead interleaved into the boilerplate sentence "<name> balances and
//     valuation of Mutual Funds..." by the two-column PDF layout.
// Returns null (masthead falls back to "Your Portfolio") if neither pattern
// is found — e.g. a fragment that starts mid-statement.
export function extractInvestorName(text: string): string | null {
  const lines = normalizeInput(text)
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const counts = new Map<string, number>()
  const bump = (raw: string) => {
    const key = raw.toLowerCase()
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  for (let i = 0; i < lines.length - 1; i++) {
    if (RE_FOLIO.test(lines[i]) && NAME_LINE.test(lines[i + 1])) bump(lines[i + 1])
  }
  if (!counts.size) {
    for (const line of lines) {
      const m = HEADER_HOOK.exec(line)
      const candidate = m?.[1].trim()
      if (candidate && NAME_LINE.test(candidate)) bump(candidate)
    }
  }
  if (!counts.size) return null

  let best = ''
  let bestCount = 0
  for (const [name, count] of counts) {
    if (count > bestCount) {
      best = name
      bestCount = count
    }
  }
  return titleCase(best)
}
