import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { HelpMenu } from './HelpMenu'

// Real client render — menu open/close, panel switching, Escape/click-outside
// are all side effects a static render never exercises. Same technique as
// Feedback.spec.tsx / ThemeToggle.spec.tsx.
describe('HelpMenu', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  function renderHelpMenu() {
    const root = createRoot(container)
    act(() => {
      root.render(<HelpMenu />)
    })
    return root
  }

  it('renders the three menu items and no open modal by default', () => {
    renderHelpMenu()
    const items = Array.from(container.querySelectorAll('.help-menu-list button')).map((b) => b.textContent)
    expect(items).toEqual(['Instructions', 'Privacy and Data', 'FAQ'])
    expect(container.querySelector('.help-overlay')).toBeNull()
  })

  it('opens each panel with the correct title and content', () => {
    renderHelpMenu()
    const clickItem = (label: string) => {
      const btn = Array.from(container.querySelectorAll('.help-menu-list button')).find((b) => b.textContent === label) as HTMLButtonElement
      act(() => {
        btn.click()
      })
    }

    clickItem('Instructions')
    expect(container.querySelector('#help-modal-title')?.textContent).toBe('Instructions')
    expect(container.querySelector('.help-thumb img')?.getAttribute('src')).toBe('/cams-instructions.png')

    clickItem('Privacy and Data')
    expect(container.querySelector('#help-modal-title')?.textContent).toBe('Privacy and Data')
    expect(container.textContent).toContain('your statement never leaves your device')

    clickItem('FAQ')
    expect(container.querySelector('#help-modal-title')?.textContent).toBe('FAQ')
    expect(container.textContent).toContain('What is XIRR')
  })

  it('closes the modal on the close button and on Escape', () => {
    renderHelpMenu()
    const openBtn = Array.from(container.querySelectorAll('.help-menu-list button')).find((b) => b.textContent === 'FAQ') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    expect(container.querySelector('.help-overlay')).not.toBeNull()

    const closeBtn = container.querySelector('.feedback-close') as HTMLButtonElement
    act(() => {
      closeBtn.click()
    })
    expect(container.querySelector('.help-overlay')).toBeNull()

    act(() => {
      openBtn.click()
    })
    expect(container.querySelector('.help-overlay')).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(container.querySelector('.help-overlay')).toBeNull()
  })

  it('opens the screenshot lightbox from Instructions and closes it on click', () => {
    renderHelpMenu()
    const openBtn = Array.from(container.querySelectorAll('.help-menu-list button')).find((b) => b.textContent === 'Instructions') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    const thumb = container.querySelector('.help-thumb') as HTMLButtonElement
    act(() => {
      thumb.click()
    })
    const lightbox = container.querySelector('.help-lightbox') as HTMLDivElement
    expect(lightbox).not.toBeNull()
    act(() => {
      lightbox.click()
    })
    expect(container.querySelector('.help-lightbox')).toBeNull()
  })

  it('toggles the mobile menu list open and closes it on click-outside', () => {
    renderHelpMenu()
    const toggle = container.querySelector('.help-menu-toggle') as HTMLButtonElement
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    act(() => {
      toggle.click()
    })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(container.querySelector('.help-menu-list.open')).not.toBeNull()

    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(container.querySelector('.help-menu-list.open')).toBeNull()
  })
})
