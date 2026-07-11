import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { CapitalChart } from './CapitalChart'
import { makeSeries } from '../testFixtures'

describe('CapitalChart', () => {
  it('renders one bar per year of net capital contribution', () => {
    const html = renderToStaticMarkup(<CapitalChart series={makeSeries()} />)
    expect(html).toContain('chart-svg')
  })

  it('renders nothing (not throwing) with no contribution years at all', () => {
    const html = renderToStaticMarkup(<CapitalChart series={makeSeries({ contrib: [] })} />)
    expect(html).toBe('')
  })
})
