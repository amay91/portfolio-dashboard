import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrivacyNote } from './PrivacyNote'

// Real client render (not renderToStaticMarkup) — open/close and keyboard
// handling are side effects a static render never exercises. Same technique
// as Feedback.spec.tsx/ThemeToggle.spec.tsx. PrivacyNote is a controlled
// component (open/onOpenChange are props, not internal state), so tests
// assert on the callback being invoked rather than on internal state flips.
describe('PrivacyNote', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.unstubAllGlobals()
  })

  function renderNote(open: boolean, onOpenChange = vi.fn(), onOpenMethodNotes = vi.fn()) {
    const root = createRoot(container)
    act(() => {
      root.render(<PrivacyNote open={open} onOpenChange={onOpenChange} onOpenMethodNotes={onOpenMethodNotes} />)
    })
    return { root, onOpenChange, onOpenMethodNotes }
  }

  it('renders a floating Privacy button, closed by default', () => {
    renderNote(false)
    expect(container.querySelector('.privacy-corner button')?.textContent).toContain('Privacy')
    expect(container.querySelector('.feedback-overlay')).toBeNull()
  })

  it('calls onOpenChange(true) when the corner button is clicked', () => {
    const { onOpenChange } = renderNote(false)
    const openBtn = container.querySelector('.privacy-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it('shows the privacy statement when open, naming the exact allowlisted NAV sources (marketdata/egress.spec.ts is the enforcement)', () => {
    renderNote(true)
    const body = container.querySelector('.privacy-body')?.textContent || ''
    expect(body).toMatch(/never leaves this device/)
    expect(body).toContain('AMFI')
    expect(body).toContain('mf.captnemo.in')
    expect(body).toContain('mfapi.in')
    expect(body).toMatch(/folio numbers.*never sent/)
  })

  it('calls onOpenChange(false) on the close button', () => {
    const { onOpenChange } = renderNote(true)
    const closeBtn = container.querySelector('.feedback-close') as HTMLButtonElement
    act(() => {
      closeBtn.click()
    })
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('calls onOpenChange(false) on an overlay click', () => {
    const { onOpenChange } = renderNote(true)
    const overlay = container.querySelector('.feedback-overlay') as HTMLDivElement
    act(() => {
      overlay.click()
    })
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('calls onOpenChange(false) on Escape', () => {
    const { onOpenChange } = renderNote(true)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('clicking inside the modal card does not close it (only the overlay does)', () => {
    const { onOpenChange } = renderNote(true)
    const modal = container.querySelector('.feedback-modal') as HTMLDivElement
    act(() => {
      modal.click()
    })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('the "Method Notes" link closes the privacy modal and opens Method Notes', () => {
    const { onOpenChange, onOpenMethodNotes } = renderNote(true)
    const link = Array.from(container.querySelectorAll('.deck-ilink')).find((b) => b.textContent === 'Method Notes') as HTMLButtonElement
    act(() => {
      link.click()
    })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onOpenMethodNotes).toHaveBeenCalled()
  })

  it('omits the Method Notes footnote when no onOpenMethodNotes callback is supplied', () => {
    const root = createRoot(container)
    act(() => {
      root.render(<PrivacyNote open={true} onOpenChange={vi.fn()} />)
    })
    expect(container.querySelector('.privacy-footnote')).toBeNull()
  })
})
