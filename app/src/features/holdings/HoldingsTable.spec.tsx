import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { HoldingsTable } from './HoldingsTable'
import { makeFund, makePortfolio } from '../../testFixtures'

describe('HoldingsTable', () => {
  it('renders one row per active holding plus a Total row', () => {
    const pf = makePortfolio({ funds: [makeFund({ name: 'Alpha Fund - Direct Growth' })] })
    const html = renderToStaticMarkup(<HoldingsTable pf={pf} live={true} diag={{ reachable: true }} />)
    expect(html).toContain('Alpha Fund')
    expect(html).toContain('Total')
  })

  it('notes fully-exited positions below the table when present', () => {
    const pf = makePortfolio({ funds: [makeFund(), makeFund({ active: false, name: 'Redeemed Fund - Direct Growth' })] })
    const html = renderToStaticMarkup(<HoldingsTable pf={pf} live={true} diag={{ reachable: true }} />)
    expect(html).toContain('fully-exited')
    expect(html).toContain('Redeemed Fund')
  })

  it('renders without throwing when live data was never reached', () => {
    const pf = makePortfolio({ live: false, funds: [makeFund({ navLive: false })] })
    const html = renderToStaticMarkup(<HoldingsTable pf={pf} live={false} diag={null} />)
    expect(html).toContain('Statement')
  })
})
