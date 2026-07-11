import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ThemeToggle } from './ThemeToggle'

// Real client-side render (not renderToStaticMarkup) so the click handler and
// useEffect actually run — this is what drives document.documentElement's
// data-theme attribute, which every color/font in tokens.css reads. See
// docs/DECISIONS.md "Dark/Light theme toggle".
describe('ThemeToggle', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    localStorage.clear()
    document.documentElement.dataset.theme = ''
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
    document.documentElement.dataset.theme = ''
    localStorage.clear()
  })

  function renderToggle() {
    const root = createRoot(container)
    act(() => {
      root.render(<ThemeToggle />)
    })
    return { root, button: container.querySelector('button')! }
  }

  it('defaults to dark (Terminal Deck) with no stored preference, showing "Light Mode" (the mode a click switches to)', () => {
    const { button } = renderToggle()
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(button.textContent).toBe('Light Mode')
  })

  it('reads a stored preference on mount instead of the default', () => {
    localStorage.setItem('theme', 'light')
    const { button } = renderToggle()
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(button.textContent).toBe('Dark Mode')
  })

  it('clicking flips the attribute, persists to localStorage, and swaps the label to the new destination mode', () => {
    const { button } = renderToggle()
    expect(document.documentElement.dataset.theme).toBe('dark')
    act(() => {
      button.click()
    })
    expect(document.documentElement.dataset.theme).toBe('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(button.textContent).toBe('Dark Mode')
    act(() => {
      button.click()
    })
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(button.textContent).toBe('Light Mode')
  })
})
