import type { Scheme } from './types'

export interface ExtractionQuality {
  ok: boolean
  reasons: string[]
}

// Detects whether a PDF extraction likely went wrong, so the upload bar can
// offer "Convert PDF to Markdown" only when it would actually help — not as
// a blanket alternative to the default pdf.js path. Deliberately does NOT
// use engine/datacheck.ts's `reconciles` check: that sums the same
// f.marketValue values Portfolio.totalValue itself sums (see
// engine/portfolio.ts), so it's nearly tautological and would almost never
// fire from a genuinely fragmented extraction (see docs/DECISIONS.md).
//
// Every rule here is checked against the 5 real golden fixtures (must all
// report ok:true — a false positive here would be an annoying, wrong nudge
// on a perfectly good parse) plus a synthetic corrupted case.
export function assessExtractionQuality(schemes: Scheme[]): ExtractionQuality {
  const reasons: string[] = []

  if (!schemes.length) {
    return { ok: false, reasons: ['No schemes were found in this statement.'] }
  }

  const active = schemes.filter((s) => s.txns.length > 0)

  // Deliberately does NOT check for a missing folio: verified against the 5
  // real golden fixtures, 3 of them (alok_2025/2026's Parag Parikh Liquid
  // Fund, vandana_kfintech's UTI Nifty 50 Index Fund) have a scheme whose
  // folio genuinely isn't captured due to registrar-specific format
  // variance — with zero effect on the parsed totals (both fixtures still
  // hit their exact golden totals). A missing folio doesn't correlate with
  // actual bad data here, so it would only produce a wrong, distracting nudge.

  // A real CAS is consistently one style throughout (either every scheme
  // carries an ISIN, or — like the ISIN-less AXIS fixture — none do). A mix
  // within the same statement means something broke mid-parse for a subset,
  // not a legitimate format choice.
  const withIsin = schemes.filter((s) => s.isin).length
  if (withIsin > 0 && withIsin < schemes.length) {
    reasons.push('Some schemes are missing their ISIN, while others in the same statement have one.')
  }

  if (active.some((s) => !isFinite(s.closingUnits) && !isFinite(s.marketValue))) {
    reasons.push("A scheme's current balance and value could not be read.")
  }

  return { ok: reasons.length === 0, reasons }
}
