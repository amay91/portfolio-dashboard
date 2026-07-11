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

  if (dc.allLive) {
    cls = 'dc-ok'
    icon = '✓'
    head = `Data check passed — all ${dc.checked} current holding${dc.checked === 1 ? '' : 's'} valued on live NAVs (as of ${fmtDate(dc.asOf)}).`
  } else if (!dc.reachable) {
    cls = 'dc-warn'
    icon = '⚠'
    head = `Data check failed — live NAV sources couldn't be reached, so all ${dc.checked} holdings are shown at their statement NAVs.`
  } else {
    cls = 'dc-warn'
    icon = '⚠'
    head = `Data check — ${dc.live} of ${dc.checked} holdings passed (valued on live NAVs); ${dc.onStatement} failed and ${dc.onStatement === 1 ? 'is' : 'are'} shown at the statement NAV.`
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
          {!dc.reconciles && <div className="dc-note dc-err">Note: holdings didn't reconcile exactly to the headline value — please re-upload the statement.</div>}
        </div>
      </HoverDiv>
    </div>
  )
}
