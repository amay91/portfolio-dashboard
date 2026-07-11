import { useState } from 'react'
import { CAT, CAT_ORDER } from './categories'
import type { CatKey } from './categories'
import { donutPaths } from './donutGeometry'
import { inr } from '../../format'
import { fundHouseShortName } from '../../reference/fundHouses'
import { HoverDiv } from '../../ui/HoverLift'
import type { Portfolio } from '../../engine/types'

// The look-through allocation section: donut + legend (selectable) + drill-
// down of contributing funds. Ported from reference/engine.js's
// renderDonut/renderLegend/renderDrill/select/applyDim/updateCenter, with
// `SELECTED` promoted from a module-level global to real component state.
export function AllocationSection({ pf }: { pf: Portfolio }) {
  const [selected, setSelected] = useState<CatKey | null>(null)
  const values = CAT_ORDER.map((k) => ({ key: k, value: pf.alloc[k] }))
  const slices = donutPaths(values)

  const toggle = (key: CatKey) => setSelected((prev) => (prev === key ? null : key))
  const onKeyActivate = (key: CatKey) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle(key)
    }
  }

  return (
    <div className="alloc">
      <div>
        <div className="donut-wrap">
          <div className="donut">
            <svg viewBox="0 0 340 340" xmlns="http://www.w3.org/2000/svg">
              {slices.map((p) => {
                const c = CAT[p.key]
                return (
                  <path
                    key={p.key}
                    d={p.d}
                    fill={c.hex}
                    tabIndex={0}
                    role="button"
                    aria-label={`${c.label} ${(p.frac * 100).toFixed(1)} percent`}
                    aria-pressed={selected === p.key}
                    className={selected && p.key !== selected ? 'dim' : undefined}
                    style={{ transform: selected === p.key ? 'scale(1.04)' : 'scale(1)' }}
                    onClick={() => toggle(p.key)}
                    onKeyDown={onKeyActivate(p.key)}
                  />
                )
              })}
            </svg>
          </div>
          <div className="donut-center">
            {selected ? (
              <>
                <div className="dc-k" style={{ color: CAT[selected].hex }}>{CAT[selected].label}</div>
                <div className="dc-v">{inr(pf.alloc[selected])}</div>
                <div className="dc-s">{((pf.alloc[selected] / pf.totalValue) * 100).toFixed(1)}% of portfolio</div>
              </>
            ) : (
              <>
                <div className="dc-k">Total value</div>
                <div className="dc-v">{inr(pf.totalValue)}</div>
                <div className="dc-s">Tap a slice to break it down</div>
              </>
            )}
          </div>
        </div>
      </div>
      <div>
        <div className="legend">
          {values.map((v) => {
            const c = CAT[v.key]
            const p = (v.value / pf.totalValue) * 100
            return (
              <HoverDiv
                key={v.key}
                className={`legrow${selected === v.key ? ' active' : ''}`}
                tabIndex={0}
                role="button"
                aria-pressed={selected === v.key}
                aria-label={`${c.label} ${c.sub}, ${inr(v.value)}, ${p.toFixed(1)} percent`}
                onClick={() => toggle(v.key)}
                onKeyDown={onKeyActivate(v.key)}
              >
                <span className="sw" style={{ background: c.hex }} />
                <span className="lab">
                  {c.label}
                  <small>{c.sub}</small>
                </span>
                <span className="amt">{inr(v.value)}</span>
                <span className="pct">{p.toFixed(1)}%</span>
              </HoverDiv>
            )
          })}
        </div>
        <div className="drill">
          {!selected ? (
            <p className="hint">No category selected. Choose one to list the funds that contribute to it and by how much.</p>
          ) : (
            (() => {
              const cat = CAT[selected]
              const rows = pf.contrib[selected] || []
              const catTotal = pf.alloc[selected]
              if (!rows.length) return <div className="dh">No holdings map to <b>{cat.label}</b>.</div>
              return (
                <>
                  <div className="dh">
                    Funds contributing to <b style={{ color: cat.hex }}>{cat.label}</b> · {inr(catTotal)}
                  </div>
                  {rows.map((r, i) => (
                    <div className="drill-row" key={i}>
                      <div className="dn">
                        {r.name}
                        <small>{fundHouseShortName(r.house)}</small>
                      </div>
                      <div className="da">{inr(r.amount)}</div>
                      <div className="dp">
                        {((r.amount / catTotal) * 100).toFixed(1)}% of {cat.label.toLowerCase()}
                        <br />
                        {((r.amount / pf.totalValue) * 100).toFixed(1)}% of pf
                      </div>
                    </div>
                  ))}
                </>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}
