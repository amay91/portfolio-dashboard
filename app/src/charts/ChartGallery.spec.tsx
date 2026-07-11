import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ChartGallery } from './ChartGallery'
import { makeFund, makePortfolio } from '../testFixtures'

describe('ChartGallery', () => {
  it('renders slide 1 (Invested vs Value) plus the prev/next buttons and a labeled picker button per available chart', () => {
    const pf = makePortfolio({ funds: [makeFund()] })
    const html = renderToStaticMarkup(<ChartGallery pf={pf} />)
    expect(html).toContain('Invested vs Portfolio Value')
    expect(html).toContain('gprev')
    expect(html).toContain('gnext')
    expect(html).toContain('deck-advt')
    // full chart title stays unchanged in the slide itself — only the
    // picker buttons use the short-form label
    expect(html).toContain('Portfolio Value')
    expect(html).toContain('Annual Returns')
    expect(html).toContain('Rolling Returns')
    expect(html).toContain('Net Capital Changes')
    expect(html).toContain('Holdings by Value')
    expect(html).toContain('Geo Concentration')
  })

  it('marks exactly one picker button as current, matching the active slide', () => {
    const pf = makePortfolio({ funds: [makeFund()] })
    const html = renderToStaticMarkup(<ChartGallery pf={pf} />)
    const matches = html.match(/aria-current="true"/g) || []
    expect(matches).toHaveLength(1)
    expect(html).toContain('deck-advt-open')
  })

  it('shows the not-enough-data message instead of a crash when there is no series/geometry at all', () => {
    const pf = makePortfolio({ series: null, funds: [], geo: [] })
    const html = renderToStaticMarkup(<ChartGallery pf={pf} />)
    expect(html).toContain('Not enough dated transactions')
  })
})
