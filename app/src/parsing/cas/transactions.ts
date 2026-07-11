import { parseDate } from '../../engine/dates'
import { parseNum } from '../../engine/money'
import type { Txn } from '../../engine/types'

// Transaction with description + (optional) trailing unit-balance column.
const RE_TXN =
  /^(\d{2}-[A-Za-z]{3}-\d{4})\s+(.+?)\s+(\(?-?[\d,]+\.\d{2}\)?)\s+(\(?-?[\d,]+\.\d{3,4}\)?)\s+([\d,]+\.\d{2,6})(?:\s+(\(?-?[\d,]+\.\d{3,4}\)?))?\s*$/
// Same shape but with the description column missing (row got fragmented).
const RE_TXN2 =
  /^(\d{2}-[A-Za-z]{3}-\d{4})\s+(\(?-?[\d,]+\.\d{2}\)?)\s+(\(?-?[\d,]+\.\d{3,4}\)?)\s+([\d,]+\.\d{2,6})(?:\s+(\(?-?[\d,]+\.\d{3,4}\)?))?\s*$/

export const RE_STAMP =
  /(\d{2}-[A-Za-z]{3}-\d{4})\s+\*{2,3}\s*Stamp\s*Duty\s*\*{2,3}\s+([\d,]+\.\d{2})/i
// Some layouts wrap stamp duty across lines: "*** Stamp Duty ***" on one line
// and its amount ("<date> 25.00" or just "25.00") on the next.
export const RE_STAMP_HDR = /\*{2,3}\s*Stamp\s*Duty\s*\*{2,3}/i
export const RE_STAMP_AMT = /^(?:\d{2}-[A-Za-z]{3}-\d{4}\s+)?([\d,]+\.\d{2})\s*$/

// Parses a transaction row (either shape). Returns null if the line doesn't
// match or the date is unparseable; stamp is always 0 here (attached later
// by the caller, since stamp-duty lines fold into the preceding purchase).
export function parseTxnLine(line: string): Txn | null {
  let m = RE_TXN.exec(line)
  if (m) {
    const date = parseDate(m[1])
    if (!date) return null
    return {
      date,
      desc: (m[2] || '').trim(),
      amount: parseNum(m[3]),
      units: parseNum(m[4]),
      price: parseNum(m[5]),
      balance: parseNum(m[6]),
      stamp: 0,
    }
  }
  m = RE_TXN2.exec(line)
  if (m) {
    const date = parseDate(m[1])
    if (!date) return null
    return {
      date,
      desc: '',
      amount: parseNum(m[2]),
      units: parseNum(m[3]),
      price: parseNum(m[4]),
      balance: parseNum(m[5]),
      stamp: 0,
    }
  }
  return null
}

// Stamp duty on its own line: "<date> *** Stamp Duty *** <amount>".
export function parseStampLine(line: string): number | null {
  const m = RE_STAMP.exec(line)
  return m ? parseNum(m[2]) : null
}

// The amount-only continuation line after a "*** Stamp Duty ***" header.
export function parseStampAmount(line: string): number | null {
  const m = RE_STAMP_AMT.exec(line)
  return m ? parseNum(m[1]) : null
}
