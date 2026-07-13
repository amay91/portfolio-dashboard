import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { buildCommentaryContent, commentaryBand } from './commentaryText'

// buildCommentaryContent returns JSX (review item C6, no longer an HTML
// string), so tests render it to static markup first — same technique as
// WorthALook.spec.tsx — and assert against that string.
function renderCommentary(...args: Parameters<typeof buildCommentaryContent>) {
  return renderToStaticMarkup(<>{buildCommentaryContent(...args)}</>)
}

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

// buildCommentaryContent's second parameter is a target retirement AGE (not
// a calendar year) — years-to-retirement is just the age difference, so
// these tests don't need to know today's date at all.
describe('buildCommentaryContent', () => {
  it('produces materially different guidance for a 30-year-old vs a 50-year-old (docs/DECISIONS.md invariant)', () => {
    const young = renderCommentary(30, 60, null) // 30 years to retirement
    const old = renderCommentary(50, 60, null) // 10 years to retirement
    expect(young).not.toBe(old)
    expect(young).toContain('early accumulation')
    expect(old).toContain('late accumulation')
  })

  it('shows the empty-state message when there is no portfolio loaded', () => {
    const html = renderCommentary(30, 60, null)
    expect(html).toContain('commentary-empty')
  })

  it('escapes a statement-derived fund name before rendering it (React auto-escapes JSX text)', () => {
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
    } as unknown as Parameters<typeof buildCommentaryContent>[2]
    const html = renderCommentary(60, 62, pf)
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
    } as unknown as Parameters<typeof buildCommentaryContent>[2]
    const html = renderCommentary(60, 62, pf)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;/div&gt;&lt;script&gt;')
  })

  it('regression: the portfolio-assessment line never doubles the ₹ symbol (inr() already includes it)', () => {
    const pf = {
      totalValue: 4324678,
      alloc: { equity: 2633984, debt: 561808, cash: 518961, other: 605194 },
      geo: [{ country: 'India', pct: 0.85 }],
      funds: [{ active: true, marketValue: 900000, name: 'Some Fund - Direct Growth' }],
    } as unknown as Parameters<typeof buildCommentaryContent>[2]
    const html = renderCommentary(40, 60, pf)
    expect(html).not.toContain('₹₹')
    expect(html).toContain('Today your ₹43,24,678')
  })

  it('states the target retirement age, not a calendar year', () => {
    const html = renderCommentary(45, 65, null)
    expect(html).toContain('targeting retirement at age <b>65</b>')
    expect(html).toContain('about <b>20 years</b> away')
  })

  // Corpus projection (review item A3).
  it('shows a corpus projection when there is enough history to infer a contribution rate', () => {
    const pf = {
      totalValue: 1000000,
      totalCost: 800000,
      inceptionYears: 4,
      allTimeReturn: 0.12,
      alloc: { equity: 700000, debt: 200000, cash: 100000, other: 0 },
      geo: [{ country: 'India', pct: 0.85 }],
      funds: [{ active: true, marketValue: 900000, name: 'Some Fund - Direct Growth' }],
    } as unknown as Parameters<typeof buildCommentaryContent>[2]
    const html = renderCommentary(35, 60, pf)
    expect(html).toContain('Where this could take you')
    expect(html).toContain('co-projection')
    expect(html).toContain('Conservative')
  })

  it('omits the corpus projection when there is too little history to infer a contribution rate', () => {
    const pf = {
      totalValue: 1000000,
      totalCost: 950000,
      inceptionYears: 0.2,
      alloc: { equity: 700000, debt: 200000, cash: 100000, other: 0 },
      geo: [{ country: 'India', pct: 0.85 }],
      funds: [{ active: true, marketValue: 900000, name: 'Some Fund - Direct Growth' }],
    } as unknown as Parameters<typeof buildCommentaryContent>[2]
    const html = renderCommentary(35, 60, pf)
    expect(html).not.toContain('Where this could take you')
  })

  it('omits the corpus projection at the target retirement age (z=0, defensive — the UI never allows this)', () => {
    const pf = {
      totalValue: 1000000,
      totalCost: 800000,
      inceptionYears: 4,
      allTimeReturn: 0.12,
      alloc: { equity: 700000, debt: 200000, cash: 100000, other: 0 },
      geo: [{ country: 'India', pct: 0.85 }],
      funds: [{ active: true, marketValue: 900000, name: 'Some Fund - Direct Growth' }],
    } as unknown as Parameters<typeof buildCommentaryContent>[2]
    const html = renderCommentary(60, 60, pf)
    expect(html).not.toContain('Where this could take you')
  })
})
