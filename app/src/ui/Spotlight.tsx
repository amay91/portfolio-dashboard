import { useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export interface SpotlightRequest {
  targetIds: string[]
  label: ReactNode
  body: ReactNode
}

const MARGIN = 12
const POP_WIDTH = 300

// "Reading the Dashboard" navigation: clicking one of that panel's 5 items
// (ReadingDashboardContent.tsx) closes the help modal, scrolls to and
// briefly highlights the matching live dashboard element(s), and shows the
// same explanatory text next to it — so a reader can see exactly which part
// of the page an explanation refers to, in place, rather than having to
// mentally map help-menu prose onto the dashboard themselves.
//
// Deliberately imperative DOM lookup (`document.getElementById`) rather than
// prop-threading refs down through every targetable component — the target
// set (KPI rail, a chart card, a table, the Portfolio Analysis button row,
// the Commentary section) spans several unrelated component trees several
// levels deep, and each already has (or now has) a stable `id` for exactly
// this purpose; a ref-threading alternative would mean touching every one of
// those components' prop signatures instead of just adding one attribute
// each. `targetIds` supports more than one id so a single explanation (e.g.
// "Top holdings and Allocation", two separate cards) can highlight both at
// once, sharing one popover positioned against their combined bounding box.
export function Spotlight({ request, onDismiss }: { request: SpotlightRequest | null; onDismiss: () => void }) {
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!request) {
      setRect(null)
      setPos(null)
      return
    }
    const targets = request.targetIds.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el)
    if (!targets.length) {
      onDismiss()
      return
    }
    targets.forEach((el) => el.classList.add('spotlight-target'))

    function measure() {
      const rects = targets.map((el) => el.getBoundingClientRect())
      const left = Math.min(...rects.map((r) => r.left))
      const top = Math.min(...rects.map((r) => r.top))
      const right = Math.max(...rects.map((r) => r.right))
      const bottom = Math.max(...rects.map((r) => r.bottom))
      setRect(new DOMRect(left, top, right - left, bottom - top))
    }

    measure()
    // Scrolling the very first target into view is enough to bring the
    // whole highlighted group roughly into frame even when there are two
    // (item 3's holdings+allocation pair sit side by side at desktop widths,
    // stacked on mobile — either way the first one anchors the scroll).
    targets[0].scrollIntoView({ behavior: 'smooth', block: 'center' })

    let raf = 0
    function onScrollOrResize() {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    // Re-measures for the whole duration of a smooth scroll, not just once
    // at the end — the rAF throttle keeps this cheap either way.
    window.addEventListener('scroll', onScrollOrResize, { passive: true })
    window.addEventListener('resize', onScrollOrResize)

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss()
    }
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node
      if (popRef.current?.contains(t)) return
      if (targets.some((el) => el.contains(t))) return
      onDismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    // A same-tick listener would catch the very click that opened this
    // spotlight (the Reading-the-Dashboard item's own onClick, which fires
    // during the same 'mousedown'->'click' sequence) and instantly dismiss
    // it — deferred registration to the next macrotask sidesteps that.
    const registerTimer = window.setTimeout(() => document.addEventListener('mousedown', onPointerDown), 0)

    return () => {
      window.clearTimeout(registerTimer)
      window.removeEventListener('scroll', onScrollOrResize)
      window.removeEventListener('resize', onScrollOrResize)
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('mousedown', onPointerDown)
      cancelAnimationFrame(raf)
      targets.forEach((el) => el.classList.remove('spotlight-target'))
    }
  }, [request, onDismiss])

  // Second pass: now that the popover itself has rendered (once `rect` is
  // set), measure its own size to place it without overflowing the
  // viewport — same two-pass measure-then-position technique as
  // InfoTip.tsx's off-screen clamp, and for the same reason (can't know a
  // box's rendered size before it's rendered).
  useLayoutEffect(() => {
    if (!rect || !popRef.current) {
      setPos(null)
      return
    }
    const vw = document.documentElement.clientWidth
    const vh = window.innerHeight
    const popH = popRef.current.offsetHeight
    const spaceRight = vw - rect.right
    let left: number
    let top: number
    if (spaceRight >= POP_WIDTH + MARGIN * 2) {
      left = rect.right + MARGIN
      top = Math.min(Math.max(rect.top, MARGIN), Math.max(MARGIN, vh - popH - MARGIN))
    } else {
      left = Math.min(Math.max(rect.left, MARGIN), Math.max(MARGIN, vw - POP_WIDTH - MARGIN))
      top = rect.bottom + MARGIN
      if (top + popH > vh - MARGIN) top = Math.max(rect.top - popH - MARGIN, MARGIN)
    }
    setPos({ left, top })
  }, [rect])

  if (!request || !rect) return null

  return (
    <div
      ref={popRef}
      className="spotlight-pop"
      role="dialog"
      aria-label={typeof request.label === 'string' ? request.label : undefined}
      style={{ left: pos?.left ?? rect.left, top: pos?.top ?? rect.top, visibility: pos ? 'visible' : 'hidden' }}
    >
      <button className="spotlight-close" onClick={onDismiss} aria-label="Close">
        ×
      </button>
      <p className="spotlight-label">{request.label}</p>
      <p className="spotlight-body">{request.body}</p>
    </div>
  )
}
