import { parseDate } from '../../engine/dates'
import { parseNum } from '../../engine/money'
import type { Scheme } from '../../engine/types'
import { normalizeInput } from '../normalize'
import { RE_CUB, RE_MV, RE_NAV, RE_TCV } from './fields'
import {
  RE_FOLIO,
  RE_HOUSE,
  RE_ISINTOK,
  RE_SCHEME,
  cleanSchemeName,
  newScheme,
  stitchSplitIsins,
} from './scheme'
import type { SchemeDraft } from './scheme'
import { RE_STAMP_HDR, parseStampAmount, parseStampLine, parseTxnLine } from './transactions'

// Position-independent parser, ported from reference/engine.js parseStatement.
// Built to survive both CAMS/KFintech layouts: one where NAV / Market Value /
// Closing Units / Cost Value sit on their own lines, and one where they're
// merged onto a single interleaved line. ISIN values can wrap onto the line
// after the "ISIN:" label, and a transaction row can be split by the PDF text
// extractor (date/amounts on one line, description on another). Every field
// is parsed independently rather than as a fixed pair — never by fixed
// column/line offsets.
export function parseStatement(text: string): Scheme[] {
  const lines = stitchSplitIsins(
    normalizeInput(text)
      .split(/\r?\n/)
      .map((l) => l.replace(/\s+/g, ' ').trim())
      .filter(Boolean),
  )

  const schemes: SchemeDraft[] = []
  let house = ''
  let cur: SchemeDraft | null = null

  for (const line of lines) {
    // Fund-house banner (no digits -> not the portfolio-summary row).
    const houseMatch = RE_HOUSE.exec(line)
    if (houseMatch && !/\d/.test(line)) {
      house = houseMatch[1].trim()
      continue
    }

    // Scheme header (code-prefixed). Must look like a scheme line, not a
    // stray match (date rows can't match RE_SCHEME: a 2-digit day fails the
    // 3-9 char code).
    if (RE_SCHEME.exec(line) && /(Fund|Plan|Growth|ISIN|Non-?Demat|Portfolio)/i.test(line)) {
      cur = newScheme(house, cleanSchemeName(line))
      const isin = RE_ISINTOK.exec(line) // ISIN may be on this line...
      if (isin) {
        cur.isin = isin[1]
        cur._awaitISIN = false
      }
      schemes.push(cur)
      continue
    }
    if (!cur) continue

    // ...or wrap onto a following line before the first transaction.
    if (cur._awaitISIN) {
      const isin = RE_ISINTOK.exec(line)
      if (isin) {
        cur.isin = isin[1]
        cur._awaitISIN = false
        continue
      }
    }

    const folioMatch = RE_FOLIO.exec(line)
    if (folioMatch) {
      cur.folio = folioMatch[1].trim()
      cur._awaitISIN = false
    }

    // Value fields — parsed independently so any ordering / merging works.
    const navMatch = RE_NAV.exec(line)
    if (navMatch) {
      cur.nav = parseNum(navMatch[2])
      cur.navDate = parseDate(navMatch[1])
    }
    const mvMatch = RE_MV.exec(line)
    if (mvMatch) cur.marketValue = parseNum(mvMatch[1])
    const cubMatch = RE_CUB.exec(line)
    if (cubMatch) cur.closingUnits = parseNum(cubMatch[1])
    const tcvMatch = RE_TCV.exec(line)
    if (tcvMatch) cur.costValue = parseNum(tcvMatch[1])

    // Stamp duty (folded into the most recent purchase's invested amount).
    const attachStamp = (amt: number) => {
      for (let i = cur!.txns.length - 1; i >= 0; i--) {
        if (cur!.txns[i].units > 0) {
          cur!.txns[i].stamp += amt
          break
        }
      }
    }
    const stampAmt = parseStampLine(line)
    if (stampAmt != null) {
      attachStamp(stampAmt)
      cur._awaitStamp = false
      continue
    }
    if (RE_STAMP_HDR.test(line)) {
      cur._awaitStamp = true // amount is on the next line
      continue
    }
    if (cur._awaitStamp) {
      cur._awaitStamp = false
      const contAmt = parseStampAmount(line)
      if (contAmt != null) {
        attachStamp(contAmt)
        continue
      }
      // otherwise fall through and parse this line normally
    }

    // Transactions (with or without the description / balance columns).
    const txn = parseTxnLine(line)
    if (txn) {
      cur._awaitISIN = false
      cur.txns.push(txn)
    }
  }

  return schemes.filter(
    (s) => s.txns.length > 0 || isFinite(s.costValue) || isFinite(s.marketValue),
  )
}
