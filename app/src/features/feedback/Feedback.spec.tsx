import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Feedback } from './Feedback'
import { resolveFeedbackEndpoint } from './feedbackEndpoint'

// Endpoint-selection is a plain function (not a rendering concern), so it
// gets a plain unit spec rather than a stubbed-env + module-reset + render
// dance — see Feedback.tsx's comment on why the decision was pulled out of
// the module-level constant in the first place.
describe('resolveFeedbackEndpoint', () => {
  it('prefers an explicit edge URL over everything else, in dev or production', () => {
    expect(resolveFeedbackEndpoint('/api/feedback', true)).toBe('/api/feedback')
    expect(resolveFeedbackEndpoint('/api/feedback', false)).toBe('/api/feedback')
  })

  it('uses the local companion server when no edge URL is set and running in dev', () => {
    expect(resolveFeedbackEndpoint(undefined, true)).toBe('http://127.0.0.1:8766/api/feedback')
  })

  it('falls back to Formspree in a production build with no edge URL configured (GitHub Pages)', () => {
    expect(resolveFeedbackEndpoint(undefined, false)).toContain('https://formspree.io/f/')
  })
})

// Real client render (not renderToStaticMarkup) — the form's fetch
// submission and keyboard handling are all side effects that a static
// render never exercises. Same technique as ThemeToggle.spec.tsx.
//
// Feedback is now a fully controlled component (open/onClose — tasks.md
// U10, when it moved from its own floating corner button into HelpMenu's
// nav list) rather than owning its own open state, so these tests drive
// `open` from the outside via re-render, and assert against the onClose
// mock instead of an internal toggle button.
describe('Feedback', () => {
  let container: HTMLDivElement
  let root: Root
  let onClose: () => void

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    onClose = vi.fn<() => void>()
  })

  afterEach(() => {
    document.body.removeChild(container)
    vi.unstubAllGlobals()
  })

  function renderFeedback(open: boolean) {
    act(() => {
      root.render(<Feedback open={open} onClose={onClose} />)
    })
  }

  it('renders nothing when closed', () => {
    renderFeedback(false)
    expect(container.querySelector('.feedback-overlay')).toBeNull()
  })

  it('renders the modal with category select and message textarea when open', () => {
    renderFeedback(true)
    expect(container.querySelector('.feedback-overlay')).not.toBeNull()
    const select = container.querySelector('select') as HTMLSelectElement
    const options = Array.from(select.options).map((o) => o.value)
    expect(options).toEqual(['Bug Report', 'Feature Request', 'General Feedback'])
    expect(container.querySelector('textarea')).not.toBeNull()
  })

  it('submits category + message to the feedback endpoint and shows a confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    renderFeedback(true)
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
    renderFeedback(true)
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
    renderFeedback(true)
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

  it('calls onClose on Cancel, on Escape, and on overlay click', () => {
    renderFeedback(true)
    const cancelBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Cancel') as HTMLButtonElement
    act(() => {
      cancelBtn.click()
    })
    expect(onClose).toHaveBeenCalledTimes(1)

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onClose).toHaveBeenCalledTimes(2)

    const overlay = container.querySelector('.feedback-overlay') as HTMLDivElement
    act(() => {
      overlay.click()
    })
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('disables Submit while the message is empty', () => {
    renderFeedback(true)
    const submitBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Submit') as HTMLButtonElement
    expect(submitBtn.disabled).toBe(true)
  })
})
