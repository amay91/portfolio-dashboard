import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DataSources } from './DataSources'
import { makeDiag, makeFund, makePortfolio } from '../../testFixtures'

describe('DataSources', () => {
  it('lists every active holding with its NAV source and status, plus the diagnostics line', () => {
    const html = renderToStaticMarkup(<DataSources pf={makePortfolio()} diag={makeDiag({ captnemoUsed: true })} />)
    expect(html).toContain('valued at today')
    expect(html).toContain('mf.captnemo.in used for ISIN matches')
    expect(html).toContain('Pass')
  })

  it('shows the unreachable message and a Fail status when live sources could not be reached', () => {
    const pf = makePortfolio({ live: false, funds: [makeFund({ navLive: false, liveRejected: false })] })
    const html = renderToStaticMarkup(<DataSources pf={pf} diag={makeDiag({ amfiOk: false, reachable: false })} />)
    // layperson copy (review item A6): plain cause + reassurance that the
    // statement-priced figures are still trustworthy
    expect(html).toContain('be fetched on this run')
    expect(html).toContain('accurate as of the statement date')
    expect(html).toContain('Fail')
  })

  it('notes exited positions separately when present', () => {
    const pf = makePortfolio({ funds: [makeFund(), makeFund({ active: false, name: 'Redeemed Fund - Direct Growth' })] })
    const html = renderToStaticMarkup(<DataSources pf={pf} diag={makeDiag()} />)
    expect(html).toContain('exited')
    expect(html).toContain('Redeemed Fund')
  })
})
