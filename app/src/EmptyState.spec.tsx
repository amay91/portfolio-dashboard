import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('shows a loading spinner and message when there is no error', () => {
    const html = renderToStaticMarkup(<EmptyState status={{ message: 'Sample statement — fetching latest NAVs…', isErr: false }} />)
    expect(html).toContain('loading-spinner')
    expect(html).toContain('Sample statement — fetching latest NAVs…')
    expect(html).not.toContain('empty-state-icon err')
  })

  it('shows a distinct error icon and message when status.isErr is true', () => {
    const html = renderToStaticMarkup(<EmptyState status={{ message: 'Could not load the sample statement.', isErr: true }} />)
    expect(html).toContain('empty-state-icon err')
    expect(html).toContain('Could not load the sample statement.')
    expect(html).not.toContain('loading-spinner')
  })

  it('falls back to a generic loading message with no status at all (very first render)', () => {
    const html = renderToStaticMarkup(<EmptyState status={null} />)
    expect(html).toContain('Loading your statement…')
  })
})
