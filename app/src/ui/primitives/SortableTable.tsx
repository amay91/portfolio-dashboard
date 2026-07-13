import { cloneElement, isValidElement, useState } from 'react'
import type { ReactNode } from 'react'
import { InfoTip } from '../InfoTip'

// Generic sortable table, React port of reference/engine.js renderSortable.
// Numeric columns toggle desc/asc (default desc — biggest first); text
// columns toggle A→Z / Z→A. `cell`/`totalCells` return full <td> elements
// (not just inner content) so callers keep full control of classes/styles,
// matching the prototype's cell-html-string approach.
export interface SortableColumn<T> {
  key: string
  label: string
  type: 'text' | 'num'
  value: (row: T) => string | number
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
  // Optional point-of-use explainer for a jargon header (review item A1) —
  // rendered as an InfoTip after the label. Interacting with the tip does
  // not sort the column (InfoTip stops propagation; the keydown guard
  // below only fires for keys pressed on the <th> itself).
  tip?: string
}

export interface SortableTableProps<T> {
  id: string
  columns: SortableColumn<T>[]
  data: T[]
  totalCells?: ReactNode[]
  defaultSort?: { key: string; dir: 1 | -1 }
  className?: string
}

export function SortableTable<T>({ id, columns, data, totalCells, defaultSort, className }: SortableTableProps<T>) {
  const [sort, setSort] = useState(defaultSort || { key: columns[0].key, dir: columns[0].type === 'num' ? -1 : 1 })
  const col = columns.find((c) => c.key === sort.key) || columns[0]

  const sorted = [...data].sort((a, b) => {
    if (col.type === 'num') {
      let av = Number(col.value(a))
      let bv = Number(col.value(b))
      av = isFinite(av) ? av : -Infinity
      bv = isFinite(bv) ? bv : -Infinity
      return (av - bv) * sort.dir
    }
    const av = String(col.value(a) ?? '').toLowerCase()
    const bv = String(col.value(b) ?? '').toLowerCase()
    return (av < bv ? -1 : av > bv ? 1 : 0) * sort.dir
  })

  const onHeaderClick = (c: SortableColumn<T>) => {
    setSort((prev) => (prev.key === c.key ? { key: c.key, dir: (prev.dir * -1) as 1 | -1 } : { key: c.key, dir: c.type === 'num' ? -1 : 1 }))
  }

  return (
    <table className={className} id={id}>
      <thead>
        <tr>
          {columns.map((c) => {
            const active = c.key === sort.key
            // aria-sort communicates the column's sort state to a screen
            // reader the same way the ↑/↓ glyph does visually; "ascending"
            // here means dir 1, matching the visible arrow direction below.
            const ariaSort = active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'
            return (
              // A native <button> carries the sort control (B4, review item)
              // instead of role="button" on the <th> itself — the earlier
              // approach silently stripped the th's native columnheader role
              // from assistive tech, since explicit role="button" overrides
              // implicit host semantics. aria-sort stays on the <th>, per
              // spec. The button and InfoTip's own button are siblings, not
              // nested — nested <button>s are invalid HTML and InfoTip
              // already stops propagation on its own click/keydown.
              //
              // th also keeps a click handler so the whole cell stays
              // clickable (not just the label text) — critically, th must
              // NOT get display:flex/etc. to stretch the button, since
              // overriding a table-cell's display breaks the browser's
              // table column-width algorithm entirely. The target check
              // stops this from double-firing when the click actually
              // originated on the button (which already handled it via its
              // own onClick) or bubbled up from InfoTip (which stops
              // propagation itself).
              <th
                key={c.key}
                className={`sortable${active ? ' active' : ''}`}
                style={c.align ? { textAlign: c.align } : undefined}
                aria-sort={ariaSort}
                onClick={(e) => {
                  if (e.target === e.currentTarget) onHeaderClick(c)
                }}
              >
                <button type="button" className="th-sortbtn" title={`Sort by ${c.label}`} onClick={() => onHeaderClick(c)}>
                  {c.label}
                  <span className="sar">{active ? (sort.dir === 1 ? '↑' : '↓') : ''}</span>
                </button>
                {c.tip ? <InfoTip text={c.tip} label={`What does ${c.label} mean?`} align="right" /> : null}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, i) => (
          <tr key={i}>
            {columns.map((c) => {
              const el = c.cell(r)
              return isValidElement(el) ? cloneElement(el as React.ReactElement<object>, { key: c.key }) : el
            })}
          </tr>
        ))}
        {totalCells ? <tr className="tot">{totalCells}</tr> : null}
      </tbody>
    </table>
  )
}
