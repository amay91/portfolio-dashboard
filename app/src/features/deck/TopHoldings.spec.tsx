import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { TopHoldings } from './TopHoldings'
import { makeFund, makePortfolio } from '../../testFixtures'

describe('TopHoldings', () => {
  it('renders up to the top 5 active holdings by market value, largest first', () => {
    const funds = [
      makeFund({ name: 'Small Fund - Direct Growth', marketValue: 10000 }),
      makeFund({ name: 'Big Fund - Direct Growth', marketValue: 900000 }),
    ]
    const html = renderToStaticMarkup(<TopHoldings pf={makePortfolio({ funds })} />)
    expect(html).toContain('Big Fund')
    expect(html.indexOf('Big Fund')).toBeLessThan(html.indexOf('Small Fund'))
  })

  it('renders nothing (not throwing) when there are no active holdings', () => {
    const html = renderToStaticMarkup(<TopHoldings pf={makePortfolio({ funds: [makeFund({ active: false })] })} />)
    expect(html).toBe('')
  })
})
