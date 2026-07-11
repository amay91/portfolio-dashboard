import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Commentary } from './Commentary'
import { makePortfolio } from '../../testFixtures'

describe('Commentary', () => {
  it('renders only the collapsed header (with the hint) when closed', () => {
    const html = renderToStaticMarkup(<Commentary pf={makePortfolio()} open={false} onToggle={() => {}} />)
    expect(html).toContain('Portfolio Commentary')
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('id="commentary-body"')
  })

  it('shows the age/retirement inputs and the empty-state prompt when open with no age entered yet', () => {
    const html = renderToStaticMarkup(<Commentary pf={makePortfolio()} open={true} onToggle={() => {}} />)
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('commentary-body')
    expect(html).toContain('Target Retirement Age')
    expect(html).toContain('Enter your age and a target retirement age above')
  })
})
