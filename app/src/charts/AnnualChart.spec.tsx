import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { AnnualChart } from './AnnualChart'
import { makeSeries } from '../testFixtures'

describe('AnnualChart', () => {
  it('renders one bar per calendar year with a return', () => {
    const html = renderToStaticMarkup(<AnnualChart series={makeSeries()} />)
    expect(html).toContain('chart-svg')
    expect(html).toContain('Return %')
  })

  it('renders nothing (not throwing) when no year has a known return', () => {
    const html = renderToStaticMarkup(<AnnualChart series={makeSeries({ annual: [{ year: 2024, ret: null, partial: false }] })} />)
    expect(html).toBe('')
  })
})
