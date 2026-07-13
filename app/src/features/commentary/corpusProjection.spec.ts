import { describe, expect, it } from 'vitest'
import { projectCorpus } from './corpusProjection'
import { makePortfolio } from '../../testFixtures'

describe('projectCorpus', () => {
  it('returns null at or past retirement', () => {
    expect(projectCorpus(makePortfolio(), 0)).toBeNull()
    expect(projectCorpus(makePortfolio(), -2)).toBeNull()
  })

  it('returns null with no portfolio value', () => {
    expect(projectCorpus(makePortfolio({ totalValue: 0 }), 20)).toBeNull()
  })

  it('returns null with too little history to infer a contribution rate', () => {
    expect(projectCorpus(makePortfolio({ inceptionYears: 0.2 }), 20)).toBeNull()
  })

  it('projects a higher future value for a longer horizon, all else equal', () => {
    const pf = makePortfolio({ totalValue: 1000000, totalCost: 800000, inceptionYears: 4, allTimeReturn: 0.12 })
    const near = projectCorpus(pf, 5)!
    const far = projectCorpus(pf, 25)!
    expect(far.expectedFV).toBeGreaterThan(near.expectedFV)
  })

  it('expected scenario is always >= conservative scenario', () => {
    const pf = makePortfolio({ totalValue: 1000000, totalCost: 800000, inceptionYears: 4, allTimeReturn: 0.15 })
    const proj = projectCorpus(pf, 15)!
    expect(proj.expectedRate).toBeGreaterThanOrEqual(proj.conservativeRate)
    expect(proj.expectedFV).toBeGreaterThanOrEqual(proj.conservativeFV)
  })

  it('clamps an implausibly high historical CAGR rather than extrapolating it forward', () => {
    const pf = makePortfolio({ totalValue: 1000000, totalCost: 500000, inceptionYears: 1, allTimeReturn: 0.9 })
    const proj = projectCorpus(pf, 20)!
    expect(proj.expectedRate).toBeLessThanOrEqual(0.16)
  })

  it('clamps an implausibly low/negative historical CAGR to a sane floor', () => {
    const pf = makePortfolio({ totalValue: 1000000, totalCost: 1200000, inceptionYears: 2, allTimeReturn: -0.3 })
    const proj = projectCorpus(pf, 20)!
    expect(proj.expectedRate).toBeGreaterThanOrEqual(0.04)
  })

  it('conservative rate never exceeds a low expected rate', () => {
    const pf = makePortfolio({ totalValue: 1000000, totalCost: 900000, inceptionYears: 5, allTimeReturn: 0.03 })
    const proj = projectCorpus(pf, 10)!
    expect(proj.conservativeRate).toBeLessThanOrEqual(proj.expectedRate)
  })

  it('matches the ordinary-annuity formula by hand for a simple round-number case', () => {
    // value=100, contribution=10/yr, rate=10%, 2 years:
    // FV = 100*1.1^2 + 10*((1.1^2-1)/0.1) = 121 + 21 = 142
    const pf = makePortfolio({ totalValue: 100, totalCost: 10, inceptionYears: 1, allTimeReturn: 0.1 })
    const proj = projectCorpus(pf, 2)!
    expect(proj.annualContribution).toBeCloseTo(10, 6)
    expect(proj.expectedFV).toBeCloseTo(142, 6)
  })
})
