import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CommandDeck } from './CommandDeck'
import { makePortfolio } from '../../testFixtures'

describe('CommandDeck', () => {
  it('renders the masthead, KPI rail, chart card, top holdings, and allocation without throwing', () => {
    const html = renderToStaticMarkup(<CommandDeck pf={makePortfolio()} investorName="Jane Doe" isSample={false} niftyAllTime={0.1} nifty1Y={0.05} onOpenCommentary={() => {}} />)
    expect(html).toContain('deck-mast-title')
    expect(html).toContain('Value vs Invested')
    expect(html).toContain('Allocation')
  })

  it('renders with no chart history and no holdings without throwing', () => {
    const html = renderToStaticMarkup(
      <CommandDeck pf={makePortfolio({ funds: [], series: null })} investorName={null} isSample={true} niftyAllTime={null} nifty1Y={null} onOpenCommentary={() => {}} />,
    )
    expect(html).toContain('Not enough transaction history')
  })
})
