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
  let deckFrame: HTMLDivElement | null

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
    deckFrame = null
  })

  afterEach(() => {
    document.body.removeChild(container)
    document.body.removeChild(target)
    document.body.removeChild(target2)
    if (deckFrame) document.body.removeChild(deckFrame)
  })

  // No `.deck-frame` in the DOM at all (the default, unless a test calls
  // this) is what makes Spotlight fall into its "no room outside the
  // dashboard" placement — the same code path real mobile viewports hit,
  // since jsdom's `getBoundingClientRect()` is all-zeros without a real
  // layout engine. Tests that need to exercise the *other* path
  // ("desktop", room to place outside) call this to stub a wide one in.
  function stubWideDeckFrame() {
    deckFrame = document.createElement('div')
    deckFrame.className = 'deck-frame'
    deckFrame.getBoundingClientRect = () => new DOMRect(800, 100, 1080, 400)
    document.body.appendChild(deckFrame)
  }

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

  // Desktop mode: room to place the popover outside the dashboard
  // (.deck-frame stubbed wide), so the target itself stays fully usable —
  // clicking it doesn't end the tour, matching how the popover never
  // overlaps it in this mode. The close button, correspondingly, ends the
  // whole thing (there's no separate "hide popover only" state to have).
  describe('desktop mode (room to place outside the dashboard)', () => {
    it('does not dismiss on a click inside the highlighted target itself', async () => {
      stubWideDeckFrame()
      const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10))
      })
      act(() => {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })
      expect(onDismiss).not.toHaveBeenCalled()
    })

    it('the close button calls onDismiss (both popover and highlight end)', () => {
      stubWideDeckFrame()
      const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
      const closeBtn = container.querySelector('.spotlight-close') as HTMLButtonElement
      act(() => {
        closeBtn.click()
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  // Mobile mode (default in these tests — no `.deck-frame` means no room
  // to sit outside it, the same code path a real narrow viewport hits):
  // the popover is centered over the target instead, so the "X" only
  // hides the popover — the highlight stays lit until the user taps the
  // (now-reachable) target itself or taps elsewhere on the dashboard.
  describe('mobile mode (centered over the target, no room outside)', () => {
    it('the close button hides only the popover, leaving the target highlighted', () => {
      const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
      const closeBtn = container.querySelector('.spotlight-close') as HTMLButtonElement
      act(() => {
        closeBtn.click()
      })
      expect(onDismiss).not.toHaveBeenCalled()
      expect(container.querySelector('.spotlight-pop')).toBeNull()
      expect(target.classList.contains('spotlight-target')).toBe(true)
    })

    it('a click on the target dismisses the highlight (unlike desktop mode)', async () => {
      const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10))
      })
      act(() => {
        target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })

    it('after closing via the X, a click elsewhere still dismisses the (still-lit) highlight', async () => {
      const { onDismiss } = renderSpotlight({ targetIds: ['spotlight-test-target'], label: 'x', body: 'y' })
      const closeBtn = container.querySelector('.spotlight-close') as HTMLButtonElement
      act(() => {
        closeBtn.click()
      })
      expect(target.classList.contains('spotlight-target')).toBe(true)
      await act(async () => {
        await new Promise((r) => setTimeout(r, 10))
      })
      act(() => {
        document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }))
      })
      expect(onDismiss).toHaveBeenCalledTimes(1)
    })
  })

  it('calls onDismiss immediately if none of the target ids exist in the DOM', () => {
    const { onDismiss } = renderSpotlight({ targetIds: ['does-not-exist'], label: 'x', body: 'y' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
