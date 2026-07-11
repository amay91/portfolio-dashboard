import { describe, expect, it } from 'vitest'
import { buildCommentaryHTML, commentaryBand } from './commentaryText'

describe('commentaryBand', () => {
  it('recommends a materially higher equity band for a 30-year horizon than a 5-year one', () => {
    const long = commentaryBand(35, 30) // 30 years to retirement
    const short = commentaryBand(55, 5) // 5 years to retirement
    expect(long.lo).toBeGreaterThan(short.hi)
  })

  it("Bogle's age-in-bonds cross-check is clamped to [25,75] equity", () => {
    expect(commentaryBand(10, 50).bogleEq).toBe(75) // young: clamp to 75, not 90
    expect(commentaryBand(90, -20).bogleEq).toBe(25) // old: clamp to 25, not 10
    expect(commentaryBand(40, 10).bogleEq).toBe(60) // 100-40=60, within band
  })
})

// buildCommentaryHTML's second parameter is a target retirement AGE (not a
// calendar year) — years-to-retirement is just the age difference, so these
// tests don't need to know today's date at all.
describe('buildCommentaryHTML', () => {
  it('produces materially different guidance for a 30-year-old vs a 50-year-old (docs/DECISIONS.md invariant)', () => {
    const young = buildCommentaryHTML(30, 60, null) // 30 years to retirement
    const old = buildCommentaryHTML(50, 60, null) // 10 years to retirement
    expect(young).not.toBe(old)
    expect(young).toContain('early accumulation')
    expect(old).toContain('late accumulation')
  })

  it('shows the empty-state message when there is no portfolio loaded', () => {
    const html = buildCommentaryHTML(30, 60, null)
    expect(html).toContain('commentary-empty')
  })

  it('escapes a statement-derived fund name before interpolating it into the HTML', () => {
    const pf = {
      totalValue: 1000000,
      alloc: { equity: 100000, debt: 800000, cash: 100000, other: 0 }, // low equity -> triggers concentration note path
      geo: [{ country: 'India', pct: 1 }],
      funds: [
        {
          active: true,
          marketValue: 500000, // > 35% of total -> triggers the concentration note
          name: '<img src=x onerror=alert(1)> Fund - Direct Growth',
        },
      ],
    } as unknown as Parameters<typeof buildCommentaryHTML>[2]
    const html = buildCommentaryHTML(60, 62, pf)
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  // S2 audit (2026-07-05): a second, distinct payload shape — a closing-tag
  // breakout attempt rather than a self-closing tag — through the same sink.
  it('escapes a </div><script> breakout attempt in a statement-derived fund name (S2)', () => {
    const pf = {
      totalValue: 1000000,
      alloc: { equity: 100000, debt: 800000, cash: 100000, other: 0 },
      geo: [{ country: 'India', pct: 1 }],
      funds: [
        {
          active: true,
          marketValue: 500000,
          name: '</div><script>alert(document.cookie)</script> Fund - Direct Growth',
        },
      ],
    } as unknown as Parameters<typeof buildCommentaryHTML>[2]
    const html = buildCommentaryHTML(60, 62, pf)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;/div&gt;&lt;script&gt;')
  })

  it('regression: the portfolio-assessment line never doubles the ₹ symbol (inr() already includes it)', () => {
    const pf = {
      totalValue: 4324678,
      alloc: { equity: 2633984, debt: 561808, cash: 518961, other: 605194 },
      geo: [{ country: 'India', pct: 0.85 }],
      funds: [{ active: true, marketValue: 900000, name: 'Some Fund - Direct Growth' }],
    } as unknown as Parameters<typeof buildCommentaryHTML>[2]
    const html = buildCommentaryHTML(40, 60, pf)
    expect(html).not.toContain('₹₹')
    expect(html).toContain('Today your ₹43,24,678')
  })

  it('states the target retirement age, not a calendar year', () => {
    const html = buildCommentaryHTML(45, 65, null)
    expect(html).toContain('targeting retirement at age <b>65</b>')
    expect(html).toContain('about <b>20 years</b> away')
  })
})
