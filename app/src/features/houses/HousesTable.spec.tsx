import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HousesTable } from './HousesTable'
import { makeHouseSummary, makePortfolio } from '../../testFixtures'

describe('HousesTable', () => {
  it('renders one row per AMC with a positive value, plus a total row', () => {
    const houses = [makeHouseSummary({ house: 'AMC A', value: 300000, cost: 250000 }), makeHouseSummary({ house: 'AMC B', value: 200000, cost: 150000 })]
    const html = renderToStaticMarkup(<HousesTable pf={makePortfolio({ houses, totalValue: 500000, totalCost: 400000, unrealised: 100000 })} />)
    expect(html).toContain('AMC A')
    expect(html).toContain('AMC B')
    expect(html).toContain('Total')
  })

  it('excludes zero-value houses and shows "—" for unknown cost basis', () => {
    const houses = [makeHouseSummary({ house: 'Zeroed Out AMC', value: 0 }), makeHouseSummary({ house: 'No Cost AMC', value: 100000, hasCost: false, cost: 0 })]
    const html = renderToStaticMarkup(<HousesTable pf={makePortfolio({ houses, totalValue: 100000 })} />)
    expect(html).not.toContain('Zeroed Out AMC')
    expect(html).toContain('No Cost AMC')
  })
})
