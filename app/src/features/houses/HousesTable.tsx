import type { SortableColumn } from '../../ui/primitives/SortableTable'
import { SortableTable } from '../../ui/primitives/SortableTable'
import { inr } from '../../format'
import type { HouseSummary, Portfolio } from '../../engine/types'

// The #htable "allocation across AMCs" table. Ported from
// reference/engine.js renderHouses.
export function HousesTable({ pf }: { pf: Portfolio }) {
  const houses = pf.houses.filter((h) => h.value > 0)

  const columns: SortableColumn<HouseSummary>[] = [
    { key: 'house', label: 'Fund House', type: 'text', value: (h) => h.house, cell: (h) => <td>{h.house}</td> },
    {
      key: 'cost',
      label: 'Invested',
      type: 'num',
      value: (h) => (h.hasCost && h.cost > 0 ? h.cost : NaN),
      cell: (h) => <td>{h.hasCost && h.cost > 0 ? inr(h.cost) : '—'}</td>,
    },
    { key: 'value', label: 'Market Value', type: 'num', value: (h) => h.value, cell: (h) => <td>{inr(h.value)}</td> },
    {
      key: 'gain',
      label: 'Gain',
      type: 'num',
      value: (h) => (h.hasCost && h.cost > 0 ? h.value - h.cost : NaN),
      cell: (h) => {
        const known = h.hasCost && h.cost > 0
        const g = h.value - h.cost
        const up = g >= 0
        return <td style={{ color: known ? (up ? 'var(--pos)' : 'var(--neg)') : 'var(--muted)' }}>{known ? `${up ? '+' : '−'}${inr(Math.abs(g))}` : '—'}</td>
      },
    },
    {
      key: 'weight',
      label: 'Weight',
      type: 'num',
      value: (h) => h.value / pf.totalValue,
      cell: (h) => <td>{((h.value / pf.totalValue) * 100).toFixed(1)}%</td>,
    },
  ]

  const tg = isFinite(pf.unrealised)
  const totalCells = [
    <td key="house">Total</td>,
    <td key="cost">{pf.totalCost > 0 ? inr(pf.totalCost) : '—'}</td>,
    <td key="value">{inr(pf.totalValue)}</td>,
    <td key="gain" style={{ color: tg ? (pf.unrealised >= 0 ? 'var(--pos)' : 'var(--neg)') : 'var(--muted)' }}>
      {tg ? `${pf.unrealised >= 0 ? '+' : '−'}${inr(Math.abs(pf.unrealised))}` : '—'}
    </td>,
    <td key="weight">100%</td>,
  ]

  return <SortableTable id="htable" className="htable" columns={columns} data={houses} totalCells={totalCells} defaultSort={{ key: 'value', dir: -1 }} />
}
