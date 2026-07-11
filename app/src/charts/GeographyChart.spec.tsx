import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GeographyChart } from './GeographyChart'
import { makeGeo } from '../testFixtures'

describe('GeographyChart', () => {
  it('renders one bar per country', () => {
    const html = renderToStaticMarkup(<GeographyChart geo={makeGeo()} />)
    expect(html).toContain('chart-svg')
    expect(html).toContain('% of portfolio value')
  })

  it('renders nothing (not throwing) with no geography data', () => {
    const html = renderToStaticMarkup(<GeographyChart geo={[]} />)
    expect(html).toBe('')
  })
})
