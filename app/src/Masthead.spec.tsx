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

  it('shows "Sample Portfolio Summary" and the sample-data callout for the sample portfolio with no investor name', () => {
    const html = renderToStaticMarkup(<Masthead pf={makePortfolio()} investorName={null} isSample={true} onSaveAsPng={noop} savingPng={false} />)
    expect(html).toContain('Sample Portfolio Summary')
    expect(html).toContain('deck-sample-note')
    expect(html).toContain('This is example data')
  })

  it('falls back to "Your Portfolio Summary" for a real upload with no extractable name, shows "Statement values" when not live, and omits the sample-data callout', () => {
    const html = renderToStaticMarkup(<Masthead pf={makePortfolio({ live: false, liveMatched: 0 })} investorName={null} isSample={false} onSaveAsPng={noop} savingPng={false} />)
    expect(html).toContain('Your Portfolio Summary')
    expect(html).toContain('Statement values')
    expect(html).not.toContain('deck-sample-note')
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
