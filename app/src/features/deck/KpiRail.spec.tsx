import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { KpiRail } from './KpiRail'
import { makePortfolio } from '../../testFixtures'

describe('KpiRail', () => {
  it('renders all 4 tiles with a Nifty 50 benchmark comparison when live and gain data are known', () => {
    const html = renderToStaticMarkup(<KpiRail pf={makePortfolio()} niftyAllTime={0.11} nifty1Y={0.04} onOpenCommentary={() => {}} />)
    expect(html).toContain('Total Value')
    expect(html).toContain('Total Gain / ST-LT Split')
    expect(html).toContain('XIRR')
    expect(html).toContain('Insight')
    expect(html).toContain('Nifty 50')
  })

  it('shows placeholders instead of throwing when gain/XIRR/benchmark figures are all unknown', () => {
    const html = renderToStaticMarkup(
      <KpiRail
        pf={makePortfolio({ unrealised: NaN, gainPct: NaN, portXirr: null, portXirr1Y: null, inceptionYears: null })}
        niftyAllTime={null}
        nifty1Y={null}
        onOpenCommentary={() => {}}
      />,
    )
    expect(html).toContain('—')
  })
})
