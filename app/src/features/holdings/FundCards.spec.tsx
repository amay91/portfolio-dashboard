import { act } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { FundCards } from './FundCards'
import { makeFund, makePortfolio } from '../../testFixtures'

describe('FundCards', () => {
  it('renders an active card with units/avg-cost/XIRR/CAGR and the KIM block', () => {
    const html = renderToStaticMarkup(<FundCards pf={makePortfolio({ funds: [makeFund({ name: 'Alpha Fund - Direct Growth' })] })} />)
    expect(html).toContain('Alpha Fund')
    expect(html).toContain('Market Value')
    expect(html).toContain('Benchmark')
    expect(html).toContain('Official AMC Scheme Page')
  })

  it('renders the no-cost-basis notice instead of gain figures when hasCostBasis is false', () => {
    const html = renderToStaticMarkup(<FundCards pf={makePortfolio({ funds: [makeFund({ hasCostBasis: false, avgCost: NaN })] })} />)
    expect(html).toContain('Carried in as an opening balance')
  })

  it('excludes redeemed (inactive) funds from the card list', () => {
    const html = renderToStaticMarkup(<FundCards pf={makePortfolio({ funds: [makeFund({ active: false, name: 'Redeemed Fund - Direct Growth' })] })} />)
    expect(html).not.toContain('Redeemed Fund')
  })

  // Regression (found via a real user's real statement, 2026-07-05): the
  // same scheme held across two folios — a legitimate, real-world shape,
  // e.g. two SIPs set up at different times into the same fund — produced
  // React "duplicate key" warnings and a dashboard that looked stuck/not
  // updating, because the list key was `f.isin || f.name` alone with no
  // folio. renderToStaticMarkup (used by every other spec in this file)
  // can't catch this: confirmed empirically that it does not run React's
  // key-uniqueness validation at all, so this uses a real client-side
  // render (react-dom/client + act, both already available from the
  // existing react/react-dom deps — no new dependency) to exercise the
  // actual reconciliation path where the warning fires.
  it('does not warn about duplicate keys when the same scheme is held across two folios', () => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const sameFundTwoFolios = [
      makeFund({ isin: 'INF109K016O4', name: 'ICICI Prudential Equity Arbitrage Fund - Direct Plan - Growth', folio: '111' }),
      makeFund({ isin: 'INF109K016O4', name: 'ICICI Prudential Equity Arbitrage Fund - Direct Plan - Growth', folio: '222' }),
    ]
    act(() => {
      root.render(<FundCards pf={makePortfolio({ funds: sameFundTwoFolios })} />)
    })
    const keyWarnings = errorSpy.mock.calls.filter((c) => String(c[0]).includes('same key'))
    const cardCount = container.querySelectorAll('.fcard').length // both folios actually rendered, not deduped
    root.unmount()
    document.body.removeChild(container)
    errorSpy.mockRestore()
    expect(keyWarnings).toHaveLength(0)
    expect(cardCount).toBe(2)
  })
})
