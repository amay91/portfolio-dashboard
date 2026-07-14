import { sourceFor } from './sourcing'
import { fmtDate } from '../../format'
import type { Portfolio } from '../../engine/types'
import type { Diag } from '../../marketdata/resolve'

function NavTag({ live, source }: { live: boolean; source: string }) {
  return <span className={`navtag ${live ? 'live' : 'stmt'}`}>{source}</span>
}

function StatusTag({ status }: { status: 'Pass' | 'Fail' }) {
  return <span className={`navtag ${status === 'Pass' ? 'live' : 'stmt'}`}>{status}</span>
}

// The "Data sources" provenance panel. Ported from reference/engine.js
// renderSources.
export function DataSources({ pf, diag }: { pf: Portfolio; diag: Diag | null }) {
  const shown = pf.funds.filter((f) => f.active)
  const exited = pf.funds.filter((f) => !f.active)
  const live = shown.filter((f) => sourceFor(f, pf.live, diag).live)
  // Layperson-first phrasing (review item A6) — "today's price" leads,
  // "NAV" stays available in the table below for anyone cross-checking
  // against the FAQ/Method Notes vocabulary.
  const head = pf.live
    ? `${live.length} of ${shown.length} current holdings are valued at today's official price${pf.liveAsOf ? ` (as of ${fmtDate(pf.liveAsOf)})` : ''}.`
    : `Today's prices couldn't be fetched on this run — every holding is shown at the price printed in your statement, so all figures are accurate as of the statement date.`

  let diagLine = ''
  if (diag) {
    const parts: string[] = []
    parts.push(diag.amfiOk ? 'AMFI daily NAV file loaded' : 'AMFI file not reachable')
    if (diag.captnemoUsed) parts.push('mf.captnemo.in used for ISIN matches')
    if (diag.mfapiUsed) parts.push('mfapi.in used for name matches')
    if (!diag.reachable) parts.push('no price source could be reached — usually a connection problem, or a browser privacy extension blocking the requests')
    diagLine = parts.join(' · ') + '.'
  }

  return (
    <div id="sources-body">
      <p className="srchead">{head}</p>
      {diagLine && <p className="srcdiag">{diagLine}</p>}
      {/* Same wide-table overflow risk as SortableTable (mobile optimization
          M1) — this table isn't sortable so it doesn't go through that
          primitive, but needs the identical scroll containment. */}
      <div className="table-scroll">
        <table className="htable srctable">
          <thead>
            <tr>
              <th>Scheme</th>
              <th>NAV Source</th>
              <th>Data Check Status</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((f) => {
              const s = sourceFor(f, pf.live, diag)
              return (
                // folio, not just isin/name: the same scheme can legitimately
                // be held across multiple folios — see FundCards.tsx's comment.
                <tr key={`${f.isin || f.name}-${f.folio}`}>
                  <td className="nm">{f.name}</td>
                  <td><NavTag live={s.live} source={s.source} /></td>
                  <td className="why">
                    <StatusTag status={s.status} /> {s.reason}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="srcfoot">
        Primary source is AMFI (Association of Mutual Funds in India), matched by ISIN. Where a statement carries no ISIN or the AMFI match fails, the dashboard tries mf.captnemo.in
        (by ISIN) and mfapi.in (AMFI-derived) by scheme name.
      </p>
      {exited.length > 0 && (
        <p className="srcfoot">
          {exited.length} exited {exited.length === 1 ? 'position' : 'positions'} ({exited.map((f) => f.name).join(', ')}) are excluded from this list — they hold no units, so
          no live NAV is needed; their realised gains/losses remain in the portfolio’s since-inception return.
        </p>
      )}
    </div>
  )
}
