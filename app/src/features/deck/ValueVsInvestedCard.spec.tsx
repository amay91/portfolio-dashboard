import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ValueVsInvestedCard } from './ValueVsInvestedCard'
import { makePortfolio } from '../../testFixtures'

describe('ValueVsInvestedCard', () => {
  it('renders the chart when there is enough series history', () => {
    const html = renderToStaticMarkup(<ValueVsInvestedCard pf={makePortfolio()} />)
    expect(html).toContain('chart-svg')
  })

  it('shows the empty message instead of a chart when there is no series', () => {
    const html = renderToStaticMarkup(<ValueVsInvestedCard pf={makePortfolio({ series: null })} />)
    expect(html).toContain('Not enough transaction history')
  })
})
