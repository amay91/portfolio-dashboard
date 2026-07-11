import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RollingChart } from './RollingChart'
import { makeSeries } from '../testFixtures'

describe('RollingChart', () => {
  it('renders the expanding + rolling legend and the SVG line chart', () => {
    const html = renderToStaticMarkup(<RollingChart series={makeSeries()} />)
    expect(html).toContain('chart-svg')
    expect(html).toContain('Rolling 1-year return')
    expect(html).toContain('since-inception')
  })

  it('renders nothing (not throwing) with fewer than 2 rolling points', () => {
    const html = renderToStaticMarkup(<RollingChart series={makeSeries({ rolling: [{ t: 1, ts: +new Date('2022-01-01'), ret: 0.1, expanding: false }] })} />)
    expect(html).toBe('')
  })
})
