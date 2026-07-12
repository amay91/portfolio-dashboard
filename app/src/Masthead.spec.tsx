import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Masthead } from './Masthead'
import { makePortfolio } from './testFixtures'

const noop = () => {}

describe('Masthead', () => {
  it('shows a first-name personalised title and "Live NAV" when the portfolio is live-matched', () => {
    const html = renderToStaticMarkup(<Masthead pf={makePortfolio()} investorName="Jane Doe" isSample={false} onSaveAsPng={noop} savingPng={false} />)
    expect(html).toContain("Jane&#x27;s Portfolio Summary")
    expect(html).toContain('Live NAV')
  })

  it('shows "Sample Portfolio Summary" for the sample portfolio with no investor name', () => {
    const html = renderToStaticMarkup(<Masthead pf={makePortfolio()} investorName={null} isSample={true} onSaveAsPng={noop} savingPng={false} />)
    expect(html).toContain('Sample Portfolio Summary')
  })

  it('falls back to "Your Portfolio Summary" for a real upload with no extractable name, and shows "Statement values" when not live', () => {
    const html = renderToStaticMarkup(<Masthead pf={makePortfolio({ live: false, liveMatched: 0 })} investorName={null} isSample={false} onSaveAsPng={noop} savingPng={false} />)
    expect(html).toContain('Your Portfolio Summary')
    expect(html).toContain('Statement values')
  })

  it('shows a "Save as PNG" button that calls onSaveAsPng, and "Saving…" while in progress', () => {
    const onSaveAsPng = vi.fn()
    const html = renderToStaticMarkup(<Masthead pf={makePortfolio()} investorName={null} isSample={true} onSaveAsPng={onSaveAsPng} savingPng={false} />)
    expect(html).toContain('Save as PNG')

    const savingHtml = renderToStaticMarkup(<Masthead pf={makePortfolio()} investorName={null} isSample={true} onSaveAsPng={onSaveAsPng} savingPng={true} />)
    expect(savingHtml).toContain('Saving…')
    expect(savingHtml).toContain('deck-mast-pngbtn')
  })
})
