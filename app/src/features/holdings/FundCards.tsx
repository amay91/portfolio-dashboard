import { inr, pct } from '../../format'
import { fundHouseShortName } from '../../reference/fundHouses'
import { HoverArticle } from '../../ui/HoverLift'
import type { Fund, Portfolio } from '../../engine/types'

// Per-fund KIM/SID cards. Ported from reference/engine.js renderFunds.
export function FundCards({ pf }: { pf: Portfolio }) {
  const funds = pf.funds.filter((f) => f.active).sort((a, b) => b.marketValue - a.marketValue)
  return (
    <div className="funds" id="funds">
      {funds.map((f) => (
        // folio, not just isin/name: the same scheme can legitimately be
        // held across multiple folios (e.g. separate SIPs set up at
        // different times) — a real statement with that shape produced
        // React "duplicate key" warnings and a stuck-looking render before
        // folio was added here (see docs/DECISIONS.md).
        <FundCard key={`${f.isin || f.name}-${f.folio}`} f={f} />
      ))}
    </div>
  )
}

function FundCard({ f }: { f: Fund }) {
  const m = f.meta
  const hasGain = isFinite(f.gainPct)
  const up = isFinite(f.unrealised) ? f.unrealised >= 0 : true
  const tag = !f.active ? (
    <span className="tag flat">Redeemed</span>
  ) : hasGain ? (
    <span className={`tag ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {pct(f.gainPct)}
    </span>
  ) : (
    <span className="tag flat">Held</span>
  )
  const valBlock = f.active ? (
    <div className="mv">
      <small>Market Value</small>
      {inr(f.marketValue)}
    </div>
  ) : (
    <div className="mv">
      <small>Realised Gain</small>
      {inr(f.realised)}
    </div>
  )

  return (
    <HoverArticle className={`fcard ${f.active ? '' : 'redeemed'}`}>
      <div className="top">
        <div className="house">
          <span>{f.house ? fundHouseShortName(f.house) : '—'}</span>
          <span className="cat">{m.category}</span>
        </div>
        <h3>{f.name}</h3>
        <div className="valrow">
          {valBlock}
          {tag}
        </div>
      </div>
      {f.active ? (
        <>
          <div className="stats">
            <div>
              <div className="sk">Units</div>
              <div className="sv">{f.units.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</div>
            </div>
            <div>
              <div className="sk">Avg cost</div>
              <div className="sv">{f.hasCostBasis && f.avgCost ? inr(f.avgCost, 2) : '—'}</div>
            </div>
            <div>
              <div className="sk">XIRR</div>
              <div className="sv" style={{ color: 'var(--green)' }}>{f.xirr != null ? pct(f.xirr * 100) : '—'}</div>
            </div>
            <div>
              <div className="sk">CAGR</div>
              <div className="sv" style={{ color: 'var(--green)' }}>{f.cagr != null ? pct(f.cagr * 100) : '—'}</div>
            </div>
          </div>
          <div className="gainsplit">
            <div>
              <div className="gk">Invested</div>
              <div className="gv">{f.hasCostBasis ? inr(f.costValue) : '—'}</div>
            </div>
            <div>
              <div className="gk">Short-term gain</div>
              <div className="gv" style={{ color: 'var(--clay)' }}>{f.hasCostBasis ? inr(f.stcg) : '—'}</div>
            </div>
            <div>
              <div className="gk">Long-term gain</div>
              <div className="gv">{f.hasCostBasis ? inr(f.ltcg) : '—'}</div>
            </div>
            <div>
              <div className="gk">NAV</div>
              <div className="gv">{f.nav ? inr(f.nav, 4) : '—'}</div>
            </div>
          </div>
          {!f.hasCostBasis && (
            <div className="gainsplit" style={{ borderBottom: '1px solid var(--line)' }}>
              <div className="gk" style={{ color: 'var(--muted)', fontStyle: 'italic', textTransform: 'none', letterSpacing: 0 }}>
                Carried in as an opening balance — no purchase history in this statement, so cost, gains and return can’t be derived.
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="gainsplit">
          <div>
            <div className="gk">Invested</div>
            <div className="gv">{inr(f.investedTotal)}</div>
          </div>
          <div>
            <div className="gk">Realised LTCG</div>
            <div className="gv">{inr(f.realisedLT)}</div>
          </div>
          <div>
            <div className="gk">Realised STCG</div>
            <div className="gv" style={{ color: 'var(--clay)' }}>{inr(f.realisedST)}</div>
          </div>
          <div>
            <div className="gk">XIRR</div>
            <div className="gv" style={{ color: 'var(--green)' }}>{f.xirr != null ? pct(f.xirr * 100) : '—'}</div>
          </div>
        </div>
      )}
      <div className="kim">
        <div className="krow">
          <div className="kk">Benchmark</div>
          <div className="kv">{m.benchmark}</div>
        </div>
        <div className="krow">
          <div className="kk">Riskometer</div>
          <div className="kv">{m.risk}</div>
        </div>
        <div className="krow">
          <div className="kk">Expense Ratio</div>
          <div className="kv">{m.expense}</div>
        </div>
        <div className="krow">
          <div className="kk">Exit Load</div>
          <div className="kv">{m.exit}</div>
        </div>
        <div className="krow">
          <div className="kk">Launched</div>
          <div className="kv">{m.launch}</div>
        </div>
        <div className="krow">
          <div className="kk">Folio</div>
          <div className="kv mono" style={{ fontSize: 12 }}>{f.folio || '—'}</div>
        </div>
        <div className="note">{m.note}</div>
      </div>
      <div className="foot">
        <a href={m.amc} target="_blank" rel="noopener noreferrer">
          Official AMC Scheme Page <span className="ar">→</span>
        </a>
      </div>
    </HoverArticle>
  )
}
