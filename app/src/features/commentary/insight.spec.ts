import { describe, expect, it } from 'vitest'
import { buildInsight } from './insight'
import type { Portfolio } from '../../engine/types'

function pf(alloc: Portfolio['alloc'], totalValue: number): Portfolio {
  return { totalValue, alloc } as Portfolio
}

describe('buildInsight', () => {
  it('reads a placeholder when there is no value yet', () => {
    expect(buildInsight(pf({ equity: 0, debt: 0, cash: 0, other: 0 }, NaN))).toMatch(/Once your statement loads/)
    expect(buildInsight(pf({ equity: 0, debt: 0, cash: 0, other: 0 }, 0))).toMatch(/Once your statement loads/)
  })

  it('describes a growth-tilted portfolio with ballast', () => {
    const text = buildInsight(pf({ equity: 75, debt: 17, cash: 6, other: 2 }, 100))
    expect(text).toContain('growth-tilted')
    expect(text).toContain('75% equity')
    expect(text).toContain('17% debt')
    expect(text).toContain('6% cash')
    expect(text).not.toContain('other')
  })

  it('describes a balanced portfolio', () => {
    const text = buildInsight(pf({ equity: 55, debt: 30, cash: 10, other: 5 }, 100))
    expect(text).toContain('balanced')
    expect(text).toContain('55% equity')
  })

  it('describes a conservative, mostly-debt portfolio', () => {
    const text = buildInsight(pf({ equity: 15, debt: 80, cash: 5, other: 0 }, 100))
    expect(text).toContain('capital-preservation focused')
    expect(text).toContain('15% equity')
    expect(text).not.toContain('other')
  })

  it('omits any ballast bucket under 5%', () => {
    const text = buildInsight(pf({ equity: 97, debt: 1, cash: 1, other: 1 }, 100))
    expect(text).toContain('97% equity')
    expect(text).not.toContain('debt')
    expect(text).not.toContain('cash')
  })
})
