import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Feedback } from './Feedback'

// Real client render (not renderToStaticMarkup) — the modal's open/close,
// fetch submission, and keyboard handling are all side effects that a
// static render never exercises. Same technique as ThemeToggle.spec.tsx.
describe('Feedback', () => {
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

  function renderFeedback() {
    const root = createRoot(container)
    act(() => {
      root.render(<Feedback />)
    })
    return root
  }

  it('renders a floating Feedback button, closed by default', () => {
    renderFeedback()
    expect(container.querySelector('.feedback-corner button')?.textContent).toContain('Feedback')
    expect(container.querySelector('.feedback-overlay')).toBeNull()
  })

  it('opens the modal on click, with category select and message textarea', () => {
    renderFeedback()
    const openBtn = container.querySelector('.feedback-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    expect(container.querySelector('.feedback-overlay')).not.toBeNull()
    const select = container.querySelector('select') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toEqual(['Bug Report', 'Feature Request', 'General Feedback'])
    expect(container.querySelector('textarea')).not.toBeNull()
  })

  it('submits category + message to the feedback endpoint and shows a confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    renderFeedback()
    const openBtn = container.querySelector('.feedback-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    const select = container.querySelector('select') as HTMLSelectElement
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const nativeSelectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')!.set!
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      nativeSelectSetter.call(select, 'Bug Report')
      select.dispatchEvent(new Event('change', { bubbles: true }))
      nativeTextareaSetter.call(textarea, 'The chart is broken')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8766/api/feedback',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ category: 'Bug Report', message: 'The chart is broken' }),
      }),
    )
    expect(container.textContent).toContain('Thanks — your feedback has been sent.')
  })

  it('shows a specific, actionable message when the local server is not running', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    renderFeedback()
    const openBtn = container.querySelector('.feedback-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      nativeTextareaSetter.call(textarea, 'hello')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(container.querySelector('.feedback-error')?.textContent).toContain('cd server && npm install && npm start')
  })

  it('surfaces the server-provided error message on a validation failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Choose a valid category.' }), { status: 400 })))
    renderFeedback()
    const openBtn = container.querySelector('.feedback-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    const textarea = container.querySelector('textarea') as HTMLTextAreaElement
    const nativeTextareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
    act(() => {
      nativeTextareaSetter.call(textarea, 'hello')
      textarea.dispatchEvent(new Event('input', { bubbles: true }))
    })
    const form = container.querySelector('form') as HTMLFormElement
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(container.querySelector('.feedback-error')?.textContent).toBe('Choose a valid category.')
  })

  it('closes the modal on Cancel and on Escape', () => {
    renderFeedback()
    const openBtn = container.querySelector('.feedback-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    expect(container.querySelector('.feedback-overlay')).not.toBeNull()
    const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Cancel') as HTMLButtonElement
    act(() => {
      cancelBtn.click()
    })
    expect(container.querySelector('.feedback-overlay')).toBeNull()

    act(() => {
      openBtn.click()
    })
    expect(container.querySelector('.feedback-overlay')).not.toBeNull()
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(container.querySelector('.feedback-overlay')).toBeNull()
  })

  it('disables Submit while the message is empty', () => {
    renderFeedback()
    const openBtn = container.querySelector('.feedback-corner button') as HTMLButtonElement
    act(() => {
      openBtn.click()
    })
    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Submit') as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)
  })
})
