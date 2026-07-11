import { describe, expect, it } from 'vitest'
import { clampHoverStep, hoverBands } from './interaction'

describe('hoverBands', () => {
  it('produces contiguous, edge-anchored bands for hover hit-testing', () => {
    const points = [{ x: 10 }, { x: 30 }, { x: 70 }]
    const bands = hoverBands(points, 0, 100)
    expect(bands[0].x0).toBe(0)
    expect(bands[bands.length - 1].x1).toBe(100)
    for (let i = 0; i < bands.length - 1; i++) expect(bands[i].x1).toBe(bands[i + 1].x0)
  })
})

describe('clampHoverStep', () => {
  it('starts at the first point when stepping right from no selection', () => {
    expect(clampHoverStep(null, 1, 5)).toBe(0)
  })
  it('starts at the last point when stepping left from no selection', () => {
    expect(clampHoverStep(null, -1, 5)).toBe(4)
  })
  it('clamps at the first and last index rather than wrapping or going out of bounds', () => {
    expect(clampHoverStep(0, -1, 5)).toBe(0)
    expect(clampHoverStep(4, 1, 5)).toBe(4)
  })
  it('returns 0 for an empty series', () => {
    expect(clampHoverStep(null, 1, 0)).toBe(0)
  })
})
