import { runDataCheck } from '../../engine/datacheck'
import { fmtDate } from '../../format'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'
import type { Diag } from '../../marketdata/resolve'

// A concise pass/fail headline, always — the full per-scheme breakdown
// (which holdings passed, which didn't, and why) now lives entirely in the
// Data Sources section; this panel just says whether to look and links
// straight there. Renders nothing until a live-NAV attempt has actually
// happened (matches the prototype: the sample's first, statement-only paint
// shows no panel yet). Ported from reference/engine.js renderDataCheck.
export function DataCheck({ pf, diag, onOpenDataSources }: { pf: Portfolio; diag: Diag | null; onOpenDataSources: () => void }) {
  if (!diag) return null
  const dc = runDataCheck(pf, diag)

  let cls: string
  let icon: string
  let head: string

  // Copy is layperson-first (review item A6): say what happened, whether
  // the numbers can be trusted, and what to do next — before any term of
  // art. "Today's price" is the plain phrasing; "live NAV" rides along in
  // parentheses once so the Data Sources detail table's vocabulary still
  // connects.
  if (dc.allLive) {
    cls = 'dc-ok'
    icon = '✓'
    head = `Data check passed — all ${dc.checked} of your current holding${dc.checked === 1 ? '' : 's'} ${dc.checked === 1 ? 'is' : 'are'} valued at today's official price (live NAV, as of ${fmtDate(dc.asOf)}).`
  } else if (!dc.reachable) {
    cls = 'dc-warn'
    icon = '⚠'
    head = `Today's prices couldn't be fetched — this usually means a connection problem. All ${dc.checked} holdings are shown at the prices printed in your statement instead; every figure is still accurate as of the statement date. Try Refresh in a little while.`
  } else {
    cls = 'dc-warn'
    icon = '⚠'
    head = `Data check — ${dc.live} of ${dc.checked} holdings are valued at today's price; ${dc.onStatement} couldn't be matched to a live price and ${dc.onStatement === 1 ? 'uses' : 'use'} the statement price instead (accurate as of the statement date).`
  }

  return (
    <div id="datacheck-body">
      <HoverDiv className={`datacheck ${cls}`}>
        <div className="dc-icon">{icon}</div>
        <div className="dc-main">
          <div className="dc-head">{head}</div>
          <button className="dc-link" onClick={onOpenDataSources}>
            Details Shown in Data Sources
          </button>
          {!dc.reconciles && (
            <div className="dc-note dc-err">
              Note: the per-fund values in this statement don't quite add up to its own headline total — the file may not have uploaded cleanly. Re-uploading the PDF usually
              fixes this.
            </div>
          )}
        </div>
      </HoverDiv>
    </div>
  )
}
