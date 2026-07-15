import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MyDetailsPanel } from './MyDetailsPanel'
import { EMPTY_MY_DETAILS } from './myDetails'
import type { MyDetails } from './myDetails'

// Real client render (same technique as HelpMenu.spec.tsx) — typing,
// clipboard writes, and the eye toggle are all side effects a static
// render never exercises.
describe('MyDetailsPanel', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    document.body.removeChild(container)
  })

  function renderPanel(initial: MyDetails = EMPTY_MY_DETAILS) {
    let value = initial
    const root = createRoot(container)
    const rerender = () => {
      act(() => {
        root.render(<MyDetailsPanel value={value} onChange={(next) => (value = next)} />)
      })
    }
    rerender()
    return {
      type(id: string, text: string) {
        const input = container.querySelector(`#${id}`) as HTMLInputElement
        const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
        act(() => {
          nativeSetter.call(input, text)
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
        rerender()
      },
      getValue: () => value,
    }
  }

  it('starts with both Copy buttons disabled when empty', () => {
    renderPanel()
    const copyBtns = Array.from(container.querySelectorAll('.mydetails-copy')) as HTMLButtonElement[]
    expect(copyBtns).toHaveLength(2)
    expect(copyBtns.every((b) => b.disabled)).toBe(true)
  })

  it('enables Copy once a field has text', () => {
    const panel = renderPanel()
    panel.type('mydetails-email', 'me@example.com')
    panel.type('mydetails-password', 'abc12345')
    expect(panel.getValue().email).toBe('me@example.com')
    expect(panel.getValue().password).toBe('abc12345')
    const copyBtns = Array.from(container.querySelectorAll('.mydetails-copy')) as HTMLButtonElement[]
    expect(copyBtns.every((b) => !b.disabled)).toBe(true)
  })

  it('copies the field via the Clipboard API and shows a transient "Copied" label', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const panel = renderPanel()
    panel.type('mydetails-email', 'me@example.com')

    const copyBtn = container.querySelectorAll('.mydetails-copy')[0] as HTMLButtonElement
    expect(copyBtn.textContent).toBe('Copy')
    await act(async () => {
      copyBtn.click()
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledWith('me@example.com')
    expect(copyBtn.textContent).toBe('Copied')
  })

  it('password input defaults to masked (type=password) and toggles visible via the eye button', () => {
    renderPanel()
    const passwordInput = container.querySelector('#mydetails-password') as HTMLInputElement
    expect(passwordInput.type).toBe('password')
    const eyeBtn = container.querySelector('.mydetails-eye') as HTMLButtonElement
    act(() => {
      eyeBtn.click()
    })
    expect((container.querySelector('#mydetails-password') as HTMLInputElement).type).toBe('text')
  })

  it('the email field has no eye toggle (only the password needs masking)', () => {
    renderPanel()
    expect(container.querySelectorAll('.mydetails-eye')).toHaveLength(1)
  })
})
