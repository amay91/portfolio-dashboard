import { sourceFor } from '../sources/sourcing'
import type { SortableColumn } from '../../ui/primitives/SortableTable'
import { SortableTable } from '../../ui/primitives/SortableTable'
import { fmtDate, inr, pct, shortSchemeName } from '../../format'
import type { Fund, Portfolio } from '../../engine/types'

function NavTag({ live, source }: { live: boolean; source: string }) {
  return <span className={`navtag ${live ? 'live' : 'stmt'}`}>{source}</span>
}

// The #stable "every scheme at a glance" table. Current holdings only —
// exited/fully-redeemed folios are hidden (their realised gains remain in
// the portfolio totals and since-inception return — see the note below the
// table). Ported from reference/engine.js renderSummaryTable.
export function HoldingsTable({ pf, live, diag }: { pf: Portfolio; live: boolean; diag: { reachable: boolean } | null }) {
  const funds = pf.funds.filter((f) => f.active)
  const exited = pf.funds.filter((f) => !f.active)
  const gv = (g: number) => isFinite(g)

  const columns: SortableColumn<Fund>[] = [
    {
      key: 'name',
      label: 'Scheme',
      type: 'text',
      value: (f) => shortSchemeName(f.name),
      cell: (f) => {
        const s = sourceFor(f, live, diag)
        return (
          <td className="nm">
            {shortSchemeName(f.name)}
            {s.current ? <small className="renamed">now: {s.current}</small> : null}
          </td>
        )
      },
    },
    {
      key: 'invested',
      label: 'Invested',
      type: 'num',
      value: (f) => (f.hasCostBasis ? f.costValue : NaN),
      cell: (f) => <td>{f.hasCostBasis && isFinite(f.costValue) ? inr(f.costValue) : '—'}</td>,
    },
    { key: 'mv', label: 'Market Value', type: 'num', value: (f) => f.marketValue, cell: (f) => <td>{inr(f.marketValue)}</td> },
    {
      key: 'gain',
      label: 'Total Gain',
      type: 'num',
      value: (f) => f.unrealised,
      cell: (f) => (
        <td style={{ color: gv(f.unrealised) ? (f.unrealised >= 0 ? 'var(--pos)' : 'var(--neg)') : 'var(--muted)' }}>
          {gv(f.unrealised) ? `${f.unrealised >= 0 ? '+' : '−'}${inr(Math.abs(f.unrealised))}` : '—'}
        </td>
      ),
    },
    {
      key: 'cagr',
      label: 'Wtd. CAGR',
      type: 'num',
      value: (f) => (f.cagr != null ? f.cagr : NaN),
      cell: (f) => <td style={{ color: f.cagr != null ? 'var(--green)' : 'var(--muted)' }}>{f.cagr != null ? pct(f.cagr * 100) : '—'}</td>,
    },
    {
      key: 'navd',
      label: 'NAV Date',
      type: 'num',
      value: (f) => (f.navDate ? f.navDate.getTime() : -Infinity),
      cell: (f) => {
        const s = sourceFor(f, live, diag)
        return (
          <td className="navd">
            {fmtDate(f.navDate)} <NavTag live={s.live} source={s.source} />
          </td>
        )
      },
    },
  ]

  const tg = isFinite(pf.unrealised)
  const totalCells = [
    <td key="name">Total</td>,
    <td key="invested">{pf.totalCost > 0 ? inr(pf.totalCost) : '—'}</td>,
    <td key="mv">{inr(pf.totalValue)}</td>,
    <td key="gain" style={{ color: tg ? (pf.unrealised >= 0 ? 'var(--pos)' : 'var(--neg)') : 'var(--muted)' }}>
      {tg ? `${pf.unrealised >= 0 ? '+' : '−'}${inr(Math.abs(pf.unrealised))}` : '—'}
    </td>,
    <td key="cagr" style={{ color: 'var(--green)' }}>{pf.allTimeReturn != null ? pct(pf.allTimeReturn * 100) : '—'}</td>,
    <td key="navd" className="navd">{fmtDate(pf.liveAsOf || pf.valDate)}</td>,
  ]

  return (
    <>
      <SortableTable id="stable" className="htable stable" columns={columns} data={funds} totalCells={totalCells} defaultSort={{ key: 'mv', dir: -1 }} />
      {exited.length > 0 && (
        <p className="srcfoot" id="stable-note">
          {exited.length} fully-exited {exited.length === 1 ? 'position is' : 'positions are'} hidden here ({exited.map((f) => shortSchemeName(f.name)).join(', ')}). Their realised{' '}
          {pf.realised >= 0 ? 'gains' : 'losses'} of {inr(Math.abs(pf.realised))} are retained in the all-time return shown above and in the Total row’s CAGR.
        </p>
      )}
    </>
  )
}
