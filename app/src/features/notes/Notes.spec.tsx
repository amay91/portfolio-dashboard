import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Notes } from './Notes'

describe('Notes', () => {
  it('renders the static method/caveats copy with the given valuation date', () => {
    const html = renderToStaticMarkup(<Notes valDate={new Date('2026-07-01')} />)
    expect(html).toContain('Valuation date')
    expect(html).toContain('All-time return')
    expect(html).toContain('Nifty 50 benchmark')
  })
})
