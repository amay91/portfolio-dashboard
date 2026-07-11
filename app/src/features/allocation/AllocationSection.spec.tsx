import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AllocationSection } from './AllocationSection'
import { makePortfolio } from '../../testFixtures'

describe('AllocationSection', () => {
  it('renders the donut, legend rows, and the default (no selection) hint', () => {
    const html = renderToStaticMarkup(<AllocationSection pf={makePortfolio()} />)
    expect(html).toContain('donut-wrap')
    expect(html).toContain('legrow')
    expect(html).toContain('No category selected')
    expect(html).toContain('Total value')
  })

  it('renders with a fully zeroed allocation without throwing', () => {
    const html = renderToStaticMarkup(<AllocationSection pf={makePortfolio({ alloc: { equity: 0, debt: 0, cash: 0, other: 0 }, totalValue: 0 })} />)
    expect(html).toContain('donut-wrap')
  })
})
