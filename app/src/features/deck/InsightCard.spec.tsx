import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InsightCard } from './InsightCard'
import { makePortfolio } from '../../testFixtures'

describe('InsightCard', () => {
  it('renders an insight sentence and the Full Commentary link', () => {
    const html = renderToStaticMarkup(<InsightCard pf={makePortfolio()} onOpenCommentary={() => {}} />)
    expect(html).toContain('deck-insight-text')
    expect(html).toContain('Full Commentary')
  })
})
