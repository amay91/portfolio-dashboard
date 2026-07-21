import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Spotlight } from './Spotlight'
import type { SpotlightRequest } from './Spotlight'

// Real client render (same technique as HelpMenu.spec.tsx) — the highlight
// class, popover positioning, and dismiss listeners are all side effects a
// static render never exercises. Real target elements are added to the DOM
// (outside the render container, mirroring how the real dashboard's target
// elements live outside HelpMenu/Spotlight's own subtree) since Spotlight
// looks them up via `document.getElementById`, not props/refs.
describe('Spotlight', () => {
  let container: HTMLDivElement
  let target: HTMLDivElement
  let target2: HTMLDivElement

  beforeEach(() => {
    ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    target = document.createElement('div')
    target.id = 'spotlight-test-target'
    target.scrollIntoView = vi.fn()
    document.body.appendChild(target)
    target2 = document.createElement('div')
    target2.id = 'spotlight-test-target-2'
    target2.scrollIntoView = vi.fn()
    document.body.appendChild(target2)
  })

  afterEach(() => {
    document.body.removeChild(container)
    document.body.removeChild(target)
    document.body.removeChild(target2)
  })

  function renderSpotlight(request: SpotlightRequest | null, onDismiss = vi.fn()) {
    const root = createRoot(container)
    act(() => {
      root.render(<Spotlight request={request} onDismiss={onDismiss} />)
    })
    return { root, onDismiss }
  }

  it('renders nothing when request is null', () => {
    renderSpotlight(null)
    expect(container.querySelector('.spotlight-pop')).toBeNull()
  })

  it('highlights the target element and shows the label/body in a popover', () => {
    renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'Value vs Invested chart.', body: 'How your money has grown…' })
    expect(target.classList.contains('spotlight-target')).toBe(true)
    expect(container.querySelector('.spotlight-label')?.textContent).toBe('Value vs Invested chart.')
    expect(container.querySelector('.spotlight-body')?.textContent).toBe('How your money has grown…')
    expect(target.scrollIntoView).toHaveBeenCalled()
  })

  it('highlights every id in a multi-target request', () => {
    renderSpotlight({ targetIds: ['spotlight-test-target', 'spotlight-test-target-2'], label: 'Top holdings and Allocation.', body: '…' })
    expect(target.classList.contains('spotlight-target')).toBe(true)
    expect(target2.classList.contains('spotlight-target')).toBe(true)
  })

  it('removes the highlight class when dismissed (request becomes null)', () => {
    const root = createRoot(container)
    const onDismiss = vi.fn()
    act(() => {
      root.render(<Spotlight request={{ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' }} onDismiss={onDismiss} />)
    })
    expect(target.classList.contains('spotlight-target')).toBe(true)
    act(() => {
      root.render(<Spotlight request={null} onDismiss={onDismiss} />)
    })
    expect(target.classList.contains('spotlight-target')).toBe(false)
  })

  it('calls onDismiss on Escape', () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss on a click outside the popover and the target', async () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
    // The click-outside listener is deliberately deferred by one macrotask
    // (see Spotlight.tsx) so the very click that opened it doesn't
    // instantly close it — wait past that before dispatching the test click.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('does not dismiss on a click inside the highlighted target itself', async () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    act(() => {
      target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('does not dismiss on a click inside the popover itself', async () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })
    const pop = container.querySelector('.spotlight-pop') as HTMLDivElement
    act(() => {
      pop.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
    })
    expect(onDismiss).not.toHaveBeenCalled()
  })

  it('the close button calls onDismiss', () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
    const closeBtn = container.querySelector('.spotlight-close') as HTMLButtonElement
    act(() => {
      closeBtn.click()
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('calls onDismiss immediately if none of the target ids exist in the DOM', () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['does-not-exist'], label: 'x', body: 'y' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
