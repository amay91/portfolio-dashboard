import { useEffect, useState } from 'react'

const DESKTOP_QUERY = '(min-width: 781px)'
const MIN_TOP = 16

// Mirrors `position: sticky` (starts level with `targetSelector`'s box on
// desktop, then stays in view once the page is scrolled past it) for
// elements that can't be true flow siblings of that target — e.g. a
// `position: fixed` corner overlay sitting in the page's margin outside a
// centered content column. Native sticky only has a meaningful "resting
// position" for actual flow elements, so this reproduces the same visual
// effect by measurement: on scroll/resize (rAF-throttled) and on a
// ResizeObserver watching document.body (catches reflow that isn't a
// scroll/resize event — e.g. EmptyState being replaced by the full
// dashboard), read the target's live `getBoundingClientRect().top`
// (already viewport-relative) and clamp to a 16px minimum.
//
// Desktop only (`window.matchMedia`, guarded for environments without it,
// e.g. jsdom) — returns `null` on narrow/mobile viewports rather than a
// number, so each caller's own CSS default applies untouched instead of
// this hook forcing one specific fallback value.
//
// Used by HelpMenu.tsx (tracks .deck-frame). Was also used by Feedback.tsx
// when Feedback was its own floating corner button (tasks.md U9); that
// button became a HelpMenu nav item in U10, so this hook is back to a
// single consumer — kept as its own file rather than inlined back into
// HelpMenu since a second corner-tracking need is plausible later (e.g. if
// ThemeToggle ever needs the same treatment).
export function useStickyToTarget(targetSelector: string): number | null {
  const [top, setTop] = useState<number | null>(null)

  useEffect(() => {
    function updateTop() {
      const isDesktop = typeof window.matchMedia === 'function' ? window.matchMedia(DESKTOP_QUERY).matches : true
      if (!isDesktop) {
        setTop(null)
        return
      }
      const target = document.querySelector(targetSelector)
      if (!target) {
        setTop(MIN_TOP)
        return
      }
      setTop(Math.max(MIN_TOP, target.getBoundingClientRect().top))
    }

    let raf = 0
    function scheduleUpdate() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(updateTop)
    }

    updateTop()
    window.addEventListener('scroll', scheduleUpdate, { passive: true })
    window.addEventListener('resize', scheduleUpdate)

    let observer: ResizeObserver | undefined
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate)
      observer.observe(document.body)
    }

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', scheduleUpdate)
      window.removeEventListener('resize', scheduleUpdate)
      observer?.disconnect()
    }
  }, [targetSelector])

  return top
}
