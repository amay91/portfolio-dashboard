import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { PortfolioAnalysis } from './PortfolioAnalysis'
import { ADVANCED_TILES } from './advancedTiles'

describe('PortfolioAnalysis', () => {
  it('renders a personalised title and all 6 section buttons', () => {
    const html = renderToStaticMarkup(<PortfolioAnalysis investorName="Jane Doe" openSections={{}} onSelect={() => {}} onViewAll={() => {}} />)
    expect(html).toContain("Jane&#x27;s Portfolio Analysis")
    for (const t of ADVANCED_TILES) expect(html).toContain(t.label)
  })

  it('falls back to a generic title with no investor name, and marks the open section expanded', () => {
    const html = renderToStaticMarkup(<PortfolioAnalysis investorName={null} openSections={{ charts: true }} onSelect={() => {}} onViewAll={() => {}} />)
    expect(html).toContain('Your Portfolio Analysis')
    expect(html).toContain('deck-advt-open')
    expect(html).toContain('aria-expanded="true"')
  })
})
