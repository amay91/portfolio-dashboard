import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DataCheck } from './DataCheck'
import { makeDiag, makeFund, makePortfolio } from '../../testFixtures'

describe('DataCheck', () => {
  it('renders nothing before a live-NAV attempt has happened (diag is null)', () => {
    const html = renderToStaticMarkup(<DataCheck pf={makePortfolio()} diag={null} onOpenDataSources={() => {}} />)
    expect(html).toBe('')
  })

  it('shows the pass headline when every current holding resolved a live NAV', () => {
    const html = renderToStaticMarkup(<DataCheck pf={makePortfolio()} diag={makeDiag()} onOpenDataSources={() => {}} />)
    expect(html).toContain('Data check passed')
    expect(html).toContain('Details Shown in Data Sources')
  })

  it('shows the fail headline when a holding fell back to its statement NAV', () => {
    const pf = makePortfolio({ funds: [makeFund({ navLive: false })] })
    const html = renderToStaticMarkup(<DataCheck pf={pf} diag={makeDiag()} onOpenDataSources={() => {}} />)
    expect(html).toContain('Data check')
    expect(html).toContain('failed and')
  })
})
