import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorthALook } from './WorthALook'
import { makeFund, makeFundMeta, makePortfolio } from '../../testFixtures'

describe('WorthALook', () => {
  it('renders nothing when there is nothing to flag', () => {
    // three evenly-split, cheap, unbenchmarked holdings — no single fund is
    // dominant, expense is under every band's threshold, no Nifty figure
    // supplied so the benchmark-trailing check can't fire either.
    const a = makeFund({ marketValue: 170000, meta: makeFundMeta({ expense: '0.2% (Direct)' }) })
    const b = makeFund({ marketValue: 170000, meta: makeFundMeta({ expense: '0.2% (Direct)' }) })
    const c = makeFund({ marketValue: 160000, meta: makeFundMeta({ expense: '0.2% (Direct)' }) })
    const pf = makePortfolio({ funds: [a, b, c], totalValue: 500000 })
    const html = renderToStaticMarkup(<WorthALook pf={pf} niftyAllTime={null} />)
    expect(html).toBe('')
  })

  it('renders the flag list when a holding is concentrated', () => {
    const big = makeFund({ name: 'Big Fund - Direct Growth', marketValue: 400000 })
    const small = makeFund({ name: 'Small Fund - Direct Growth', marketValue: 100000 })
    const pf = makePortfolio({ funds: [big, small], totalValue: 500000 })
    const html = renderToStaticMarkup(<WorthALook pf={pf} niftyAllTime={null} />)
    expect(html).toContain('Worth a Look')
    expect(html).toContain('Big Fund')
  })
})
