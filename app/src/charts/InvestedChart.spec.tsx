import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { InvestedChart } from './InvestedChart'
import { makeSeries } from '../testFixtures'

describe('InvestedChart', () => {
  it('renders the SVG line chart and legend for a multi-year series', () => {
    const html = renderToStaticMarkup(<InvestedChart series={makeSeries()} latest={{ value: 500000, cost: 400000 }} />)
    expect(html).toContain('chart-svg')
    expect(html).toContain('Portfolio value')
    expect(html).toContain('Amount invested')
  })

  it('renders nothing (not throwing) with fewer than 2 line points', () => {
    const html = renderToStaticMarkup(<InvestedChart series={makeSeries({ line: [{ year: 2024, ts: +new Date('2024-01-01'), invested: 1000, value: 1000 }] })} latest={{ value: 1000, cost: 1000 }} />)
    expect(html).toBe('')
  })
})
