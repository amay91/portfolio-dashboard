import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { InfoTip } from './InfoTip'

// Real client render — open/close is stateful (click path for touch and
// keyboard; the mouse path is pure CSS :hover, which jsdom can't exercise).
// Same technique as Feedback.spec.tsx / HelpMenu.spec.tsx.
describe('InfoTip', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  function renderTip() {
    const root = createRoot(container)
    act(() => {
      root.render(<InfoTip text="XIRR is your personal annual growth rate." label="What does XIRR mean?" />)
    })
    return root
  }

  it('renders a labelled button with the tooltip text present but closed', () => {
    renderTip()
    const btn = container.querySelector('.infotip-btn') as HTMLButtonElement
    expect(btn.getAttribute('aria-label')).toBe('What does XIRR mean?')
    expect(btn.getAttribute('aria-expanded')).toBe('false')
    const pop = container.querySelector('.infotip-pop') as HTMLElement
    expect(pop.getAttribute('role')).toBe('tooltip')
    expect(pop.textContent).toContain('personal annual growth rate')
    expect(btn.getAttribute('aria-describedby')).toBe(pop.id)
    expect(container.querySelector('.infotip.open')).toBeNull()
  })

  it('toggles open on click and closes on Escape', () => {
    renderTip()
    const btn = container.querySelector('.infotip-btn') as HTMLButtonElement
    act(() => {
      btn.click()
    })
    expect(container.querySelector('.infotip.open')).not.toBeNull()
    expect(btn.getAttribute('aria-expanded')).toBe('true')

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(container.querySelector('.infotip.open')).toBeNull()
  })

  it('closes on click-outside', () => {
    renderTip()
    const btn = container.querySelector('.infotip-btn') as HTMLButtonElement
    act(() => {
      btn.click()
    })
    expect(container.querySelector('.infotip.open')).not.toBeNull()
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(container.querySelector('.infotip.open')).toBeNull()
  })

  it('does not let its click bubble to a parent (e.g. a sortable header)', () => {
    const root = createRoot(container)
    let parentClicks = 0
    act(() => {
      root.render(
        <div onClick={() => parentClicks++}>
          <InfoTip text="tip" label="tip label" />
        </div>,
      )
    })
    const btn = container.querySelector('.infotip-btn') as HTMLButtonElement
    act(() => {
      btn.click()
    })
    expect(parentClicks).toBe(0)
    expect(container.querySelector('.infotip.open')).not.toBeNull()
  })
})
