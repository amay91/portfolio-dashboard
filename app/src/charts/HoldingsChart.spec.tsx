import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HoldingsChart } from './HoldingsChart'
import { makeFund } from '../testFixtures'

describe('HoldingsChart', () => {
  it('renders one bar per active fund, largest first', () => {
    const funds = [makeFund({ name: 'Small Fund', marketValue: 10000, active: true }), makeFund({ name: 'Big Fund', marketValue: 900000, active: true })]
    const html = renderToStaticMarkup(<HoldingsChart funds={funds} totalValue={910000} />)
    expect(html).toContain('chart-svg')
    expect(html).toContain('Market value')
  })

  it('renders nothing (not throwing) with no active funds', () => {
    const html = renderToStaticMarkup(<HoldingsChart funds={[makeFund({ active: false })]} totalValue={0} />)
    expect(html).toBe('')
  })
})
